import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { Model, Types } from 'mongoose';
import { extname, join } from 'path';
import { Observable, Subject, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import {
  Conversation,
  ConversationDocument,
  ConversationFeedback,
  ConversationFeedbackDocument,
  Match,
  MatchDocument,
  Message,
  MessageDocument,
  MessageType,
  Profile,
  ProfileDocument,
  User,
  UserDocument,
} from '../database/schemas';

type SendMessagePayload = {
  content?: unknown;
  messageType?: unknown;
  translatedContent?: unknown;
  attachments?: unknown;
};

type CreateGroupPayload = {
  name?: unknown;
  memberIds?: unknown;
};

type TranslatePayload = {
  text?: unknown;
  direction?: unknown;
};

type FavoriteFeedbackPayload = {
  value?: unknown;
};

type UploadedAttachmentFile = {
  buffer?: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
};

type StoredMessageAttachment = {
  url: string;
};

type ConversationRealtimeEvent =
  | {
      userId: string;
      type: 'message.created';
      data: {
        conversationId: string;
        message: Record<string, any>;
        conversation: Record<string, any>;
      };
    }
  | {
      userId: string;
      type: 'messages.read';
      data: {
        conversationId: string;
        readerUserId: string;
        readAt: string;
      };
    };

type SseMessage = {
  type: string;
  data: unknown;
};

const MAX_GROUP_NAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_TRANSLATE_LENGTH = 500;
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
]);
const ALLOWED_AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.m4a',
  '.mp3',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
  '.webm',
]);
const FAVORITE_PROMPT_MESSAGE_COUNT = 50;
const MESSAGE_TYPES: MessageType[] = [
  'text',
  'file',
  'media',
  'voice',
  'system',
];

