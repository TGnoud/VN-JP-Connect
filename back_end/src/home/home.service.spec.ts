import { Types } from 'mongoose';
import { HomeService } from './home.service';

function queryMock<T>(value: T) {
  return {
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function limitingQueryMock<T>(value: T[]) {
  let limit: number | undefined;
  const query = {
    limit: jest.fn((nextLimit: number) => {
      limit = nextLimit;
      return query;
    }),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockImplementation(() =>
      Promise.resolve(limit === undefined ? value : value.slice(0, limit)),
    ),
  };
  return query;
}

describe('HomeService', () => {
  it('omits discover users when a profile document is missing', async () => {
    const currentUserId = new Types.ObjectId().toString();
    const targetUserId = new Types.ObjectId();
    const userModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          _id: targetUserId,
          full_name: 'New User',
          nationality: 'VN',
          created_at: new Date('2026-05-11T00:00:00.000Z'),
        },
      ])),
    };
    const profileModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const userInterestModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const tagModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const matchModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    const conversationModel = {};
    const service = new HomeService(
      userModel as any,
      profileModel as any,
      userInterestModel as any,
      tagModel as any,
      matchModel as any,
      conversationModel as any,
    );

    const result = await service.discover(currentUserId, {});

    expect(result).toEqual([]);
  });

  it('filters discover users by age and Japanese level', async () => {
    const currentUserId = new Types.ObjectId().toString();
    const matchedUserId = new Types.ObjectId();
    const filteredUserId = new Types.ObjectId();
    const userModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          _id: matchedUserId,
          full_name: 'Matched User',
          nationality: 'VN',
          birth_date: new Date('2000-01-01T00:00:00.000Z'),
          created_at: new Date('2026-05-11T00:00:00.000Z'),
        },
        {
          _id: filteredUserId,
          full_name: 'Filtered User',
          nationality: 'VN',
          birth_date: new Date('1990-01-01T00:00:00.000Z'),
          created_at: new Date('2026-05-11T00:00:00.000Z'),
        },
      ])),
    };
    const profileModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          user_id: matchedUserId,
          languages: [{ language: 'Japanese', level: 'N3' }],
          photos: [],
          bio: '',
        },
        {
          user_id: filteredUserId,
          languages: [{ language: 'Japanese', level: 'N1' }],
          photos: [],
          bio: '',
        },
      ])),
    };
    const userInterestModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const tagModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const matchModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    const service = new HomeService(
      userModel as any,
      profileModel as any,
      userInterestModel as any,
      tagModel as any,
      matchModel as any,
      {} as any,
    );

    const result = await service.discover(currentUserId, {
      ageMin: 18,
      ageMax: 30,
      japaneseLevels: ['N3'],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: matchedUserId.toString(),
      fullName: 'Matched User',
      languages: [{ language: 'Japanese', level: 'N3' }],
    });
  });

  it('excludes pending and accepted discover relationships but keeps rejected users discoverable', async () => {
    const currentUserId = new Types.ObjectId();
    const acceptedUserId = new Types.ObjectId();
    const pendingUserId = new Types.ObjectId();
    const rejectedUserId = new Types.ObjectId();
    const newUserId = new Types.ObjectId();
    const users = [
      {
        _id: acceptedUserId,
        full_name: 'Accepted User',
        nationality: 'JP',
        birth_date: new Date('2000-01-01T00:00:00.000Z'),
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
      {
        _id: pendingUserId,
        full_name: 'Pending User',
        nationality: 'VN',
        birth_date: new Date('2000-01-01T00:00:00.000Z'),
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
      {
        _id: rejectedUserId,
        full_name: 'Rejected User',
        nationality: 'JP',
        birth_date: new Date('2000-01-01T00:00:00.000Z'),
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
      {
        _id: newUserId,
        full_name: 'New User',
        nationality: 'VN',
        birth_date: new Date('2000-01-01T00:00:00.000Z'),
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
    ];
    const userModel = {
      find: jest.fn().mockReturnValue(queryMock(users)),
    };
    const profileModel = {
      find: jest.fn().mockReturnValue(queryMock(
        users.map((user) => ({
          user_id: user._id,
          languages: [],
          photos: [],
          bio: '',
        })),
      )),
    };
    const userInterestModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const tagModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const matchModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          requester_id: currentUserId,
          receiver_id: acceptedUserId,
          status: 'accepted',
        },
        {
          requester_id: pendingUserId,
          receiver_id: currentUserId,
          status: 'pending',
        },
      ])),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    const service = new HomeService(
      userModel as any,
      profileModel as any,
      userInterestModel as any,
      tagModel as any,
      matchModel as any,
      {} as any,
    );

    const result = await service.discover(currentUserId.toString(), {});

    expect(result.map((user) => user.id)).toEqual([
      rejectedUserId.toString(),
      newUserId.toString(),
    ]);
    expect(matchModel.find).toHaveBeenCalledWith({
      status: { $in: ['pending', 'accepted'] },
      $or: [
        { requester_id: currentUserId },
        { receiver_id: currentUserId },
      ],
    });
  });

  it('applies discover limit after filtering users without profiles', async () => {
    const currentUserId = new Types.ObjectId().toString();
    const missingProfileUserId = new Types.ObjectId();
    const firstProfileUserId = new Types.ObjectId();
    const secondProfileUserId = new Types.ObjectId();
    const userQuery = limitingQueryMock([
      {
        _id: missingProfileUserId,
        full_name: 'Missing Profile User',
        nationality: 'VN',
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
      {
        _id: firstProfileUserId,
        full_name: 'First Profile User',
        nationality: 'JP',
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
      {
        _id: secondProfileUserId,
        full_name: 'Second Profile User',
        nationality: 'VN',
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      },
    ]);
    const userModel = {
      find: jest.fn().mockReturnValue(userQuery),
    };
    const profileModel = {
      find: jest.fn().mockReturnValue(queryMock([
        {
          user_id: firstProfileUserId,
          languages: [],
          photos: [],
          bio: '',
        },
        {
          user_id: secondProfileUserId,
          languages: [],
          photos: [],
          bio: '',
        },
      ])),
    };
    const userInterestModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const tagModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const matchModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
      aggregate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
    };
    const service = new HomeService(
      userModel as any,
      profileModel as any,
      userInterestModel as any,
      tagModel as any,
      matchModel as any,
      {} as any,
    );

    const result = await service.discover(currentUserId, { limit: 1 });

    expect(userQuery.limit).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: firstProfileUserId.toString(),
      fullName: 'First Profile User',
    });
  });

  it('creates a pending match when showing interest for the first time', async () => {
    const currentUserId = new Types.ObjectId();
    const targetUserId = new Types.ObjectId();
    const matchId = new Types.ObjectId();
    const userModel = {
      findById: jest
        .fn()
        .mockReturnValueOnce(queryMock({ _id: currentUserId, full_name: 'Current' }))
        .mockReturnValueOnce(queryMock({ _id: targetUserId, full_name: 'Target' })),
    };
    const matchModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockResolvedValue({ _id: matchId }),
      aggregate: jest.fn(),
    };
    const service = new HomeService(
      userModel as any,
      {} as any,
      {} as any,
      {} as any,
      matchModel as any,
      {} as any,
    );

    const result = await service.showInterest(currentUserId.toString(), targetUserId.toString());

    expect(matchModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requester_id: currentUserId,
        receiver_id: targetUserId,
        status: 'pending',
      }),
    );
    expect(result).toEqual({ status: 'pending', matchId: matchId.toString() });
  });

  it('accepts a reverse pending match and creates a conversation', async () => {
    const currentUserId = new Types.ObjectId();
    const targetUserId = new Types.ObjectId();
    const matchId = new Types.ObjectId();
    const conversationId = new Types.ObjectId();
    const reversePendingMatch = {
      _id: matchId,
      requester_id: targetUserId,
      receiver_id: currentUserId,
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined),
    };
    const userModel = {
      findById: jest
        .fn()
        .mockReturnValueOnce(queryMock({ _id: currentUserId, full_name: 'Current' }))
        .mockReturnValueOnce(queryMock({ _id: targetUserId, full_name: 'Target', nationality: 'JP' })),
    };
    const profileModel = {
      findOne: jest.fn().mockReturnValue(queryMock({ avatar_url: 'avatar.png' })),
    };
    const matchModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(reversePendingMatch) }),
      aggregate: jest.fn(),
    };
    const conversationModel = {
      findOneAndUpdate: jest.fn().mockReturnValue(queryMock({
        _id: conversationId,
        created_at: new Date('2026-05-11T00:00:00.000Z'),
      })),
    };
    const service = new HomeService(
      userModel as any,
      profileModel as any,
      {} as any,
      {} as any,
      matchModel as any,
      conversationModel as any,
    );

    const result = await service.showInterest(currentUserId.toString(), targetUserId.toString());

    expect(reversePendingMatch.status).toBe('accepted');
    expect(reversePendingMatch.save).toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 'matched',
      matchId: matchId.toString(),
      conversation: {
        id: conversationId.toString(),
        partner: {
          id: targetUserId.toString(),
          fullName: 'Target',
          nationality: 'JP',
          avatarUrl: 'avatar.png',
        },
      },
    });
  });
});
