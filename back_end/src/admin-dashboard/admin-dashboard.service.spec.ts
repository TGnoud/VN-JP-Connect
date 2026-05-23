import { Types } from 'mongoose';
import { AdminDashboardService } from './admin-dashboard.service';

function queryMock<T>(value: T) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

function modelMock<T extends Record<string, any>>(documents: T[]) {
  return {
    countDocuments: jest.fn((filter: Record<string, unknown> = {}) =>
      queryMock(documents.filter((document) => matchesFilter(document, filter)).length),
    ),
    distinct: jest.fn((field: string) =>
      queryMock(
        Array.from(
          new Map(
            documents
              .map((document) => document[field])
              .filter(Boolean)
              .map((value) => [value.toString(), value]),
          ).values(),
        ),
      ),
    ),
  };
}

function matchesFilter(document: Record<string, any>, filter: Record<string, any>) {
  return Object.entries(filter).every(([key, condition]) =>
    matchesCondition(document[key], condition),
  );
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (
    condition &&
    typeof condition === 'object' &&
    !(condition instanceof Date) &&
    ('$gte' in condition || '$lt' in condition)
  ) {
    const timestamp = new Date(value as string | Date).getTime();
    const range = condition as { $gte?: Date; $lt?: Date };

    if (range.$gte && timestamp < range.$gte.getTime()) {
      return false;
    }

    if (range.$lt && timestamp >= range.$lt.getTime()) {
      return false;
    }

    return true;
  }

  return value === condition;
}

describe('AdminDashboardService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-23T05:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects unsupported ranges', async () => {
    const service = new AdminDashboardService(
      modelMock([]) as any,
      modelMock([]) as any,
      modelMock([]) as any,
    );

    await expect(service.getDashboard('2d')).rejects.toThrow('range is not supported');
  });

  it('returns dashboard counts, distribution, bookmarks, and growth metrics', async () => {
    const users = [
      user('JP', '2026-05-01T00:00:00.000Z'),
      user('VN', '2026-05-12T00:00:00.000Z'),
      user('VN', '2026-05-18T00:00:00.000Z'),
      user('JP', '2026-05-20T00:00:00.000Z', 'frozen', '2026-05-21T00:00:00.000Z'),
      user('JP', '2026-05-22T10:00:00.000Z'),
      user('VN', '2026-05-22T18:00:00.000Z'),
    ];
    const events = [
      { created_at: new Date('2026-05-01T00:00:00.000Z') },
      { created_at: new Date('2026-05-12T00:00:00.000Z') },
      { created_at: new Date('2026-05-18T00:00:00.000Z') },
    ];
    const interestedUserId = new Types.ObjectId();
    const bookmarks = [
      { user_id: interestedUserId },
      { user_id: interestedUserId },
      { user_id: new Types.ObjectId() },
    ];
    const service = new AdminDashboardService(
      modelMock(users) as any,
      modelMock(events) as any,
      modelMock(bookmarks) as any,
    );

    const result = await service.getDashboard('7d');

    expect(result.totalUsers).toEqual({ value: 6, changePercent: 300 });
    expect(result.vnUsers).toEqual({ value: 3, changePercent: 100 });
    expect(result.jpUsers).toEqual({ value: 3, changePercent: null });
    expect(result.totalEvents).toEqual({ value: 3, changePercent: 0 });
    expect(result.newUsersToday).toEqual({ value: 1, changePercent: 0 });
    expect(result.frozenAccounts).toEqual({ value: 1, changePercent: null });
    expect(result.systemGrowthRate).toEqual({ value: 200, changePercent: 100 });
    expect(result.userDistribution).toEqual({
      total: 6,
      vn: { count: 3, percent: 50 },
      jp: { count: 3, percent: 50 },
    });
    expect(result.eventStats).toEqual({
      totalEvents: 3,
      interestedUsers: 2,
    });
    expect(result.userGrowthChart).toHaveLength(7);
  });

  it('uses Asia/Ho_Chi_Minh boundaries for today', async () => {
    const users = [
      user('VN', '2026-05-22T16:59:59.000Z'),
      user('VN', '2026-05-22T17:00:00.000Z'),
      user('JP', '2026-05-23T16:59:59.000Z'),
    ];
    const service = new AdminDashboardService(
      modelMock(users) as any,
      modelMock([]) as any,
      modelMock([]) as any,
    );

    const result = await service.getDashboard('7d');

    expect(result.newUsersToday.value).toBe(2);
  });
});

function user(
  nationality: 'JP' | 'VN',
  createdAt: string,
  status: 'active' | 'frozen' = 'active',
  statusUpdatedAt = createdAt,
) {
  return {
    nationality,
    status,
    created_at: new Date(createdAt),
    status_updated_at: new Date(statusUpdatedAt),
  };
}
