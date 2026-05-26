import { Types } from 'mongoose';
import { AdminUsersService } from './admin-users.service';

function queryMock<T>(value: T) {
  const query: any = {
    value,
    offset: 0,
    size: Array.isArray(value) ? value.length : 0,
  };
  query.sort = jest.fn().mockReturnValue(query);
  query.skip = jest.fn((count: number) => {
    if (Array.isArray(query.value)) query.offset = count;
    return query;
  });
  query.limit = jest.fn((count: number) => {
    if (Array.isArray(query.value)) query.size = count;
    return query;
  });
  query.select = jest.fn().mockReturnValue(query);
  query.lean = jest.fn().mockReturnValue(query);
  query.exec = jest.fn(() => {
    if (!Array.isArray(query.value)) return Promise.resolve(query.value);
    const offset = query.offset ?? 0;
    const size = query.size ?? query.value.length;
    return Promise.resolve(query.value.slice(offset, offset + size));
  });

  return query;
}

function collectionMock<T extends Record<string, any>>(documents: T[]) {
  return {
    find: jest.fn((filter: Record<string, unknown> = {}) =>
      queryMock(documents.filter((document) => matchesFilter(document, filter))),
    ),
    findOne: jest.fn((filter: Record<string, unknown> = {}) =>
      queryMock(documents.find((document) => matchesFilter(document, filter)) ?? null),
    ),
    findById: jest.fn((id: Types.ObjectId | string) =>
      queryMock(documents.find((document) => sameId(document._id, id)) ?? null),
    ),
    countDocuments: jest.fn((filter: Record<string, unknown> = {}) =>
      ({ exec: jest.fn().mockResolvedValue(documents.filter((document) => matchesFilter(document, filter)).length) }),
    ),
    findByIdAndUpdate: jest.fn((id: Types.ObjectId | string, update: Record<string, any>) => {
      const document = documents.find((item) => sameId(item._id, id));
      if (document && update.$set) {
        Object.assign(document, update.$set);
      }
      return queryMock(document ?? null);
    }),
    updateOne: jest.fn((filter: Record<string, unknown>, update: Record<string, any>) => {
      const document = documents.find((item) => matchesFilter(item, filter));
      if (document && update.$set) {
        Object.assign(document, update.$set);
      }
      return { exec: jest.fn().mockResolvedValue({ matchedCount: document ? 1 : 0 }) };
    }),
    aggregate: jest.fn(() => ({
      exec: jest.fn().mockResolvedValue(groupReportsByReportedUser(documents)),
    })),
  };
}

function groupReportsByReportedUser(documents: Array<Record<string, any>>) {
  const counts = new Map<string, { _id: Types.ObjectId; count: number }>();

  for (const document of documents) {
    if (!document.reported_user_id) continue;
    const key = document.reported_user_id.toString();
    const current = counts.get(key);
    counts.set(key, {
      _id: document.reported_user_id,
      count: (current?.count ?? 0) + 1,
    });
  }

  return Array.from(counts.values());
}

function matchesFilter(document: Record<string, any>, filter: Record<string, any>) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') {
      return (condition as Record<string, unknown>[]).some((option) =>
        matchesFilter(document, option),
      );
    }
    return matchesCondition(document[key], condition);
  });
}

function matchesCondition(value: unknown, condition: unknown): boolean {
  if (condition instanceof RegExp) {
    return condition.test(String(value ?? ''));
  }

  if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
    const objectCondition = condition as Record<string, unknown>;
    if ('$in' in objectCondition) {
      return (objectCondition.$in as unknown[]).some((item) => sameId(value, item));
    }
  }

  if (Array.isArray(value)) {
    return value.some((item) => sameId(item, condition));
  }

  return sameId(value, condition);
}

function sameId(first: unknown, second: unknown) {
  if (first instanceof Types.ObjectId || second instanceof Types.ObjectId) {
    return String(first) === String(second);
  }

  return first === second;
}

