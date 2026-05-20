import { ForbiddenException } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { UserReportDocument } from '../database/schemas';

export const USER_REPORT_BLOCKED_MESSAGE =
  'このユーザーとは連絡できません。';

export function userReportBlockFilter(
  firstUserId: Types.ObjectId,
  secondUserId: Types.ObjectId,
) {
  return {
    $or: [
      { reporter_id: firstUserId, reported_user_id: secondUserId },
      { reporter_id: secondUserId, reported_user_id: firstUserId },
    ],
  };
}

export async function hasUserReportBlock(
  userReportModel: Model<UserReportDocument>,
  firstUserId: Types.ObjectId,
  secondUserId: Types.ObjectId,
) {
  if (firstUserId.equals(secondUserId)) {
    return false;
  }

  return Boolean(
    await userReportModel
      .exists(userReportBlockFilter(firstUserId, secondUserId))
      .exec(),
  );
}

export async function assertNoUserReportBlock(
  userReportModel: Model<UserReportDocument>,
  firstUserId: Types.ObjectId,
  secondUserId: Types.ObjectId,
) {
  if (await hasUserReportBlock(userReportModel, firstUserId, secondUserId)) {
    throw new ForbiddenException(USER_REPORT_BLOCKED_MESSAGE);
  }
}

export async function blockedUserIdsFor(
  userReportModel: Model<UserReportDocument>,
  userId: Types.ObjectId,
) {
  const reports = await userReportModel
    .find({
      $or: [{ reporter_id: userId }, { reported_user_id: userId }],
    })
    .select({ reporter_id: 1, reported_user_id: 1 })
    .lean()
    .exec();

  return reports.map((report) => {
    const reporterId = new Types.ObjectId(String(report.reporter_id));
    const reportedUserId = new Types.ObjectId(String(report.reported_user_id));

    return reporterId.equals(userId) ? reportedUserId : reporterId;
  });
}

export async function blockedUserIdSetFor(
  userReportModel: Model<UserReportDocument>,
  userId: Types.ObjectId,
) {
  return new Set(
    (await blockedUserIdsFor(userReportModel, userId)).map((id) =>
      id.toString(),
    ),
  );
}
