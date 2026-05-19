import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
  Match,
  MatchDocument,
  Message,
  MessageDocument,
  Profile,
  ProfileDocument,
  Tag,
  TagDocument,
  User,
  UserDocument,
  UserInterest,
  UserInterestDocument,
} from '../database/schemas';
import { calculateAge, DEFAULT_LEGACY_AGE } from '../common/age';
import { MAX_BIO_LENGTH } from '../profile/profile.constants';

type DiscoverQuery = {
  gender?: string;
  nationality?: string;
  interestTagIds?: string[];
  japaneseLevels?: string[];
  excludeUserIds?: string[];
  ageMin?: number;
  ageMax?: number;
  distanceMax?: number;
  limit?: number;
};

const HOME_AGE_MIN = 18;
const HOME_AGE_MAX = 65;
const HOME_DISTANCE_MAX = 200;
const HOME_DISCOVER_LIMIT_MAX = 200;
const HOME_JAPANESE_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1', 'Basic', 'Native'];

@Injectable()
export class HomeService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(UserInterest.name)
    private readonly userInterestModel: Model<UserInterestDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async getFilterOptions() {
    const interests = await this.tagModel
      .find({ type: 'interest' })
      .sort({ name: 1 })
      .lean()
      .exec();

    return {
      genders: ['male', 'female', 'other'],
      nationalities: ['VN', 'JP'],
      japaneseLevels: HOME_JAPANESE_LEVELS,
      interests: interests.map((t) => ({ id: t._id.toString(), name: t.name })),
      ageRange: {
        min: HOME_AGE_MIN,
        max: HOME_AGE_MAX,
        defaultMin: HOME_AGE_MIN,
        defaultMax: 35,
      },
      distanceRange: {
        min: 0,
        max: HOME_DISTANCE_MAX,
        defaultMax: 50,
        supported: false,
      },
    };
  }

  async discover(currentUserId: string, query: DiscoverQuery) {
    const limit = query.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > HOME_DISCOVER_LIMIT_MAX) {
      throw new BadRequestException(`limit must be between 1 and ${HOME_DISCOVER_LIMIT_MAX}`);
    }

    const currentUserObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    this.validateDiscoverQuery(query);
    const excludeObjectIds = (query.excludeUserIds ?? []).map((id) =>
      this.objectIdFromParam(id, 'excludeUserIds'),
    );
    const relatedUserIds =
      await this.existingDiscoverRelationshipUserIds(currentUserObjectId);

    const excludedUserIds = this.uniqueObjectIds([
      currentUserObjectId,
      ...excludeObjectIds,
      ...relatedUserIds,
    ]);
    const excludedUserIdSet = new Set(
      excludedUserIds.map((id) => id.toString()),
    );
    const userFilter: Record<string, unknown> = {
      _id: { $nin: excludedUserIds },
    };
    if (query.nationality) {
      userFilter.nationality = query.nationality;
    }

    const profileFilter: Record<string, unknown> = {};
    if (query.gender) {
      profileFilter.gender = query.gender;
    }

    let allowedUserIds: Types.ObjectId[] | null = null;
    if (query.interestTagIds?.length) {
      const tagObjectIds = query.interestTagIds.map((id) => {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException(
            'interestTagIds must be valid ObjectIds',
          );
        }
        return new Types.ObjectId(id);
      });

      const existingCount = await this.tagModel
        .countDocuments({ _id: { $in: tagObjectIds }, type: 'interest' })
        .exec();
      if (existingCount !== tagObjectIds.length) {
        throw new BadRequestException(
          'interestTagIds must reference existing interest tags',
        );
      }

      const userIds = await this.userInterestModel
        .distinct('user_id', { tag_id: { $in: tagObjectIds } })
        .exec();
      allowedUserIds = userIds.map((id) => new Types.ObjectId(String(id)));
      userFilter._id = { $nin: excludedUserIds, $in: allowedUserIds };
    }

    const candidateUsers = await this.userModel.find(userFilter).lean().exec();
    const users = candidateUsers.filter(
      (user) => !excludedUserIdSet.has(user._id.toString()),
    );
    const candidateUserIds = users.map((u) => u._id);
    const profiles = await this.profileModel
      .find({ user_id: { $in: candidateUserIds }, ...profileFilter })
      .lean()
      .exec();

    const profileByUserId = new Map<string, any>(
      profiles.map((p) => [p.user_id.toString(), p]),
    );
    const discoverUsers = query.gender
      ? users.filter((user) => profileByUserId.has(user._id.toString()))
      : users;
    const userIds = discoverUsers.map((u) => u._id);

    if (userIds.length === 0) {
      return [];
    }

    const interestLinks = await this.userInterestModel
      .find({ user_id: { $in: userIds } })
      .lean()
      .exec();
    const tagIds = Array.from(
      new Set(interestLinks.map((l) => l.tag_id.toString())),
    );
    const tags = tagIds.length
      ? await this.tagModel
          .find({ _id: { $in: tagIds.map((id) => new Types.ObjectId(id)) } })
          .lean()
          .exec()
      : [];
    const tagById = new Map(tags.map((t) => [t._id.toString(), t]));

    const connectionsCountByUserId =
      await this.countConnectionsForUsers(userIds);

    return discoverUsers
      .map((user) => {
        const profile = profileByUserId.get(user._id.toString());
        const userInterestTagIds = interestLinks
          .filter((l) => l.user_id.toString() === user._id.toString())
          .map((l) => l.tag_id.toString());
        const interests = userInterestTagIds
          .map((id) => tagById.get(id))
          .filter(Boolean)
          .map((t: any) => ({
            id: t._id.toString(),
            name: t.name,
            type: t.type,
          }));
        const age =
          calculateAge(user.birth_date) ?? profile?.age ?? DEFAULT_LEGACY_AGE;
        const languages = (profile?.languages ?? []).map((item: any) => ({
          language: item.language,
          level: item.level,
        }));

        if (query.ageMin !== undefined && age < query.ageMin) {
          return null;
        }

        if (query.ageMax !== undefined && age > query.ageMax) {
          return null;
        }

        if (
          query.japaneseLevels?.length &&
          !languages.some(
            (item) =>
              item.language === 'Japanese' &&
              this.matchesJapaneseLevel(item.level, query.japaneseLevels ?? []),
          )
        ) {
          return null;
        }

        return {
          id: user._id.toString(),
          fullName: user.full_name,
          nationality: user.nationality,
          age,
          gender: profile?.gender ?? null,
          location: profile?.location ?? '',
          occupation: profile?.occupation ?? '',
          bio: String(profile?.bio ?? '').slice(0, MAX_BIO_LENGTH),
          avatarUrl: profile?.avatar_url ?? '',
          languages,
          photos: (profile?.photos ?? []).map((p: any) => ({
            id: p._id.toString(),
            url: p.url,
            isMain: p.is_main,
            uploadedAt: p.uploaded_at,
          })),
          interests,
          likeRate: profile?.match_rate ?? 100,
          connectionsCount:
            profile?.connections_count ??
            connectionsCountByUserId.get(user._id.toString()) ??
            0,
          joinedAt: user.created_at,
          updatedAt: profile?.updated_at ?? user.created_at,
        };
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  async showInterest(currentUserId: string, targetUserId: string) {
    const currentObjectId = this.objectIdFromParam(
      currentUserId,
      'currentUserId',
    );
    const targetObjectId = this.objectIdFromParam(targetUserId, 'userId');

    if (currentObjectId.equals(targetObjectId)) {
      throw new BadRequestException('cannot show interest in yourself');
    }

    const [currentUser, targetUser] = await Promise.all([
      this.userModel.findById(currentObjectId).lean().exec(),
      this.userModel.findById(targetObjectId).lean().exec(),
    ]);

    if (!currentUser || !targetUser) {
      throw new NotFoundException('user was not found');
    }

    const existingMatch = await this.matchModel
      .findOne({
        $or: [
          { requester_id: currentObjectId, receiver_id: targetObjectId },
          { requester_id: targetObjectId, receiver_id: currentObjectId },
        ],
      })
      .exec();

    if (existingMatch) {
      if (existingMatch.status === 'accepted') {
        return this.matchedInterestResponse(
          existingMatch,
          targetObjectId,
          targetUser,
        );
      }

      const isReversePending =
        existingMatch.status === 'pending' &&
        existingMatch.requester_id.equals(targetObjectId) &&
        existingMatch.receiver_id.equals(currentObjectId);

      if (isReversePending) {
        existingMatch.status = 'accepted';
        await existingMatch.save();
        return this.matchedInterestResponse(
          existingMatch,
          targetObjectId,
          targetUser,
        );
      }

      if (
        existingMatch.requester_id.equals(currentObjectId) &&
        existingMatch.receiver_id.equals(targetObjectId)
      ) {
        if (existingMatch.status === 'rejected') {
          existingMatch.status = 'pending';
          await existingMatch.save();
        }

        return {
          status: 'pending',
          matchId: existingMatch._id.toString(),
        };
      }
    }

    const match = await this.matchModel.create({
      requester_id: currentObjectId,
      receiver_id: targetObjectId,
      status: 'pending',
      created_at: new Date(),
    });

    return {
      status: 'pending',
      matchId: match._id.toString(),
    };
  }

  async getNavSummary(userId: string) {
    const currentObjectId = this.objectIdFromParam(userId, 'currentUserId');
    await this.ensureDirectConversationParticipants(currentObjectId);
    const conversations = await this.conversationModel
      .find({ participant_ids: currentObjectId })
      .select({ _id: 1 })
      .lean()
      .exec();
    const conversationIds = conversations.map(
      (conversation) => conversation._id,
    );
    const unreadMessagesCount = conversationIds.length
      ? await this.messageModel
          .countDocuments({
            conversation_id: { $in: conversationIds },
            sender_id: { $ne: currentObjectId },
            read_by: { $ne: currentObjectId },
          })
          .exec()
      : 0;

    return {
      unreadMessagesCount,
      unreadEventsCount: 0,
    };
  }

  private validateDiscoverQuery(query: DiscoverQuery) {
    if (query.gender && !['male', 'female', 'other'].includes(query.gender)) {
      throw new BadRequestException('gender is not supported');
    }

    if (query.nationality && !['VN', 'JP'].includes(query.nationality)) {
      throw new BadRequestException('nationality is not supported');
    }

    for (const field of ['ageMin', 'ageMax'] as const) {
      const value = query[field];
      if (
        value !== undefined &&
        (!Number.isInteger(value) ||
          value < HOME_AGE_MIN ||
          value > HOME_AGE_MAX)
      ) {
        throw new BadRequestException(
          `${field} must be an integer between ${HOME_AGE_MIN} and ${HOME_AGE_MAX}`,
        );
      }
    }

    if (
      query.ageMin !== undefined &&
      query.ageMax !== undefined &&
      query.ageMin > query.ageMax
    ) {
      throw new BadRequestException(
        'ageMin must be less than or equal to ageMax',
      );
    }

    if (
      query.distanceMax !== undefined &&
      (!Number.isInteger(query.distanceMax) ||
        query.distanceMax < 0 ||
        query.distanceMax > HOME_DISTANCE_MAX)
    ) {
      throw new BadRequestException(
        `distanceMax must be an integer between 0 and ${HOME_DISTANCE_MAX}`,
      );
    }

    const unsupportedJapaneseLevel = (query.japaneseLevels ?? []).find(
      (level) => !HOME_JAPANESE_LEVELS.includes(level),
    );

    if (unsupportedJapaneseLevel) {
      throw new BadRequestException(
        `japanese level "${unsupportedJapaneseLevel}" is not supported`,
      );
    }
  }

  private matchesJapaneseLevel(profileLevel: string, filterLevels: string[]) {
    const normalizedLevel =
      profileLevel === 'Beginner' ? 'Basic' : profileLevel;
    return filterLevels.includes(normalizedLevel);
  }

  private async existingDiscoverRelationshipUserIds(
    currentObjectId: Types.ObjectId,
  ) {
    const relationships = await this.matchModel
      .find({
        status: { $in: ['pending', 'accepted'] },
        $or: [
          { requester_id: currentObjectId },
          { receiver_id: currentObjectId },
        ],
      })
      .lean()
      .exec();

    return relationships.map((match) => {
      const requesterId = new Types.ObjectId(String(match.requester_id));
      const receiverId = new Types.ObjectId(String(match.receiver_id));
      return requesterId.equals(currentObjectId) ? receiverId : requesterId;
    });
  }

  private uniqueObjectIds(ids: Types.ObjectId[]) {
    const seen = new Set<string>();
    return ids.filter((id) => {
      const key = id.toString();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private async matchedInterestResponse(
    match: MatchDocument | Record<string, any>,
    targetObjectId: Types.ObjectId,
    targetUser: Record<string, any>,
  ) {
    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { match_id: match._id },
        {
          $setOnInsert: {
            match_id: match._id,
            title: '',
            created_at: new Date(),
            last_message_at: new Date(),
          },
          $set: {
            type: 'direct',
            participant_ids: [match.requester_id, match.receiver_id],
            updated_at: new Date(),
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
      status: 'matched',
      matchId: match._id.toString(),
      conversation: {
        id: conversation._id.toString(),
        matchId: match._id.toString(),
        createdAt: conversation.created_at,
        partner: {
          id: targetUser._id.toString(),
          fullName: targetUser.full_name,
          nationality: targetUser.nationality,
          avatarUrl: targetProfile?.avatar_url ?? '',
        },
      },
    };
  }

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }

  private async countConnectionsForUsers(userIds: Types.ObjectId[]) {
    if (userIds.length === 0) {
      return new Map<string, number>();
    }

    const counts = await this.matchModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        {
          $match: {
            status: 'accepted',
            $or: [
              { requester_id: { $in: userIds } },
              { receiver_id: { $in: userIds } },
            ],
          },
        },
        {
          $project: {
            participants: ['$requester_id', '$receiver_id'],
          },
        },
        { $unwind: '$participants' },
        { $group: { _id: '$participants', count: { $sum: 1 } } },
      ])
      .exec();

    const map = new Map<string, number>();
    for (const row of counts) {
      map.set(row._id.toString(), row.count);
    }
    return map;
  }

  private async ensureDirectConversationParticipants(
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
            { upsert: true },
          )
          .exec();
      }),
    );
  }
}
