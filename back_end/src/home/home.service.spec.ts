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
    const service = new HomeService(
      userModel as any,
      profileModel as any,
      userInterestModel as any,
      tagModel as any,
      matchModel as any,
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
});
