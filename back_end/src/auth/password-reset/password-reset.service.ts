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
import { hashPassword } from '../password';
import type { UserDocument } from '../../database/schemas';
import { User } from '../../database/schemas';
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
import { PrismaService } from '../../prisma/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly mail: ResendMailService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  onModuleInit() {
    const pepper = process.env.PASSWORD_RESET_SECRET?.trim();
    if (
      process.env.NODE_ENV === 'production' &&
      (!pepper || pepper.length < 32)
    ) {
      throw new Error(
        'PASSWORD_RESET_SECRET must be set to a strong secret (≥32 chars) in production.',
      );
    }

    if (!pepper || pepper.length < 32) {
      this.logger.warn(
        `PASSWORD_RESET_SECRET is weak or unset — falling back to dev pepper "${FALLBACK_DEV_PEPPER}".`,
      );
    }

    if (passwordResetUsesLogOnlyMail()) {
      this.logger.warn(
        'PASSWORD_RESET_MAIL_MODE=log — OTPs are printed to this console (no outbound email).',
      );
    }
  }

  private pepper(): string {
    const p = process.env.PASSWORD_RESET_SECRET?.trim();
    if (!p || p.length < 32) {
      return FALLBACK_DEV_PEPPER;
    }
    return p;
  }

  /**
   * Acknowledge generically even for unknown inboxes; only real accounts receive OTP + mail.
   * (Per product choice: no server-side send throttle — easier QA on /forgot-password.)
   */
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

      await this.prisma.passwordResetOtp.deleteMany({
        where: { email: input.email },
      });

      const otp = generateNumericOtp();
      const otpHashValue = hashOtp(this.pepper(), input.email, otp);
      await this.prisma.passwordResetOtp.create({
        data: {
          email: input.email,
          otpHash: otpHashValue,
          expiresAt: new Date(now + OTP_TTL_MS),
        },
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
        await this.prisma.passwordResetOtp
          .deleteMany({ where: { email: input.email } })
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
    const otpRow = await this.prisma.passwordResetOtp.findFirst({
      where: { email: input.email },
      orderBy: { createdAt: 'desc' },
    });

    const nowDate = new Date();

    if (!otpRow || otpRow.expiresAt <= nowDate) {
      throw new BadRequestException(PasswordResetMessages.expiredOtp);
    }

    const expectedHex = otpRow.otpHash;
    const actualHex = hashOtp(this.pepper(), input.email, input.otp);
    if (!safeEqualHex(expectedHex, actualHex)) {
      throw new BadRequestException(PasswordResetMessages.wrongOtp);
    }

    const plaintextToken = generateResetToken();
    const tokenDigest = hashResetToken(this.pepper(), input.email, plaintextToken);

    const sessionExpiry = new Date(Date.now() + RESET_SESSION_TTL_MS);

    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetOtp.deleteMany({ where: { email: input.email } });
      await tx.passwordResetSession.deleteMany({
        where: { email: input.email },
      });
      await tx.passwordResetSession.create({
        data: {
          email: input.email,
          tokenHash: tokenDigest,
          expiresAt: sessionExpiry,
        },
      });
    });

    return {
      ok: true as const,
      resetToken: plaintextToken,
      resetSessionExpiresAt: sessionExpiry.toISOString(),
    };
  }

  async completeReset(input: CompleteResetBody) {
    const hashedIncoming = hashResetToken(this.pepper(), input.email, input.resetToken);

    const session = await this.prisma.passwordResetSession.findFirst({
      where: {
        email: input.email,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!session || !safeEqualHex(session.tokenHash, hashedIncoming)) {
      throw new BadRequestException(PasswordResetMessages.invalidOrExpiredResetSession);
    }

    const user = await this.userModel.findOne({ email: input.email }).exec();
    if (!user) {
      throw new BadRequestException(PasswordResetMessages.invalidOrExpiredResetSession);
    }

    await this.prisma.passwordResetSession.delete({
      where: { id: session.id },
    });

    user.password_hash = hashPassword(input.newPassword);
    user.reset_code = undefined;
    user.reset_code_expires_at = undefined;
    await user.save();

    return { ok: true as const };
  }
}
