import { Types } from 'mongoose';
import { ONLINE_PRESENCE_WINDOW_MS } from '../auth/presence';
import { UsersService } from './users.service';

function queryMock<T>(value: T) {
  return {
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
}

function countMock(value: number) {
  return {
    exec: jest.fn().mockResolvedValue(value),
  };
}

describe('UsersService', () => {
  it.each([
    ['recent heartbeat', new Date(), true],
    [
      'stale heartbeat',
      new Date(Date.now() - ONLINE_PRESENCE_WINDOW_MS - 1000),
      false,
    ],
  ])('returns public profile online state for %s', async (_label, lastSeenAt, isOnline) => {
    const currentUserId = new Types.ObjectId().toString();
    const targetUserId = new Types.ObjectId();
    const userModel = {
      findById: jest.fn().mockReturnValue(queryMock({
        _id: targetUserId,
        full_name: 'Tanaka Hiroshi',
        nationality: 'JP',
        birth_date: new Date('2000-01-01T00:00:00.000Z'),
        created_at: new Date('2026-05-20T00:00:00.000Z'),
        last_seen_at: lastSeenAt,
      })),
      exists: jest.fn(),
    };
    const profileModel = {
      findOne: jest.fn().mockReturnValue(queryMock({
        user_id: targetUserId,
        languages: [],
        photos: [],
        bio: '',
        updated_at: new Date('2026-05-20T00:00:00.000Z'),
      })),
    };
    const userInterestModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const tagModel = {
      find: jest.fn().mockReturnValue(queryMock([])),
    };
    const matchModel = {
      countDocuments: jest.fn().mockReturnValue(countMock(2)),
    };
    const service = new UsersService(
      userModel as any,
      profileModel as any,
      userInterestModel as any,
      tagModel as any,
      matchModel as any,
      {} as any,
      {} as any,
    );

    const result = await service.getPublicProfile(
      currentUserId,
      targetUserId.toString(),
    );

    expect(result).toMatchObject({
      id: targetUserId.toString(),
      fullName: 'Tanaka Hiroshi',
      isOnline,
    });
  });
});
