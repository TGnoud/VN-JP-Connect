import { Types } from 'mongoose';
import { HomeService } from './home.service';

function queryMock<T>(value: T) {
  return {
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('HomeService', () => {
  it('returns discover users even when a profile document is missing', async () => {
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

    expect(result).toEqual([
      expect.objectContaining({
        id: targetUserId.toString(),
        fullName: 'New User',
        likeRate: 100,
        connectionsCount: 0,
        bio: '',
        photos: [],
      }),
    ]);
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
