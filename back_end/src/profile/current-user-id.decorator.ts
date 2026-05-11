import { BadRequestException, createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const rawHeader = request.headers['x-user-id'];
    const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('x-user-id must be a valid ObjectId');
    }

    return userId;
  },
);
