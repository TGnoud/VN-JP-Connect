import {
  BadRequestException,
  ForbiddenException,
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
  Profile,
  ProfileDocument,
  User,
  UserDocument,
} from '../database/schemas';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {}

  async openWithUser(currentUserId: string, targetUserId: string) {
    const currentObjectId = this.objectIdFromParam(currentUserId, 'currentUserId');
    const targetObjectId = this.objectIdFromParam(targetUserId, 'userId');

    if (currentObjectId.equals(targetObjectId)) {
      throw new BadRequestException('cannot open a conversation with yourself');
    }

    const targetUser = await this.userModel.findById(targetObjectId).lean().exec();
    if (!targetUser) {
      throw new NotFoundException('user was not found');
    }

    const match = await this.matchModel
      .findOne({
        status: 'accepted',
        $or: [
          { requester_id: currentObjectId, receiver_id: targetObjectId },
          { requester_id: targetObjectId, receiver_id: currentObjectId },
        ],
      })
      .lean()
      .exec();

    if (!match) {
      throw new ForbiddenException('メッセージを送るには、先にこのユーザーとマッチする必要があります。');
    }

    const conversation = await this.conversationModel
      .findOneAndUpdate(
        { match_id: match._id },
        { $setOnInsert: { match_id: match._id, created_at: new Date() } },
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

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }
}
