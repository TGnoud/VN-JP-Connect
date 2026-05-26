import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AdminOnlyGuard } from './admin-only.guard';

function queryMock(value: unknown) {
  const query = {
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(value),
  };
  return query;
}

function contextWithUserId(userId?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: userId ? { 'x-user-id': userId } : {},
      }),
    }),
  } as any;
}

describe('AdminOnlyGuard', () => {
  it('allows active admin users', async () => {
    const userId = new Types.ObjectId().toString();
    const guard = new AdminOnlyGuard({
      findById: jest.fn().mockReturnValue(
        queryMock({
          _id: userId,
          status: 'active',
          role: 'admin',
        }),
      ),
    } as any);

    await expect(guard.canActivate(contextWithUserId(userId))).resolves.toBe(
      true,
    );
  });

  it('rejects customer users', async () => {
    const userId = new Types.ObjectId().toString();
    const guard = new AdminOnlyGuard({
      findById: jest.fn().mockReturnValue(
        queryMock({
          _id: userId,
          status: 'active',
          role: 'customer',
        }),
      ),
    } as any);

    await expect(guard.canActivate(contextWithUserId(userId))).rejects.toThrow(
      new ForbiddenException('admin access is required'),
    );
  });

  it('rejects frozen admin users', async () => {
    const userId = new Types.ObjectId().toString();
    const guard = new AdminOnlyGuard({
      findById: jest.fn().mockReturnValue(
        queryMock({
          _id: userId,
          status: 'frozen',
          role: 'admin',
        }),
      ),
    } as any);

    await expect(guard.canActivate(contextWithUserId(userId))).rejects.toThrow(
      new ForbiddenException('admin access is not allowed'),
    );
  });

  it('keeps missing and invalid x-user-id errors explicit', async () => {
    const guard = new AdminOnlyGuard({} as any);

    await expect(guard.canActivate(contextWithUserId())).rejects.toThrow(
      new UnauthorizedException('Missing x-user-id header'),
    );
    await expect(guard.canActivate(contextWithUserId('invalid'))).rejects.toThrow(
      new BadRequestException('x-user-id must be a valid ObjectId'),
    );
  });
});
