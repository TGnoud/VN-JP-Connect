import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  UserReport,
  UserReportDocument,
  UserReportReason,
  USER_REPORT_REASONS,
} from '../database/schemas';
import {
  ProfileImageStorageService,
  UploadedFileLike,
} from '../profile/profile-image-storage.service';

export const REPORT_EVIDENCE_MAX_FILES = 5;
export const REPORT_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const REPORT_EVIDENCE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
];

type ReportInput = {
  reason: UserReportReason;
  detail: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(UserInterest.name)
    private readonly userInterestModel: Model<UserInterestDocument>,
    @InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(UserReport.name)
    private readonly userReportModel: Model<UserReportDocument>,
    private readonly profileImageStorage: ProfileImageStorageService,
  ) {}

  async getPublicProfile(currentUserId: string, targetUserId: string) {
    const targetObjectId = this.objectIdFromParam(targetUserId, 'userId');
    const targetUser = await this.userModel.findById(targetObjectId).lean().exec();

    if (!targetUser) {
      throw new NotFoundException('user was not found');
    }

    const profile = await this.profileModel.findOne({ user_id: targetObjectId }).lean().exec();
    const interests = await this.getInterestTags(targetObjectId);
    const connectionsCount = await this.countConnections(targetObjectId);

    return {
      id: targetUser._id.toString(),
      fullName: targetUser.full_name,
      nationality: targetUser.nationality,
      age: profile?.age ?? null,
      gender: profile?.gender ?? null,
      location: profile?.location ?? '',
      occupation: profile?.occupation ?? '',
      education: profile?.education ?? '',
      bio: profile?.bio ?? '',
      avatarUrl: profile?.avatar_url ?? '',
      coverUrl: profile?.cover_url ?? '',
      languages: (profile?.languages ?? []).map((item) => ({
        language: item.language,
        level: item.level,
      })),
      interests,
      photos: (profile?.photos ?? []).map((photo) => ({
        id: photo._id.toString(),
        url: photo.url,
        isMain: photo.is_main,
        uploadedAt: photo.uploaded_at,
      })),
      likeRate: profile?.match_rate ?? 100,
      connectionsCount: profile?.connections_count ?? connectionsCount,
      joinedAt: targetUser.created_at,
      updatedAt: profile?.updated_at ?? targetUser.created_at,
      isMe: currentUserId === targetUser._id.toString(),
    };
  }

  async reportUser(
    reporterUserId: string,
    reportedUserId: string,
    input: ReportInput,
    files: UploadedFileLike[] = [],
  ) {
    const reporterObjectId = this.objectIdFromParam(reporterUserId, 'currentUserId');
    const reportedObjectId = this.objectIdFromParam(reportedUserId, 'userId');

    if (reporterObjectId.equals(reportedObjectId)) {
      throw new BadRequestException('cannot report yourself');
    }

    const [reporterExists, reportedExists] = await Promise.all([
      this.userModel.exists({ _id: reporterObjectId }).exec(),
      this.userModel.exists({ _id: reportedObjectId }).exec(),
    ]);

    if (!reporterExists || !reportedExists) {
      throw new NotFoundException('user was not found');
    }

    if (!USER_REPORT_REASONS.includes(input.reason)) {
      throw new BadRequestException('reason is invalid');
    }

    if (files.length > REPORT_EVIDENCE_MAX_FILES) {
      throw new BadRequestException(`evidence files cannot exceed ${REPORT_EVIDENCE_MAX_FILES}`);
    }

    const evidenceFiles = await Promise.all(
      files.map(async (file) => {
        if (!REPORT_EVIDENCE_MIME_TYPES.includes(file.mimetype)) {
          throw new BadRequestException('unsupported evidence file type');
        }

        if ((file.size ?? 0) > REPORT_EVIDENCE_MAX_BYTES) {
          throw new BadRequestException('evidence file is too large');
        }

        const storedFile = await this.profileImageStorage.saveReportEvidence(
          reporterUserId,
          reportedUserId,
          file,
        );

        return {
          url: storedFile.url,
          public_id: storedFile.publicId ?? '',
          mime_type: file.mimetype,
          original_name: file.originalname ?? '',
          size: file.size ?? 0,
        };
      }),
    );

    const report = await this.userReportModel.create({
      reporter_id: reporterObjectId,
      reported_user_id: reportedObjectId,
      reason: input.reason,
      detail: input.detail,
      evidence_files: evidenceFiles,
      status: 'pending',
      created_at: new Date(),
    });

    return {
      id: report._id.toString(),
      status: report.status,
      createdAt: report.created_at,
    };
  }

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }

  private async getInterestTags(userId: Types.ObjectId) {
    const interestLinks = await this.userInterestModel.find({ user_id: userId }).lean().exec();
    const tagIds = interestLinks.map((item) => item.tag_id);

    if (tagIds.length === 0) {
      return [];
    }

    const tags = await this.tagModel
      .find({ _id: { $in: tagIds } })
      .lean()
      .exec();

    return tags.map((tag) => ({
      id: tag._id.toString(),
      name: tag.name,
      type: tag.type,
    }));
  }

  private async countConnections(userId: Types.ObjectId) {
    return this.matchModel
      .countDocuments({
        status: 'accepted',
        $or: [{ requester_id: userId }, { receiver_id: userId }],
      })
      .exec();
  }
}
