import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Event,
  EventBookmark,
  EventBookmarkDocument,
  EventDocument,
  Nationality,
  User,
  UserDocument,
} from '../database/schemas';

export const ADMIN_DASHBOARD_RANGES = ['7d', '30d', '3m', '1y'] as const;
export type AdminDashboardRange = (typeof ADMIN_DASHBOARD_RANGES)[number];

type RangeConfig = {
  days: number;
  chartBuckets: number;
};

type DashboardMetric = {
  value: number;
  changePercent: number | null;
};

const RANGE_CONFIG: Record<AdminDashboardRange, RangeConfig> = {
  '7d': { days: 7, chartBuckets: 7 },
  '30d': { days: 30, chartBuckets: 6 },
  '3m': { days: 90, chartBuckets: 6 },
  '1y': { days: 365, chartBuckets: 12 },
};

const HCM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    @InjectModel(EventBookmark.name)
    private readonly eventBookmarkModel: Model<EventBookmarkDocument>,
  ) {}

  async getDashboard(rangeInput: string | undefined = '7d') {
    const range = this.validateRange(rangeInput);
    const config = RANGE_CONFIG[range];
    const now = new Date();
    const todayStart = this.startOfHoChiMinhDay(now);
    const tomorrowStart = this.addDays(todayStart, 1);
    const yesterdayStart = this.addDays(todayStart, -1);
    const rangeStart = this.addDays(todayStart, -(config.days - 1));
    const rangeEnd = this.addDays(rangeStart, config.days);
    const previousStart = this.addDays(rangeStart, -config.days);

    const [
      totalUsers,
      vnUsers,
      jpUsers,
      totalEvents,
      newUsersToday,
      newUsersYesterday,
      frozenAccounts,
      currentUsersCreated,
      previousUsersCreated,
      currentVnUsersCreated,
      previousVnUsersCreated,
      currentJpUsersCreated,
      previousJpUsersCreated,
      currentEventsCreated,
      previousEventsCreated,
      currentFrozenTransitions,
      previousFrozenTransitions,
      usersAtRangeStart,
      usersAtPreviousStart,
      interestedUserIds,
      userGrowthChart,
    ] = await Promise.all([
      this.countUsers({}),
      this.countUsers({ nationality: 'VN' }),
      this.countUsers({ nationality: 'JP' }),
      this.countEvents({}),
      this.countCreatedUsers(todayStart, tomorrowStart),
      this.countCreatedUsers(yesterdayStart, todayStart),
      this.countUsers({ status: 'frozen' }),
      this.countCreatedUsers(rangeStart, rangeEnd),
      this.countCreatedUsers(previousStart, rangeStart),
      this.countCreatedUsers(rangeStart, rangeEnd, 'VN'),
      this.countCreatedUsers(previousStart, rangeStart, 'VN'),
      this.countCreatedUsers(rangeStart, rangeEnd, 'JP'),
      this.countCreatedUsers(previousStart, rangeStart, 'JP'),
      this.countCreatedEvents(rangeStart, rangeEnd),
      this.countCreatedEvents(previousStart, rangeStart),
      this.countFrozenTransitions(rangeStart, rangeEnd),
      this.countFrozenTransitions(previousStart, rangeStart),
      this.countUsers({ created_at: { $lt: rangeStart } }),
      this.countUsers({ created_at: { $lt: previousStart } }),
      this.eventBookmarkModel.distinct('user_id').exec(),
      this.userGrowthChart(config, rangeStart, rangeEnd),
    ]);

    const systemGrowthRate = this.growthRate(
      currentUsersCreated,
      usersAtRangeStart,
    );
    const previousSystemGrowthRate = this.growthRate(
      previousUsersCreated,
      usersAtPreviousStart,
    );

    return {
      range,
      totalUsers: this.metric(totalUsers, currentUsersCreated, previousUsersCreated),
      vnUsers: this.metric(vnUsers, currentVnUsersCreated, previousVnUsersCreated),
      jpUsers: this.metric(jpUsers, currentJpUsersCreated, previousJpUsersCreated),
      totalEvents: this.metric(totalEvents, currentEventsCreated, previousEventsCreated),
      newUsersToday: this.metric(newUsersToday, newUsersToday, newUsersYesterday),
      frozenAccounts: this.metric(
        frozenAccounts,
        currentFrozenTransitions,
        previousFrozenTransitions,
      ),
      systemGrowthRate: this.metric(
        systemGrowthRate,
        systemGrowthRate,
        previousSystemGrowthRate,
      ),
      userGrowthChart,
      userDistribution: {
        total: totalUsers,
        vn: {
          count: vnUsers,
          percent: this.percentOf(vnUsers, totalUsers),
        },
        jp: {
          count: jpUsers,
          percent: this.percentOf(jpUsers, totalUsers),
        },
      },
      eventStats: {
        totalEvents,
        interestedUsers: interestedUserIds.length,
      },
    };
  }

  private validateRange(rangeInput: string | undefined): AdminDashboardRange {
    const range = rangeInput || '7d';
    if (!ADMIN_DASHBOARD_RANGES.includes(range as AdminDashboardRange)) {
      throw new BadRequestException('range is not supported');
    }

    return range as AdminDashboardRange;
  }

  private metric(
    value: number,
    currentPeriodValue: number,
    previousPeriodValue: number,
  ): DashboardMetric {
    return {
      value: this.round(value),
      changePercent: this.changePercent(currentPeriodValue, previousPeriodValue),
    };
  }

  private changePercent(current: number, previous: number) {
    if (previous === 0) {
      return null;
    }

    return this.round(((current - previous) / previous) * 100);
  }

  private percentOf(value: number, total: number) {
    if (total <= 0) {
      return 0;
    }

    return this.round((value / total) * 100);
  }

  private growthRate(newUsers: number, usersAtRangeStart: number) {
    if (usersAtRangeStart <= 0) {
      return newUsers > 0 ? 100 : 0;
    }

    return this.percentOf(newUsers, usersAtRangeStart);
  }

  private countUsers(filter: Record<string, unknown>) {
    return this.userModel.countDocuments(filter).exec();
  }

  private countEvents(filter: Record<string, unknown>) {
    return this.eventModel.countDocuments(filter).exec();
  }

  private countCreatedUsers(
    start: Date,
    end: Date,
    nationality?: Nationality,
  ) {
    const filter: Record<string, unknown> = {
      created_at: { $gte: start, $lt: end },
    };

    if (nationality) {
      filter.nationality = nationality;
    }

    return this.countUsers(filter);
  }

  private countCreatedEvents(start: Date, end: Date) {
    return this.countEvents({
      created_at: { $gte: start, $lt: end },
    });
  }

  private countFrozenTransitions(start: Date, end: Date) {
    return this.countUsers({
      status: 'frozen',
      status_updated_at: { $gte: start, $lt: end },
    });
  }

  private async userGrowthChart(
    config: RangeConfig,
    rangeStart: Date,
    rangeEnd: Date,
  ) {
    const bucketSizeDays = Math.ceil(config.days / config.chartBuckets);
    const buckets: Array<{ start: Date; end: Date }> = [];

    for (
      let bucketStart = rangeStart;
      bucketStart.getTime() < rangeEnd.getTime();
      bucketStart = this.addDays(bucketStart, bucketSizeDays)
    ) {
      const bucketEnd = new Date(
        Math.min(
          this.addDays(bucketStart, bucketSizeDays).getTime(),
          rangeEnd.getTime(),
        ),
      );
      buckets.push({ start: bucketStart, end: bucketEnd });
    }

    return Promise.all(
      buckets.map(async (bucket) => {
        const [vn, jp] = await Promise.all([
          this.countCreatedUsers(bucket.start, bucket.end, 'VN'),
          this.countCreatedUsers(bucket.start, bucket.end, 'JP'),
        ]);

        return {
          label: this.bucketLabel(bucket.start, bucketSizeDays),
          vn,
          jp,
        };
      }),
    );
  }

  private bucketLabel(start: Date, bucketSizeDays: number) {
    const parts = this.hoChiMinhDateParts(start);

    if (bucketSizeDays >= 28) {
      return `${parts.month}月`;
    }

    return `${parts.month}/${parts.day}`;
  }

  private startOfHoChiMinhDay(date: Date) {
    const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
    shifted.setUTCHours(0, 0, 0, 0);
    return new Date(shifted.getTime() - HCM_OFFSET_MS);
  }

  private hoChiMinhDateParts(date: Date) {
    const shifted = new Date(date.getTime() + HCM_OFFSET_MS);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * DAY_MS);
  }

  private round(value: number) {
    return Math.round(value * 10) / 10;
  }
}
