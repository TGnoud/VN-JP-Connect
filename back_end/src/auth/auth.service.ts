import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Profile,
  ProfileDocument,
  RegisterOtp,
  RegisterOtpDocument,
  User,
  UserDocument,
} from '../database/schemas';
import { hashPassword, verifyPassword } from './password';
import { LoginInput, RegisterInput, SendRegisterOtpInput } from './auth.validation';
import {
  FALLBACK_DEV_PEPPER,
  OTP_TTL_MINUTES,
  OTP_TTL_MS,
} from './password-reset/password-reset.constants';
import {
  generateNumericOtp,
  hashOtp,
  safeEqualHex,
} from './password-reset/password-reset.crypto';
import {
  MailTransportNotConfiguredError,
  ResendMailService,
  ResendRequestFailedError,
} from './password-reset/resend-mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(RegisterOtp.name)
    private readonly registerOtpModel: Model<RegisterOtpDocument>,
    private readonly mail: ResendMailService,
  ) {}

  private pepper(): string {
    const value = process.env.PASSWORD_RESET_SECRET?.trim();

    if (!value || value.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new HttpException(
          'Registration verification is currently unavailable.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return FALLBACK_DEV_PEPPER;
    }

    return value;
  }

  async sendRegisterOtp(input: SendRegisterOtpInput) {
    const existingEmail = await this.userModel
      .findOne({ email: input.email })
      .select('_id')
      .lean()
      .exec();
    if (existingEmail) {
      throw new ConflictException('email is already in use');
    }

    let otpCreated = false;
    try {
      await this.registerOtpModel.deleteMany({ email: input.email }).exec();

      const otp = generateNumericOtp();
      await this.registerOtpModel.create({
        email: input.email,
        otp_hash: hashOtp(this.pepper(), input.email, otp),
        expires_at: new Date(Date.now() + OTP_TTL_MS),
        created_at: new Date(),
      });
      otpCreated = true;

      await this.mail.sendRegisterOtpMail({
        to: input.email,
        otp,
        otpTtlMinutes: OTP_TTL_MINUTES,
      });

      return {
        ok: true as const,
        message: 'Verification code sent.',
      };
    } catch (err) {
      if (otpCreated) {
        await this.registerOtpModel
          .deleteMany({ email: input.email })
          .exec()
          .catch(() => undefined);
      }

      if (err instanceof HttpException) {
        throw err;
      }

      if (
        err instanceof MailTransportNotConfiguredError ||
        err instanceof ResendRequestFailedError
      ) {
        this.logger.warn(`Registration OTP mail failure for ${input.email}: ${String(err)}`);
        throw new HttpException(
          'Registration verification email failed. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      this.logger.error(`Registration OTP pipeline crashed for ${input.email}`, err as Error);
      throw new HttpException(
        'Registration verification email failed. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

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

    const otpRow = await this.registerOtpModel
      .findOne({ email: input.email })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    if (!otpRow || otpRow.expires_at <= new Date()) {
      throw new BadRequestException('otp is expired; please request a new code');
    }

    const actualOtpHash = hashOtp(this.pepper(), input.email, input.otp);
    if (!safeEqualHex(otpRow.otp_hash, actualOtpHash)) {
      throw new BadRequestException('otp is invalid');
    }

    const user = await this.userModel.create({
      email: input.email,
      phone_number: input.phoneNumber,
      password_hash: hashPassword(input.password),
      full_name: input.fullName,
      nationality: input.nationality,
      birth_date: input.birthDate,
      is_verified: true,
      created_at: new Date(),
    });

    await this.registerOtpModel.deleteMany({ email: input.email }).exec();

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

    if (user.status === 'frozen') {
      throw new UnauthorizedException('account is frozen');
    }

    // This project uses x-user-id header auth. FE should store this userId.
    return {
      userId: user._id.toString(),
    };
  }

  async getMe(currentUserId: string) {
    const userObjectId = this.objectIdFromParam(currentUserId, 'currentUserId');
    const user = await this.userModel.findById(userObjectId).lean().exec();

    if (!user) {
      throw new UnauthorizedException('user was not found');
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.full_name,
      nationality: user.nationality,
      status: user.status ?? 'active',
      role: user.role ?? 'customer',
    };
  }

  async updatePresence(currentUserId: string) {
    const userObjectId = this.objectIdFromParam(currentUserId, 'currentUserId');
    const lastSeenAt = new Date();
    const user = await this.userModel
      .findByIdAndUpdate(
        userObjectId,
        { $set: { last_seen_at: lastSeenAt } },
        { returnDocument: 'after' },
      )
      .lean()
      .exec();

    if (!user) {
      throw new BadRequestException('user was not found');
    }

    return {
      ok: true,
      lastSeenAt,
    };
  }

  async logout(currentUserId: string) {
    const userObjectId = this.objectIdFromParam(currentUserId, 'currentUserId');
    const result = await this.userModel
      .updateOne({ _id: userObjectId }, { $unset: { last_seen_at: '' } })
      .exec();

    if ((result.matchedCount ?? 0) === 0) {
      throw new BadRequestException('user was not found');
    }

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

  private objectIdFromParam(value: string, name: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${name} must be a valid ObjectId`);
    }

    return new Types.ObjectId(value);
  }
}