describe('AdminUsersService', () => {
  it('lists users with server-side search, status filter, pagination, and report counts', async () => {
    const bobId = new Types.ObjectId();
    const users = [
      user('Alice Nguyen', 'alice@example.com', 'VN', 'active'),
      user('Bob Tanaka', 'bob@example.com', 'JP', 'frozen', bobId),
      user('Carol Tran', 'carol@example.com', 'VN', 'active'),
    ];
    const reports = [
      report(new Types.ObjectId(), bobId, 'spam'),
      report(new Types.ObjectId(), bobId, 'harassment'),
    ];
    const service = newService({ users, reports });

    const result = await service.listUsers({
      page: '1',
      pageSize: '1',
      search: 'bob@example.com',
      status: 'frozen',
    });

    expect(result.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      totalItems: 1,
      totalPages: 1,
    });
    expect(result.stats.totalUsers).toBe(1);
    expect(result.users).toHaveLength(1);
    expect(result.users[0]).toMatchObject({
      id: bobId.toString(),
      name: 'Bob Tanaka',
      email: 'bob@example.com',
      country: 'JP',
      status: 'frozen',
      reports: 2,
    });
  });

  it('returns detail fields from profile, matches, conversations, messages, and reports', async () => {
    const userId = new Types.ObjectId();
    const conversationId = new Types.ObjectId();
    const service = newService({
      users: [user('Alice Nguyen', 'alice@example.com', 'VN', 'active', userId)],
      profiles: [
        {
          _id: new Types.ObjectId(),
          user_id: userId,
          occupation: 'Engineer',
          location: 'Ha Noi',
          languages: [{ language: '日本語', level: 'N3' }],
          bio: 'Hello',
        },
      ],
      reports: [report(new Types.ObjectId(), userId, 'spam')],
      matches: [
        {
          _id: new Types.ObjectId(),
          requester_id: userId,
          receiver_id: new Types.ObjectId(),
          status: 'accepted',
        },
      ],
      conversations: [{ _id: conversationId, participant_ids: [userId] }],
      messages: [
        { _id: new Types.ObjectId(), conversation_id: conversationId },
        { _id: new Types.ObjectId(), conversation_id: conversationId },
      ],
    });

    const result = await service.getUserDetail(userId.toString());

    expect(result.detail).toMatchObject({
      connections: 1,
      messages: 2,
      occupation: 'Engineer',
      location: 'Ha Noi',
      languages: ['日本語（N3）'],
      bio: 'Hello',
    });
    expect(result.reports).toBe(1);
  });

  it('updates user status and status_updated_at', async () => {
    const userId = new Types.ObjectId();
    const users = [user('Alice Nguyen', 'alice@example.com', 'VN', 'active', userId)];
    const service = newService({ users });

    const result = await service.updateUserStatus(userId.toString(), {
      status: 'frozen',
    });

    expect(result.status).toBe('frozen');
    expect(users[0].status).toBe('frozen');
    expect(users[0].status_updated_at).toBeInstanceOf(Date);
  });

  it('lists all reports unless a report status filter is provided', async () => {
    const reporterId = new Types.ObjectId();
    const reportedUserId = new Types.ObjectId();
    const users = [
      user('Reporter', 'reporter@example.com', 'JP', 'active', reporterId),
      user('Reported', 'reported@example.com', 'VN', 'active', reportedUserId),
    ];
    const reports = [
      report(reporterId, reportedUserId, 'spam'),
      {
        ...report(reporterId, reportedUserId, 'harassment'),
        status: 'reviewed',
      },
      {
        ...report(reporterId, reportedUserId, 'other'),
        status: 'dismissed',
      },
    ];
    const service = newService({ users, reports });

    const all = await service.listReports({ page: '1', pageSize: '10' });
    const pendingOnly = await service.listReports({
      page: '1',
      pageSize: '10',
      status: 'pending',
    });

    expect(all.reports.map((item) => item.status)).toEqual([
      'pending',
      'reviewed',
      'dismissed',
    ]);
    expect(all.pagination.totalItems).toBe(3);
    expect(all.stats.pendingCount).toBe(1);
    expect(pendingOnly.reports).toHaveLength(1);
    expect(pendingOnly.reports[0].status).toBe('pending');
  });

  it('dismisses and freezes reports', async () => {
    const reporterId = new Types.ObjectId();
    const reportedUserId = new Types.ObjectId();
    const freezeReportId = new Types.ObjectId();
    const dismissReportId = new Types.ObjectId();
    const users = [
      user('Reporter', 'reporter@example.com', 'JP', 'active', reporterId),
      user('Reported', 'reported@example.com', 'VN', 'active', reportedUserId),
    ];
    const reports = [
      report(reporterId, reportedUserId, 'spam', freezeReportId),
      report(reporterId, reportedUserId, 'harassment', dismissReportId),
    ];
    const service = newService({ users, reports });

    const frozen = await service.updateReport(freezeReportId.toString(), {
      action: 'freeze',
    });
    const dismissed = await service.updateReport(dismissReportId.toString(), {
      action: 'dismiss',
    });

    expect(frozen.status).toBe('reviewed');
    expect(dismissed.status).toBe('dismissed');
    expect(users[1].status).toBe('frozen');
  });
});

function newService({
  users = [],
  profiles = [],
  matches = [],
  conversations = [],
  messages = [],
  reports = [],
}: {
  users?: Array<Record<string, any>>;
  profiles?: Array<Record<string, any>>;
  matches?: Array<Record<string, any>>;
  conversations?: Array<Record<string, any>>;
  messages?: Array<Record<string, any>>;
  reports?: Array<Record<string, any>>;
}) {
  return new AdminUsersService(
    collectionMock(users) as any,
    collectionMock(profiles) as any,
    collectionMock(matches) as any,
    collectionMock(conversations) as any,
    collectionMock(messages) as any,
    collectionMock(reports) as any,
  );
}

function user(
  fullName: string,
  email: string,
  nationality: 'JP' | 'VN',
  status: 'active' | 'frozen',
  id = new Types.ObjectId(),
) {
  return {
    _id: id,
    full_name: fullName,
    email,
    nationality,
    status,
    created_at: new Date('2026-05-01T00:00:00.000Z'),
    status_updated_at: new Date('2026-05-01T00:00:00.000Z'),
  };
}

function report(
  reporterId: Types.ObjectId,
  reportedUserId: Types.ObjectId,
  reason: string,
  id = new Types.ObjectId(),
) {
  return {
    _id: id,
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
    detail: `${reason} detail`,
    evidence_files: [],
    status: 'pending',
    created_at: new Date('2026-05-02T00:00:00.000Z'),
  };
}
