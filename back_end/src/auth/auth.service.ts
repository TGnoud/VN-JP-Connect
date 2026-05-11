import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument, User, UserDocument } from '../database/schemas';
import { hashPassword, verifyPassword } from './password';
import { LoginInput, RegisterInput } from './auth.validation';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.userModel.findOne({ email: input.email }).lean().exec();
    if (existing) {
      throw new ConflictException('email is already in use');
    }

    const user = await this.userModel.create({
      email: input.email,
      phone_number: input.phoneNumber,
      password_hash: hashPassword(input.password),
      full_name: input.fullName,
      nationality: input.nationality,
      is_verified: false,
      created_at: new Date(),
    });

    // Ensure the profile exists for downstream screens.
    await this.profileModel
      .updateOne(
        { user_id: user._id },
        {
          $setOnInsert: {
            user_id: user._id,
            location: '',
            occupation: '',
            education: '',
            bio: '',
            avatar_url: '',
            cover_url: '',
            social_links: { instagram: '', facebook: '', line: '' },
            languages: [],
            photos: [],
            updated_at: new Date(),
          },
        },
        { upsert: true },
      )
      .exec();

    return {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.full_name,
      nationality: user.nationality,
      createdAt: user.created_at,
    };
  }

  async login(input: LoginInput) {
    const user = await this.userModel.findOne({ email: input.email }).exec();
    if (!user) {
      throw new UnauthorizedException('invalid credentials');
    }

    if (!verifyPassword(input.password, user.password_hash)) {
      throw new UnauthorizedException('invalid credentials');
    }

    // This project uses x-user-id header auth. FE should store this userId.
    return {
      userId: user._id.toString(),
    };
  }
}

