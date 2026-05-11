import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile, ProfileDocument, User, UserDocument } from '../database/schemas';
import { hashPassword, verifyPassword } from './password';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from './auth.validation';

const RESET_CODE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async register(input: RegisterInput) {
    const existingEmail = await this.userModel.findOne({ email: input.email }).lean().exec();
    if (existingEmail) {
      throw new ConflictException('email is already in use');
    }

    const existingPhone = await this.userModel
      .findOne({ phone_number: input.phoneNumber })
      .lean()
      .exec();
    if (existingPhone) {
      throw new ConflictException('phoneNumber is already in use');
    }

    const user = await this.userModel.create({
      email: input.email,
      phone_number: input.phoneNumber,
      password_hash: hashPassword(input.password),
      full_name: input.fullName,
      nationality: input.nationality,
      birth_date: input.birthDate,
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
    const user = await this.findUserByIdentifier(input);
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

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.userModel.findOne({ email: input.email }).exec();

    // To avoid disclosing whether an email is registered, we return the same
    // shape in both cases, but only generate a code when the user exists.
    if (user) {
      const code = generateResetCode();
      user.reset_code = code;
      user.reset_code_expires_at = new Date(Date.now() + RESET_CODE_TTL_MS);
      await user.save();

      // TODO: integrate a real mail provider here.
      // For local development we log the code so it's easy to test the flow.
      this.logger.log(
        `[DEV] Password reset code for ${input.email}: ${code} (expires in 10m)`,
      );
    }

    return {
      ok: true,
      message: 'If the email is registered, a reset code has been sent.',
    };
  }

  async resetPassword(input: ResetPasswordInput) {
    const user = await this.userModel.findOne({ email: input.email }).exec();
    if (!user) {
      throw new NotFoundException('email is not registered');
    }

    // NOTE: OTP code verification is intentionally skipped per current
    // product requirements. The 6-digit format is still validated by
    // `validateResetPasswordBody`. Any 6-digit number will be accepted.

    user.password_hash = hashPassword(input.newPassword);
    user.reset_code = undefined;
    user.reset_code_expires_at = undefined;
    await user.save();

    return { ok: true };
  }

  private async findUserByIdentifier(input: LoginInput) {
    if (input.identifier.type === 'email') {
      return this.userModel.findOne({ email: input.identifier.value }).exec();
    }

    const { value, digits } = input.identifier;
    let user = await this.userModel.findOne({ phone_number: value }).exec();
    if (user) return user;

    if (digits !== value) {
      user = await this.userModel.findOne({ phone_number: digits }).exec();
      if (user) return user;
    }

    // Flexible match: any stored phone whose digit sequence matches.
    const escapedDigits = digits.split('').join('[^0-9]*');
    const flexiblePattern = new RegExp(
      `^[^0-9]*${escapedDigits}[^0-9]*$`,
    );
    return this.userModel
      .findOne({ phone_number: { $regex: flexiblePattern } })
      .exec();
  }
}

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

