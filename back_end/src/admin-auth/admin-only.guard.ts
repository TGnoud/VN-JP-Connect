import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../database/schemas';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const userId = this.userIdFromHeaders(request.headers);
    const user = await this.userModel
      .findById(new Types.ObjectId(userId))
      .select({ role: 1, status: 1 })
      .lean()
      .exec();

    if (!user) {
      throw new UnauthorizedException('user was not found');
    }

    if (user.status === 'frozen') {
      throw new ForbiddenException('admin access is not allowed');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenException('admin access is required');
    }

    return true;
  }

  private userIdFromHeaders(
    headers: Record<string, string | string[] | undefined>,
  ) {
    const rawHeader = headers['x-user-id'];
    const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('x-user-id must be a valid ObjectId');
    }

    return userId;
  }
}
