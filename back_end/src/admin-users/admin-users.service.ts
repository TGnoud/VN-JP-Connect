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
  User,
  UserDocument,
  UserReport,
  UserReportDocument,
  UserReportStatus,
  USER_REPORT_STATUSES,
  UserStatus,
  USER_STATUSES,
} from '../database/schemas';

type ListUsersQuery = {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  status?: unknown;
};

type ListReportsQuery = {
  page?: unknown;
  pageSize?: unknown;
  status?: unknown;
};

const USER_PAGE_SIZE_DEFAULT = 6;
const REPORT_PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;
const STATUS_FILTERS = ['all', ...USER_STATUSES] as const;
const REPORT_ACTIONS = ['dismiss', 'freeze'] as const;
const AVATAR_COLORS = [
  '#f87171',
  '#60a5fa',
  '#4ade80',
  '#c084fc',
  '#fb923c',
  '#a78bfa',
  '#f472b6',
  '#34d399',
];

@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Match.name) private readonly matchModel: Model<MatchDocument>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectModel(UserReport.name)
    private readonly userReportModel: Model<UserReportDocument>,
  ) {}

  async listUsers(query: ListUsersQuery = {}) {
    const page = this.positiveInt(query.page, 'page', 1);
    const pageSize = this.positiveInt(
      query.pageSize,
      'pageSize',
      USER_PAGE_SIZE_DEFAULT,
      PAGE_SIZE_MAX,
    );
    const filter = this.userListFilter(query);
    const skip = (page - 1) * pageSize;

    const [users, totalItems] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ created_at: -1, _id: 1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    const reportCounts = await this.reportCountsForUsers(
      users.map((user) => user._id),
    );

    return {
      users: users.map((user) =>
        this.userSummary(user, reportCounts.get(user._id.toString()) ?? 0),
      ),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      stats: {
        totalUsers: totalItems,
      },
    };
  }

  async getUserDetail(userId: string) {
    const userObjectId = this.objectIdFromParam(userId, 'userId');
    const user = await this.userModel.findById(userObjectId).lean().exec();

    if (!user) {
      throw new NotFoundException('user was not found');
    }

    const [
      profile,
      reports,
      connections,
      conversationIds,
    ] = await Promise.all([
      this.profileModel.findOne({ user_id: userObjectId }).lean().exec(),
      this.userReportModel
        .countDocuments({ reported_user_id: userObjectId })
        .exec(),
      this.matchModel
        .countDocuments({
          status: 'accepted',
          $or: [{ requester_id: userObjectId }, { receiver_id: userObjectId }],
        })
        .exec(),
      this.conversationModel
        .find({ participant_ids: userObjectId })
        .select({ _id: 1 })
        .lean()
        .exec(),
    ]);
    const messages = conversationIds.length
      ? await this.messageModel
          .countDocuments({
            conversation_id: { $in: conversationIds.map((item) => item._id) },
          })
          .exec()
      : 0;

    return {
      ...this.userSummary(user, reports),
      detail: {
        connections,
        messages,
        occupation: profile?.occupation ?? '',
        location: profile?.location ?? '',
        lastActive: user.last_seen_at ?? null,
        languages: (profile?.languages ?? []).map((item) =>
          [item.language, item.level].filter(Boolean).join('（') +
          (item.level ? '）' : ''),
        ),
        bio: profile?.bio ?? '',
      },
    };
  }

  async updateUserStatus(userId: string, payload: Record<string, unknown>) {
    const userObjectId = this.objectIdFromParam(userId, 'userId');
    const status = this.userStatus(payload.status);
    const updated = await this.userModel
      .findByIdAndUpdate(
        userObjectId,
        { $set: { status, status_updated_at: new Date() } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('user was not found');
    }

    const reports = await this.userReportModel
      .countDocuments({ reported_user_id: userObjectId })
      .exec();

    return this.userSummary(updated, reports);
  }

  async listReports(query: ListReportsQuery = {}) {
    const page = this.positiveInt(query.page, 'page', 1);
    const pageSize = this.positiveInt(
      query.pageSize,
      'pageSize',
      REPORT_PAGE_SIZE_DEFAULT,
      PAGE_SIZE_MAX,
    );
    const status = this.reportStatus(query.status, 'pending');
    const filter = { status };
    const skip = (page - 1) * pageSize;

    const [reports, totalItems, pendingCount] = await Promise.all([
      this.userReportModel
        .find(filter)
        .sort({ created_at: -1, _id: 1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.userReportModel.countDocuments(filter).exec(),
      this.userReportModel.countDocuments({ status: 'pending' }).exec(),
    ]);
    const userIds = Array.from(
      new Map(
        reports
          .flatMap((report) => [report.reporter_id, report.reported_user_id])
          .filter(Boolean)
          .map((id) => [id.toString(), id]),
      ).values(),
    );
    const users = userIds.length
      ? await this.userModel.find({ _id: { $in: userIds } }).lean().exec()
      : [];
    const usersById = new Map(users.map((user) => [user._id.toString(), user]));

    return {
      reports: reports.map((report) => this.reportResponse(report, usersById)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      stats: {
        pendingCount,
      },
    };
  }

  async updateReport(reportId: string, payload: Record<string, unknown>) {
    const reportObjectId = this.objectIdFromParam(reportId, 'reportId');
    const action = this.reportAction(payload.action);
    const existing = await this.userReportModel
      .findById(reportObjectId)
      .lean()
      .exec();

    if (!existing) {
      throw new NotFoundException('report was not found');
    }

    if (action === 'freeze') {
      await this.userModel
        .updateOne(
          { _id: existing.reported_user_id },
          { $set: { status: 'frozen', status_updated_at: new Date() } },
        )
        .exec();
    }

    const nextStatus: UserReportStatus =
      action === 'freeze' ? 'reviewed' : 'dismissed';
    const updated = await this.userReportModel
      .findByIdAndUpdate(
        reportObjectId,
        { $set: { status: nextStatus } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!updated) {
      throw new NotFoundException('report was not found');
    }

    const users = await this.userModel
      .find({
        _id: { $in: [updated.reporter_id, updated.reported_user_id] },
      })
      .lean()
      .exec();

    return this.reportResponse(
      updated,
      new Map(users.map((user) => [user._id.toString(), user])),
    );
  }

  private userListFilter(query: ListUsersQuery) {
    const filter: Record<string, unknown> = {};
    const status = this.statusFilter(query.status);
    const search = typeof query.search === 'string' ? query.search.trim() : '';

    if (status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const pattern = new RegExp(this.escapeRegExp(search), 'i');
      filter.$or = [{ full_name: pattern }, { email: pattern }];
    }

    return filter;
  }

  private userSummary(user: Record<string, any>, reports: number) {
    const id = user._id.toString();
    const name = user.full_name ?? '';

    return {
      id,
      name,
      email: user.email ?? '',
      country: user.nationality ?? 'VN',
      status: user.status ?? 'active',
      joinDate: user.created_at ?? null,
      reports,
      color: this.avatarColor(id || name),
    };
  }

  private reportResponse(
    report: Record<string, any>,
    usersById: Map<string, Record<string, any>>,
  ) {
    const reporter = usersById.get(report.reporter_id?.toString?.() ?? '');
    const reportedUser = usersById.get(
      report.reported_user_id?.toString?.() ?? '',
    );

    return {
      id: report._id.toString(),
      reason: report.reason,
      type: this.reasonLabel(report.reason),
      description: report.detail ?? '',
      reportedUserId: report.reported_user_id?.toString?.() ?? '',
      reportedUser: reportedUser?.full_name ?? 'Unknown user',
      reporterId: report.reporter_id?.toString?.() ?? '',
      reporter: reporter?.full_name ?? 'Unknown user',
      date: report.created_at ?? null,
      files: (report.evidence_files ?? []).map((file: Record<string, any>) => ({
        name: file.original_name || file.url || 'evidence',
        type: String(file.mime_type ?? '').startsWith('image/') ? 'image' : 'pdf',
        size: file.size ?? 0,
        url: file.url ?? '',
        mimeType: file.mime_type ?? '',
      })),
      status: report.status ?? 'pending',
    };
  }

  private async reportCountsForUsers(userIds: Types.ObjectId[]) {
    if (userIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await this.userReportModel
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { reported_user_id: { $in: userIds } } },
        { $group: { _id: '$reported_user_id', count: { $sum: 1 } } },
      ])
      .exec();

    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }

  private statusFilter(value: unknown) {
    const status = typeof value === 'string' && value ? value : 'all';

    if (!STATUS_FILTERS.includes(status as never)) {
      throw new BadRequestException('status is not supported');
    }

    return status as (typeof STATUS_FILTERS)[number];
  }

  private userStatus(value: unknown): UserStatus {
    if (!USER_STATUSES.includes(value as UserStatus)) {
      throw new BadRequestException('status is not supported');
    }

    return value as UserStatus;
  }

  private reportStatus(
    value: unknown,
    fallback: UserReportStatus,
  ): UserReportStatus {
    const status = typeof value === 'string' && value ? value : fallback;

    if (!USER_REPORT_STATUSES.includes(status as UserReportStatus)) {
      throw new BadRequestException('report status is not supported');
    }

    return status as UserReportStatus;
  }

  private reportAction(value: unknown) {
    if (!REPORT_ACTIONS.includes(value as never)) {
      throw new BadRequestException('action is not supported');
    }

    return value as (typeof REPORT_ACTIONS)[number];
  }

  private positiveInt(
    value: unknown,
    name: string,
    fallback: number,
    max = PAGE_SIZE_MAX,
  ) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
      throw new BadRequestException(`${name} is not supported`);
    }

    return parsed;
  }

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }

  private escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private avatarColor(seed: string) {
    const total = seed
      .split('')
      .reduce((sum, character) => sum + character.charCodeAt(0), 0);

    return AVATAR_COLORS[total % AVATAR_COLORS.length];
  }

  private reasonLabel(reason: string) {
    const labels: Record<string, string> = {
      spam: 'スパム',
      inappropriate_content: '不適切なコンテンツ',
      harassment: 'ハラスメント',
      fake_profile: 'なりすまし',
      other: 'その他',
    };

    return labels[reason] ?? reason;
  }
}
