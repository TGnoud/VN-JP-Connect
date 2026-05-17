import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import {
  PasswordResetOtp,
  PasswordResetOtpDocument,
  PasswordResetSession,
  PasswordResetSessionDocument,
  User,
  UserDocument,
} from '../../database/schemas';
import { hashPassword } from '../password';
import {
  FALLBACK_DEV_PEPPER,
  OTP_TTL_MS,
  OTP_TTL_MINUTES,
  PasswordResetMessages,
  RESET_SESSION_TTL_MS,
} from './password-reset.constants';
import {
  generateNumericOtp,
  generateResetToken,
  hashOtp,
  hashResetToken,
  safeEqualHex,
} from './password-reset.crypto';
import type {
  CompleteResetBody,
  SendOtpBody,
  VerifyOtpBody,
} from './password-reset.validation';
import {
  MailTransportNotConfiguredError,
  passwordResetUsesLogOnlyMail,
  ResendMailService,
  ResendRequestFailedError,
} from './resend-mail.service';

@Injectable()
export class PasswordResetService implements OnModuleInit {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly mail: ResendMailService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(PasswordResetOtp.name)
    private readonly otpModel: Model<PasswordResetOtpDocument>,
    @InjectModel(PasswordResetSession.name)
    private readonly resetSessionModel: Model<PasswordResetSessionDocument>,
  ) {}

  onModuleInit() {
    const pepper = process.env.PASSWORD_RESET_SECRET?.trim();

    if (
      process.env.NODE_ENV === 'production' &&
      (!pepper || pepper.length < 32)
    ) {
      this.logger.error(
        'PASSWORD_RESET_SECRET is missing or too short in production. Password reset endpoints will return 503 until a 32+ character secret is configured.',
      );
      return;
    }

    if (!pepper || pepper.length < 32) {
      this.logger.warn(
        `PASSWORD_RESET_SECRET is weak or unset - falling back to dev pepper "${FALLBACK_DEV_PEPPER}".`,
      );
    }

    if (passwordResetUsesLogOnlyMail()) {
      this.logger.warn(
        'PASSWORD_RESET_MAIL_MODE=log - OTPs are printed to this console (no outbound email).',
      );
    }
  }

  private pepper(): string {
    const value = process.env.PASSWORD_RESET_SECRET?.trim();

    if (!value || value.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new HttpException(
          PasswordResetMessages.passwordResetNotConfigured,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      return FALLBACK_DEV_PEPPER;
    }

    return value;
  }

  async sendOtp(input: SendOtpBody) {
    const now = Date.now();
    let otpCreated = false;

    try {
      const userExists = !!(await this.userModel
        .findOne({ email: input.email })
        .select('_id')
        .lean()
        .exec());

      const genericAck = () => ({
        ok: true as const,
        message: PasswordResetMessages.genericSendConfirmation,
      });

      if (!userExists) {
        return genericAck();
      }

      await this.otpModel.deleteMany({ email: input.email }).exec();

      const otp = generateNumericOtp();
      const otpHashValue = hashOtp(this.pepper(), input.email, otp);

      await this.otpModel.create({
        email: input.email,
        otp_hash: otpHashValue,
        expires_at: new Date(now + OTP_TTL_MS),
        created_at: new Date(now),
      });
      otpCreated = true;

      await this.mail.sendPasswordResetOtpMail({
        to: input.email,
        otp,
        otpTtlMinutes: OTP_TTL_MINUTES,
      });

      return genericAck();
    } catch (err) {
      if (otpCreated) {
        await this.otpModel
          .deleteMany({ email: input.email })
          .exec()
          .catch(() => undefined);
      }

      if (err instanceof HttpException) {
        throw err;
      }

      const messageJa = PasswordResetMessages.mailSendFailedTryLater;

      if (
        err instanceof MailTransportNotConfiguredError ||
        err instanceof ResendRequestFailedError
      ) {
        this.logger.warn(`Mail failure for ${input.email}: ${String(err)}`);
        throw new HttpException(messageJa, HttpStatus.SERVICE_UNAVAILABLE);
      }

      this.logger.error(`Mail pipeline crashed for ${input.email}`, err as Error);
      throw new HttpException(messageJa, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  async verifyOtp(input: VerifyOtpBody) {
    const otpRow = await this.otpModel
      .findOne({ email: input.email })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    const nowDate = new Date();

    if (!otpRow || otpRow.expires_at <= nowDate) {
      throw new BadRequestException(PasswordResetMessages.expiredOtp);
    }

    const expectedHex = otpRow.otp_hash;
    const actualHex = hashOtp(this.pepper(), input.email, input.otp);
    if (!safeEqualHex(expectedHex, actualHex)) {
      throw new BadRequestException(PasswordResetMessages.wrongOtp);
    }

    const plaintextToken = generateResetToken();
    const tokenDigest = hashResetToken(
      this.pepper(),
      input.email,
      plaintextToken,
    );
    const sessionExpiry = new Date(Date.now() + RESET_SESSION_TTL_MS);

    await Promise.all([
      this.otpModel.deleteMany({ email: input.email }).exec(),
      this.resetSessionModel.deleteMany({ email: input.email }).exec(),
    ]);
    await this.resetSessionModel.create({
      email: input.email,
      token_hash: tokenDigest,
      expires_at: sessionExpiry,
      created_at: new Date(),
    });

    return {
      ok: true as const,
      resetToken: plaintextToken,
      resetSessionExpiresAt: sessionExpiry.toISOString(),
    };
  }

  async completeReset(input: CompleteResetBody) {
    const hashedIncoming = hashResetToken(
      this.pepper(),
      input.email,
      input.resetToken,
    );

    const session = await this.resetSessionModel
      .findOne({
        email: input.email,
        expires_at: { $gt: new Date() },
      })
      .sort({ created_at: -1 })
      .exec();

    if (!session || !safeEqualHex(session.token_hash, hashedIncoming)) {
      throw new BadRequestException(
        PasswordResetMessages.invalidOrExpiredResetSession,
      );
    }

    const user = await this.userModel.findOne({ email: input.email }).exec();
    if (!user) {
      throw new BadRequestException(
        PasswordResetMessages.invalidOrExpiredResetSession,
      );
    }

    await this.resetSessionModel.deleteOne({ _id: session._id }).exec();

    user.password_hash = hashPassword(input.newPassword);
    user.reset_code = undefined;
    user.reset_code_expires_at = undefined;
    await user.save();

    return { ok: true as const };
  }
}