@Injectable()
export class ConversationsService {
  private readonly cloudinaryEnabled: boolean;
  private readonly realtimeEvents$ = new Subject<ConversationRealtimeEvent>();

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(ConversationFeedback.name)
    private readonly conversationFeedbackModel: Model<ConversationFeedbackDocument>,
  ) {
    this.cloudinaryEnabled = Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    );

    if (this.cloudinaryEnabled) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
  }

  subscribeRealtimeEvents(userId: string): Observable<SseMessage> {
    const userObjectId = this.objectIdFromParam(userId, 'userId');
    const normalizedUserId = userObjectId.toString();
    const events$ = this.realtimeEvents$.pipe(
      filter((event) => event.userId === normalizedUserId),
      map((event) => ({
        type: event.type,
        data: event.data,
      })),
    );
    const heartbeat$ = interval(25000).pipe(
      map(() => ({
        type: 'heartbeat',
        data: { now: new Date().toISOString() },
      })),
    );

    return merge(events$, heartbeat$);
  }

  async listConversations(currentUserId: string, search = '') {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    await this.ensureDirectConversationsForUser(currentObjectId);

    const conversations = await this.conversationModel
      .find({ participant_ids: currentObjectId })
      .sort({ last_message_at: -1, created_at: -1 })
      .lean()
      .exec();

    const latestMessages = await Promise.all(
      conversations.map((conversation) =>
        this.messageModel
          .findOne({ conversation_id: conversation._id })
          .sort({ sent_at: -1 })
          .lean()
          .exec(),
      ),
    );
    const unreadCounts = await Promise.all(
      conversations.map((conversation) =>
        this.messageModel
          .countDocuments({
            conversation_id: conversation._id,
            sender_id: { $ne: currentObjectId },
            read_by: { $ne: currentObjectId },
          })
          .exec(),
      ),
    );
    const userContext =
      await this.getUserContextForConversations(conversations);
    const normalizedSearch = search.trim().toLowerCase();

    return conversations
      .map((conversation, index) =>
        this.conversationSummary(
          conversation,
          currentObjectId,
          latestMessages[index],
          unreadCounts[index],
          userContext,
        ),
      )
      .filter((conversation) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          conversation.name.toLowerCase().includes(normalizedSearch) ||
          conversation.lastMessage.toLowerCase().includes(normalizedSearch)
        );
      });
  }

  async openWithUser(currentUserId: string, targetUserId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const targetObjectId = this.objectIdFromParam(targetUserId, 'userId');

    if (currentObjectId.equals(targetObjectId)) {
      throw new BadRequestException('cannot open a conversation with yourself');
    }

    const targetUser = await this.userModel
      .findById(targetObjectId)
      .lean()
      .exec();
    if (!targetUser) {
      throw new NotFoundException('user was not found');
    }

    const match = await this.findAcceptedMatch(currentObjectId, targetObjectId);
    if (!match) {
      throw new ForbiddenException(
        'メッセージを送るには、先にこのユーザーとマッチする必要があります。',
      );
    }

    const now = new Date();
    const participantIds = [match.requester_id, match.receiver_id];
    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { match_id: match._id },
        {
          $setOnInsert: {
            match_id: match._id,
            title: '',
            created_at: now,
            last_message_at: now,
          },
          $set: {
            type: 'direct',
            participant_ids: participantIds,
            updated_at: now,
          },
        },
        { new: true, upsert: true },
      )
      .lean()
      .exec();
    const targetProfile = await this.profileModel
      .findOne({ user_id: targetObjectId })
      .lean()
      .exec();

    return {
      id: conversation._id.toString(),
      matchId: match._id.toString(),
      createdAt: conversation.created_at,
      partner: {
        id: targetUser._id.toString(),
        fullName: targetUser.full_name,
        nationality: targetUser.nationality,
        avatarUrl: targetProfile?.avatar_url ?? '',
      },
    };
  }

  async getMessages(
    currentUserId: string,
    conversationId: string,
    options: { limit?: string; before?: string } = {},
  ) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const conversation = await this.requireConversationAccess(
      currentObjectId,
      conversationId,
    );
    const limit = this.parseLimit(options.limit);
    const filter: Record<string, unknown> = {
      conversation_id: conversation._id,
    };

    if (options.before) {
      const before = new Date(options.before);
      if (Number.isNaN(before.getTime())) {
        throw new BadRequestException('before must be a valid date');
      }
      filter.sent_at = { $lt: before };
    }

    const [messagesDescending, totalCount, feedback] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ sent_at: -1 })
        .limit(limit)
        .lean()
        .exec(),
      this.messageModel
        .countDocuments({ conversation_id: conversation._id })
        .exec(),
      this.conversationFeedbackModel
        .findOne({
          conversation_id: conversation._id,
          reviewer_id: currentObjectId,
        })
        .lean()
        .exec(),
    ]);

    const messages = messagesDescending.reverse();

    return {
      messages: messages.map((message) =>
        this.messageResponse(
          message,
          currentObjectId,
          conversation.participant_ids.length,
        ),
      ),
      totalCount,
      requiresFavoritePrompt:
        conversation.type === 'direct' &&
        totalCount >= FAVORITE_PROMPT_MESSAGE_COUNT &&
        !feedback,
    };
  }

  async sendMessage(
    currentUserId: string,
    conversationId: string,
    payload: SendMessagePayload,
  ) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const conversation = await this.requireConversationAccess(
      currentObjectId,
      conversationId,
    );
    const content = this.requiredTrimmedString(
      payload.content,
      'content',
      MAX_MESSAGE_LENGTH,
    );
    const messageType = this.optionalMessageType(payload.messageType);
    const translatedContent =
      typeof payload.translatedContent === 'string'
        ? payload.translatedContent.slice(0, MAX_TRANSLATE_LENGTH)
        : '';
    const attachments = this.parseAttachments(payload.attachments);
    const now = new Date();

    const message = await this.messageModel.create({
      conversation_id: conversation._id,
      sender_id: currentObjectId,
      content,
      translated_content: translatedContent,
      message_type: messageType,
      status: 'sent',
      read_by: [currentObjectId],
      attachments,
      sent_at: now,
    });

    await this.conversationModel
      .updateOne(
        { _id: conversation._id },
        {
          $set: {
            last_message_at: now,
            updated_at: now,
          },
        },
      )
      .exec();

    const savedMessage = message.toObject();
    const senderResponse = this.messageResponse(
      savedMessage,
      currentObjectId,
      conversation.participant_ids.length,
    );

    await this.emitMessageCreated(
      {
        ...conversation,
        last_message_at: now,
        updated_at: now,
      },
      savedMessage,
      currentObjectId,
    );

    return senderResponse;
  }

  async uploadAttachment(
    currentUserId: string,
    conversationId: string,
    file: UploadedAttachmentFile,
    rawMessageType?: string,
  ) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const conversation = await this.requireConversationAccess(
      currentObjectId,
      conversationId,
    );

    if (!file?.buffer?.length) {
      throw new BadRequestException('file is required');
    }

    const messageType =
      rawMessageType === 'media'
        ? 'media'
        : rawMessageType === 'voice'
          ? 'voice'
          : 'file';
    const safeOriginalName = this.safeFileName(file.originalname || 'attachment');
    const lowerOriginalName = safeOriginalName.toLowerCase();
    const isMedia =
      file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/');
    const isAudio =
      file.mimetype.startsWith('audio/') ||
      Array.from(ALLOWED_AUDIO_EXTENSIONS).some((extension) =>
        lowerOriginalName.endsWith(extension),
      );
    const isSupportedDocument =
      ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype) ||
      Array.from(ALLOWED_DOCUMENT_EXTENSIONS).some((extension) =>
        lowerOriginalName.endsWith(extension),
      );

    if (messageType === 'media' && !isMedia) {
      throw new BadRequestException('media attachments must be images or videos');
    }

    if (messageType === 'voice' && !isAudio) {
      throw new BadRequestException('voice attachments must be audio files');
    }

    if (
      messageType === 'file' &&
      isMedia === false &&
      !isSupportedDocument
    ) {
      throw new BadRequestException('document attachment type is not supported');
    }

    if ((file.size ?? file.buffer.length) > MAX_ATTACHMENT_SIZE) {
      throw new BadRequestException('attachment size must be at most 25MB');
    }

    const now = new Date();
    const storedAttachment = await this.saveMessageAttachment(
      file,
      safeOriginalName,
      messageType,
    );

    const content = `${
      messageType === 'media'
        ? '[Media]'
        : messageType === 'voice'
          ? '[Voice]'
          : '[File]'
    } ${safeOriginalName}`;
    const attachment = {
      url: storedAttachment.url,
      file_name: safeOriginalName,
      mime_type: file.mimetype,
      size: file.size ?? file.buffer.length,
    };

    const message = await this.messageModel.create({
      conversation_id: conversation._id,
      sender_id: currentObjectId,
      content,
      translated_content: '',
      message_type: messageType,
      status: 'sent',
      read_by: [currentObjectId],
      attachments: [attachment],
      sent_at: now,
    });

    await this.conversationModel
      .updateOne(
        { _id: conversation._id },
        {
          $set: {
            last_message_at: now,
            updated_at: now,
          },
        },
      )
      .exec();

    const savedMessage = message.toObject();
    const senderResponse = this.messageResponse(
      savedMessage,
      currentObjectId,
      conversation.participant_ids.length,
    );

    await this.emitMessageCreated(
      {
        ...conversation,
        last_message_at: now,
        updated_at: now,
      },
      savedMessage,
      currentObjectId,
    );

    return senderResponse;
  }

  async markRead(currentUserId: string, conversationId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const conversation = await this.requireConversationAccess(
      currentObjectId,
      conversationId,
    );

    const result = await this.messageModel
      .updateMany(
        {
          conversation_id: conversation._id,
          sender_id: { $ne: currentObjectId },
          read_by: { $ne: currentObjectId },
        },
        {
          $addToSet: { read_by: currentObjectId },
          $set: { status: 'read' },
        },
      )
      .exec();

    if ((result.modifiedCount ?? 0) > 0) {
      this.emitMessagesRead(conversation, currentObjectId);
    }

    return { unreadCount: 0 };
  }

  async getMatchedUsers(currentUserId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const matches = await this.matchModel
      .find({
        status: 'accepted',
        $or: [
          { requester_id: currentObjectId },
          { receiver_id: currentObjectId },
        ],
      })
      .lean()
      .exec();
    const partnerIds = matches.map((match) =>
      match.requester_id.equals(currentObjectId)
        ? match.receiver_id
        : match.requester_id,
    );
    const uniquePartnerIds = this.uniqueObjectIds(partnerIds);
    const { userById, profileByUserId } =
      await this.getUserContext(uniquePartnerIds);

    return uniquePartnerIds
      .map((id) => {
        const user = userById.get(id.toString());
        if (!user) {
          return null;
        }
        const profile = profileByUserId.get(id.toString());

        return {
          id: id.toString(),
          fullName: user.full_name,
          nationality: user.nationality,
          avatarUrl: this.avatarUrl(user, profile),
          location: profile?.location ?? '',
        };
      })
      .filter(Boolean);
  }

  async createGroup(currentUserId: string, payload: CreateGroupPayload) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const name = this.requiredTrimmedString(
      payload.name,
      'name',
      MAX_GROUP_NAME_LENGTH,
    );
    const memberIds = this.parseMemberIds(payload.memberIds, currentObjectId);

    if (memberIds.length < 2) {
      throw new BadRequestException(
        'memberIds must contain at least 2 matched users',
      );
    }

    const users = await this.userModel
      .find({ _id: { $in: memberIds } })
      .lean()
      .exec();
    if (users.length !== memberIds.length) {
      throw new BadRequestException('memberIds must reference existing users');
    }

    await this.assertUsersAreMatched(currentObjectId, memberIds);

    const now = new Date();
    const conversation = await this.conversationModel.create({
      match_id: new Types.ObjectId(),
      type: 'group',
      title: name,
      created_by: currentObjectId,
      participant_ids: [currentObjectId, ...memberIds],
      created_at: now,
      updated_at: now,
      last_message_at: now,
    });

    const context = await this.getUserContextForConversations([
      conversation.toObject(),
    ]);
    return this.conversationSummary(
      conversation.toObject(),
      currentObjectId,
      null,
      0,
      context,
    );
  }

  async leaveGroup(currentUserId: string, conversationId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const conversation = await this.requireConversationAccess(
      currentObjectId,
      conversationId,
    );

    if (conversation.type !== 'group') {
      throw new BadRequestException('only group conversations can be left');
    }

    const remainingParticipantCount = conversation.participant_ids.filter(
      (participantId: Types.ObjectId) => !participantId.equals(currentObjectId),
    ).length;

    await this.conversationModel
      .updateOne(
        { _id: conversation._id },
        {
          $pull: { participant_ids: currentObjectId },
          $set: { updated_at: new Date() },
        },
      )
      .exec();

    return {
      conversationId: conversation._id.toString(),
      left: true,
      remainingParticipantCount,
    };
  }

  translate(payload: TranslatePayload) {
    const text = this.requiredTrimmedString(
      payload.text,
      'text',
      MAX_TRANSLATE_LENGTH,
    );
    const direction = payload.direction === 'vi-ja' ? 'vi-ja' : 'ja-vi';

    return {
      direction,
      translatedText: this.localTranslate(text, direction),
    };
  }

  async submitFavoriteFeedback(
    currentUserId: string,
    conversationId: string,
    payload: FavoriteFeedbackPayload,
  ) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const conversation = await this.requireConversationAccess(
      currentObjectId,
      conversationId,
    );
    const value = payload.value === 'skipped' ? 'skipped' : 'liked';

    if (conversation.type !== 'direct') {
      throw new BadRequestException(
        'favorite feedback is only supported for direct conversations',
      );
    }

    const targetUserId = conversation.participant_ids.find(
      (id) => !id.equals(currentObjectId),
    );
    if (!targetUserId) {
      throw new BadRequestException(
        'target user was not found for this conversation',
      );
    }

    await this.conversationFeedbackModel
      .updateOne(
        { conversation_id: conversation._id, reviewer_id: currentObjectId },
        {
          $set: {
            target_user_id: targetUserId,
            value,
            created_at: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();

    if (value === 'liked') {
      await this.profileModel
        .updateOne(
          {
            user_id: targetUserId,
            $or: [
              { match_rate: { $lt: 100 } },
              { match_rate: { $exists: false } },
            ],
          },
          {
            $inc: { match_rate: 1 },
            $set: { updated_at: new Date() },
          },
        )
        .exec();
    }

    return {
      conversationId: conversation._id.toString(),
      targetUserId: targetUserId.toString(),
      value,
    };
  }

  private async ensureDirectConversationsForUser(
    currentObjectId: Types.ObjectId,
  ) {
    const matches = await this.matchModel
      .find({
        status: 'accepted',
        $or: [
          { requester_id: currentObjectId },
          { receiver_id: currentObjectId },
        ],
      })
      .lean()
      .exec();

    await Promise.all(
      matches.map((match) => {
        const now = new Date();
        return this.conversationModel
          .findOneAndUpdate(
            { match_id: match._id },
            {
              $setOnInsert: {
                match_id: match._id,
                title: '',
                created_at: now,
                last_message_at: now,
              },
              $set: {
                type: 'direct',
                participant_ids: [match.requester_id, match.receiver_id],
                updated_at: now,
              },
            },
            { new: true, upsert: true },
          )
          .lean()
          .exec();
      }),
    );
  }

  private async requireConversationAccess(
    currentObjectId: Types.ObjectId,
    conversationId: string,
  ) {
    const conversationObjectId = this.objectIdFromParam(
      conversationId,
      'conversationId',
    );
    let conversation = await this.conversationModel
      .findById(conversationObjectId)
      .lean()
      .exec();

    if (!conversation) {
      throw new NotFoundException('conversation was not found');
    }

    const participants = (conversation.participant_ids ?? []).map(
      (id: Types.ObjectId) => new Types.ObjectId(id),
    );

    if (participants.length === 0 && conversation.match_id) {
      const match = await this.matchModel
        .findById(conversation.match_id)
        .lean()
        .exec();
      if (match) {
        const participantIds = [match.requester_id, match.receiver_id];
        conversation = await this.conversationModel
          .findByIdAndUpdate(
            conversation._id,
            {
              $set: {
                type: 'direct',
                participant_ids: participantIds,
                updated_at: new Date(),
              },
            },
            { new: true },
          )
          .lean()
          .exec();
      }
    }

    if (
      !conversation?.participant_ids?.some((participantId: Types.ObjectId) =>
        new Types.ObjectId(participantId).equals(currentObjectId),
      )
    ) {
      throw new ForbiddenException(
        'you are not a participant of this conversation',
      );
    }

    return {
      ...conversation,
      participant_ids: conversation.participant_ids.map(
        (id: Types.ObjectId) => new Types.ObjectId(id),
      ),
    };
  }

  private async findAcceptedMatch(
    currentObjectId: Types.ObjectId,
    targetObjectId: Types.ObjectId,
  ) {
    return this.matchModel
      .findOne({
        status: 'accepted',
        $or: [
          { requester_id: currentObjectId, receiver_id: targetObjectId },
          { requester_id: targetObjectId, receiver_id: currentObjectId },
        ],
      })
      .lean()
      .exec();
  }

  private async assertUsersAreMatched(
    currentObjectId: Types.ObjectId,
    userIds: Types.ObjectId[],
  ) {
    const matches = await this.matchModel
      .find({
        status: 'accepted',
        $or: [
          { requester_id: currentObjectId, receiver_id: { $in: userIds } },
          { requester_id: { $in: userIds }, receiver_id: currentObjectId },
        ],
      })
      .lean()
      .exec();
    const matchedUserIds = new Set(
      matches.map((match) =>
        match.requester_id.equals(currentObjectId)
          ? match.receiver_id.toString()
          : match.requester_id.toString(),
      ),
    );
    const missingMatch = userIds.find(
      (id) => !matchedUserIds.has(id.toString()),
    );

    if (missingMatch) {
      throw new ForbiddenException(
        'all group members must be accepted matches',
      );
    }
  }

  private async getUserContextForConversations(
    conversations: Array<Record<string, any>>,
  ) {
    const participantIds = this.uniqueObjectIds(
      conversations.flatMap(
        (conversation) => conversation.participant_ids ?? [],
      ),
    );

    return this.getUserContext(participantIds);
  }

  private async getUserContext(userIds: Types.ObjectId[]) {
    if (userIds.length === 0) {
      return {
        userById: new Map<string, any>(),
        profileByUserId: new Map<string, any>(),
      };
    }

    const [users, profiles] = await Promise.all([
      this.userModel
        .find({ _id: { $in: userIds } })
        .lean()
        .exec(),
      this.profileModel
        .find({ user_id: { $in: userIds } })
        .lean()
        .exec(),
    ]);

    return {
      userById: new Map(users.map((user) => [user._id.toString(), user])),
      profileByUserId: new Map(
        profiles.map((profile) => [profile.user_id.toString(), profile]),
      ),
    };
  }

  private conversationSummary(
    conversation: Record<string, any>,
    currentObjectId: Types.ObjectId,
    lastMessage: Record<string, any> | null,
    unreadCount: number,
    context: {
      userById: Map<string, any>;
      profileByUserId: Map<string, any>;
    },
  ) {
    const participantIds = (conversation.participant_ids ?? []).map(
      (id: Types.ObjectId) => new Types.ObjectId(id),
    );
    const participants = participantIds
      .map((id: Types.ObjectId) => {
        const user = context.userById.get(id.toString());
        if (!user) {
          return null;
        }
        const profile = context.profileByUserId.get(id.toString());

        return {
          id: id.toString(),
          fullName: user.full_name,
          nationality: user.nationality,
          avatarUrl: this.avatarUrl(user, profile),
          location: profile?.location ?? '',
          level: this.languageLevel(profile),
        };
      })
      .filter(Boolean);
    const otherParticipants = participants.filter(
      (participant: any) => participant.id !== currentObjectId.toString(),
    );
    const primaryPartner = otherParticipants[0] ?? participants[0];
    const isGroup = conversation.type === 'group';
    const name = isGroup
      ? conversation.title ||
        otherParticipants
          .map((participant: any) => participant.fullName)
          .join(', ')
      : (primaryPartner?.fullName ?? 'Unknown user');

    return {
      id: conversation._id.toString(),
      type: conversation.type ?? 'direct',
      matchId: isGroup ? null : (conversation.match_id?.toString?.() ?? null),
      partnerId: isGroup ? null : (primaryPartner?.id ?? null),
      name,
      location: isGroup
        ? `${participants.length} members`
        : (primaryPartner?.location ?? ''),
      level: isGroup ? '' : (primaryPartner?.level ?? ''),
      avatar: isGroup
        ? `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(conversation._id.toString())}`
        : (primaryPartner?.avatarUrl ?? ''),
      lastMessage: lastMessage?.content ?? '',
      lastMessageAt:
        lastMessage?.sent_at ??
        conversation.last_message_at ??
        conversation.created_at,
      unreadCount,
      participants,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
    };
  }

  private messageResponse(
    message: Record<string, any>,
    currentObjectId: Types.ObjectId,
    participantCount: number,
  ) {
    const readBy = (message.read_by ?? []).map(
      (id: Types.ObjectId) => new Types.ObjectId(id),
    );
    const isMine = new Types.ObjectId(message.sender_id).equals(
      currentObjectId,
    );
    const status =
      isMine && readBy.length >= participantCount
        ? 'read'
        : (message.status ?? 'sent');

    return {
      id: message._id.toString(),
      conversationId: message.conversation_id.toString(),
      senderUserId: message.sender_id.toString(),
      senderId: isMine ? 'me' : 'partner',
      content: message.content,
      translatedContent: message.translated_content ?? '',
      messageType: message.message_type ?? 'text',
      status,
      readBy: readBy.map((id: Types.ObjectId) => id.toString()),
      attachments: message.attachments ?? [],
      sentAt: message.sent_at,
    };
  }

  private async emitMessageCreated(
    conversation: Record<string, any>,
    message: Record<string, any>,
    senderObjectId: Types.ObjectId,
  ) {
    const participantIds = (conversation.participant_ids ?? []).map(
      (id: Types.ObjectId) => new Types.ObjectId(id),
    );
    const recipientIds = participantIds.filter(
      (participantId: Types.ObjectId) => !participantId.equals(senderObjectId),
    );

    if (recipientIds.length === 0) {
      return;
    }

    const context = await this.getUserContextForConversations([conversation]);

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        const unreadCount = await this.messageModel
          .countDocuments({
            conversation_id: conversation._id,
            sender_id: { $ne: recipientId },
            read_by: { $ne: recipientId },
          })
          .exec();

        this.realtimeEvents$.next({
          userId: recipientId.toString(),
          type: 'message.created',
          data: {
            conversationId: conversation._id.toString(),
            message: this.messageResponse(
              message,
              recipientId,
              participantIds.length,
            ),
            conversation: this.conversationSummary(
              conversation,
              recipientId,
              message,
              unreadCount,
              context,
            ),
          },
        });
      }),
    );
  }

  private emitMessagesRead(
    conversation: Record<string, any>,
    readerObjectId: Types.ObjectId,
  ) {
    const readAt = new Date().toISOString();

    for (const participantId of conversation.participant_ids ?? []) {
      const recipientId = new Types.ObjectId(participantId);
      if (recipientId.equals(readerObjectId)) {
        continue;
      }

      this.realtimeEvents$.next({
        userId: recipientId.toString(),
        type: 'messages.read',
        data: {
          conversationId: conversation._id.toString(),
          readerUserId: readerObjectId.toString(),
          readAt,
        },
      });
    }
  }

  private avatarUrl(user: Record<string, any>, profile?: Record<string, any>) {
    return (
      profile?.avatar_url ||
      `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(
        user._id?.toString?.() ?? user.full_name,
      )}`
    );
  }

  private languageLevel(profile?: Record<string, any>) {
    const languages = profile?.languages ?? [];
    const japanese = languages.find(
      (language: any) => language.language === 'Japanese',
    );
    const first = japanese ?? languages[0];

    if (!first) {
      return '';
    }

    return `${first.language} ${first.level}`;
  }

  private parseLimit(rawLimit?: string) {
    if (!rawLimit) {
      return 100;
    }

    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 100',
      );
    }

    return limit;
  }

  private requiredTrimmedString(
    value: unknown,
    name: string,
    maxLength: number,
  ) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${name} must be a string`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${name} is required`);
    }

    if (trimmed.length > maxLength) {
      throw new BadRequestException(
        `${name} must be at most ${maxLength} characters`,
      );
    }

    return trimmed;
  }

  private safeFileName(value: string) {
    const trimmed = value.trim().replace(/[\\/:*?"<>|]+/g, '_');
    const compact = trimmed.replace(/\s+/g, ' ');

    return compact.slice(0, 255) || 'attachment';
  }

  private async saveMessageAttachment(
    file: UploadedAttachmentFile,
    safeOriginalName: string,
    messageType: MessageType,
  ): Promise<StoredMessageAttachment> {
    if (this.cloudinaryEnabled) {
      return this.uploadMessageAttachmentToCloudinary(
        file,
        safeOriginalName,
        messageType,
      );
    }

    const extension = this.attachmentExtension(file.mimetype, safeOriginalName);
    const filename = `${randomUUID()}${extension}`;
    const uploadDir = join(process.cwd(), 'uploads', 'messages');

    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), file.buffer!);

    return { url: `/uploads/messages/${filename}` };
  }

  private uploadMessageAttachmentToCloudinary(
    file: UploadedAttachmentFile,
    safeOriginalName: string,
    messageType: MessageType,
  ) {
    return new Promise<StoredMessageAttachment>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `vn-jp-connect/messages/${messageType}`,
          resource_type: 'auto',
          public_id: `${messageType}-${randomUUID()}`,
          filename_override: safeOriginalName,
        },
        (error, result?: UploadApiResponse) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(new Error('Cloudinary upload did not return a secure URL'));
            return;
          }

          resolve({ url: result.secure_url });
        },
      );

      stream.end(file.buffer!);
    });
  }

  private attachmentExtension(mimetype: string, safeOriginalName: string) {
    const existingExtension = extname(safeOriginalName).slice(0, 12);

    if (existingExtension) {
      return existingExtension;
    }

    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        '.pptx',
      'audio/mp4': '.m4a',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'image/gif': '.gif',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'text/plain': '.txt',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/webm': '.webm',
    };

    return extensions[mimetype] ?? '';
  }

  private optionalMessageType(value: unknown): MessageType {
    if (value === undefined || value === null || value === '') {
      return 'text';
    }

    if (
      typeof value !== 'string' ||
      !MESSAGE_TYPES.includes(value as MessageType)
    ) {
      throw new BadRequestException('messageType is not supported');
    }

    return value as MessageType;
  }

  private parseAttachments(value: unknown) {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException('attachments must be an array');
    }

    return value.map((attachment) => {
      if (!attachment || typeof attachment !== 'object') {
        throw new BadRequestException('attachments must contain objects');
      }

      const item = attachment as Record<string, unknown>;
      const url = this.requiredTrimmedString(item.url, 'attachment.url', 2048);
      const size = typeof item.size === 'number' ? item.size : 0;

      if (size > MAX_ATTACHMENT_SIZE) {
        throw new BadRequestException('attachment size must be at most 25MB');
      }

      return {
        url,
        file_name:
          typeof item.fileName === 'string' ? item.fileName.slice(0, 255) : '',
        mime_type:
          typeof item.mimeType === 'string' ? item.mimeType.slice(0, 100) : '',
        size,
      };
    });
  }

  private parseMemberIds(value: unknown, currentObjectId: Types.ObjectId) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('memberIds must be an array');
    }

    const ids = value.map((item) => {
      if (typeof item !== 'string' || !Types.ObjectId.isValid(item)) {
        throw new BadRequestException('memberIds must contain valid ObjectIds');
      }
      return new Types.ObjectId(item);
    });
    const uniqueIds = this.uniqueObjectIds(ids).filter(
      (id) => !id.equals(currentObjectId),
    );

    if (uniqueIds.length !== ids.length) {
      throw new BadRequestException(
        'memberIds must not contain yourself or duplicates',
      );
    }

    return uniqueIds;
  }

  private uniqueObjectIds(ids: Types.ObjectId[]) {
    const seen = new Set<string>();
    const uniqueIds: Types.ObjectId[] = [];

    for (const rawId of ids) {
      const id = new Types.ObjectId(rawId);
      const key = id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIds.push(id);
      }
    }

    return uniqueIds;
  }

  private localTranslate(text: string, direction: 'ja-vi' | 'vi-ja') {
    const dictionary: Record<string, Record<string, string>> = {
      'ja-vi': {
        こんにちは: 'Xin chào',
        ありがとう: 'Cảm ơn',
        '週末に一緒に勉強しませんか？': 'Cuối tuần mình học cùng nhau nhé?',
        '来月日本に行く予定です！': 'Tháng sau mình dự định đi Nhật!',
      },
      'vi-ja': {
        'Xin chao': 'こんにちは',
        'Xin chào': 'こんにちは',
        'Cam on': 'ありがとうございます',
        'Cảm ơn': 'ありがとうございます',
        'minh muon luyen tieng Nhat': '日本語を練習したいです',
      },
    };
    const exact = dictionary[direction][text];

    if (exact) {
      return exact;
    }

    const entry = Object.entries(dictionary[direction]).find(([source]) =>
      text.toLowerCase().includes(source.toLowerCase()),
    );

    if (entry) {
      return entry[1];
    }

    return direction === 'ja-vi' ? `[VI] ${text}` : `[JP] ${text}`;
  }

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }
}
