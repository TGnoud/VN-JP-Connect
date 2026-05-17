import { Body, Controller, Post } from '@nestjs/common';
import { PasswordResetService } from './password-reset.service';
import {
  validateCompleteResetBody,
  validateSendOtpBody,
  validateVerifyOtpBody,
} from './password-reset.validation';

@Controller('auth/password-reset')
export class PasswordResetController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  @Post('send-otp')
  sendOtp(@Body() body: unknown) {
    return this.passwordReset.sendOtp(validateSendOtpBody(body));
  }

  /** Validates OTP TTL + correctness, rotates to a privileged reset token (single-use). */
  @Post('verify-otp')
  verifyOtp(@Body() body: unknown) {
    return this.passwordReset.verifyOtp(validateVerifyOtpBody(body));
  }

  @Post('complete')
  complete(@Body() body: unknown) {
    return this.passwordReset.completeReset(validateCompleteResetBody(body));
  }
}
