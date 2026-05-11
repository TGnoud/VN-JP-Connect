import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Match,
  MatchDocument,
  Profile,
  ProfileDocument,
  Tag,
  TagDocument,
  User,
  UserDocument,
  UserInterest,
  UserInterestDocument,
} from '../database/schemas';

type DiscoverQuery = {
  gender?: string;
  nationality?: string;
  interestTagIds?: string[];
  limit?: number;
};

@Injectable()
export class HomeService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(UserInterest.name)
    private readonly userInterestModel: Model<UserInterestDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
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
      interests: interests.map((t) => ({ id: t._id.toString(), name: t.name })),
    };
  }

  async discover(currentUserId: string, query: DiscoverQuery) {
    const limit = query.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new BadRequestException('limit must be between 1 and 50');
    }

    const currentUserObjectId = new Types.ObjectId(currentUserId);

    const userFilter: Record<string, unknown> = { _id: { $ne: currentUserObjectId } };
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
          throw new BadRequestException('interestTagIds must be valid ObjectIds');
        }
        return new Types.ObjectId(id);
      });

      const existingCount = await this.tagModel
        .countDocuments({ _id: { $in: tagObjectIds }, type: 'interest' })
        .exec();
      if (existingCount !== tagObjectIds.length) {
        throw new BadRequestException('interestTagIds must reference existing interest tags');
      }

      const userIds = await this.userInterestModel
        .distinct('user_id', { tag_id: { $in: tagObjectIds } })
        .exec();
      allowedUserIds = userIds.map((id) => new Types.ObjectId(String(id)));
      userFilter._id = { $ne: currentUserObjectId, $in: allowedUserIds };
    }

    const users = await this.userModel.find(userFilter).limit(limit).lean().exec();
    const userIds = users.map((u) => u._id);
    const profiles = await this.profileModel
      .find({ user_id: { $in: userIds }, ...profileFilter })
      .lean()
      .exec();

    const profileByUserId = new Map<string, any>(
      profiles.map((p) => [p.user_id.toString(), p]),
    );

    const interestLinks = await this.userInterestModel
      .find({ user_id: { $in: userIds } })
      .lean()
      .exec();
    const tagIds = Array.from(new Set(interestLinks.map((l) => l.tag_id.toString())));
    const tags = tagIds.length
      ? await this.tagModel
          .find({ _id: { $in: tagIds.map((id) => new Types.ObjectId(id)) } })
          .lean()
          .exec()
      : [];
    const tagById = new Map(tags.map((t) => [t._id.toString(), t]));

    const connectionsCountByUserId = await this.countConnectionsForUsers(userIds);

    return users
      .map((user) => {
        const profile = profileByUserId.get(user._id.toString());
        const userInterestTagIds = interestLinks
          .filter((l) => l.user_id.toString() === user._id.toString())
          .map((l) => l.tag_id.toString());
        const interests = userInterestTagIds
          .map((id) => tagById.get(id))
          .filter(Boolean)
          .map((t: any) => ({ id: t._id.toString(), name: t.name, type: t.type }));

        return {
          id: user._id.toString(),
          fullName: user.full_name,
          nationality: user.nationality,
          age: profile?.age ?? null,
          gender: profile?.gender ?? null,
          location: profile?.location ?? '',
          occupation: profile?.occupation ?? '',
          bio: profile?.bio ?? '',
          avatarUrl: profile?.avatar_url ?? '',
          photos: (profile?.photos ?? []).map((p: any) => ({
            id: p._id.toString(),
            url: p.url,
            isMain: p.is_main,
            uploadedAt: p.uploaded_at,
          })),
          interests,
          likeRate: profile.match_rate ?? 100,
          connectionsCount:
            profile?.connections_count ??
            connectionsCountByUserId.get(user._id.toString()) ??
            0,
          joinedAt: user.created_at,
          updatedAt: profile?.updated_at ?? user.created_at,
        };
      })
      .filter(Boolean);
  }

  private async countConnectionsForUsers(userIds: Types.ObjectId[]) {
    const counts = await this.matchModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { status: 'accepted', $or: [{ requester_id: { $in: userIds } }, { receiver_id: { $in: userIds } }] } },
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
}

