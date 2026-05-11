import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  validateForgotPasswordBody,
  validateLoginBody,
  validateRegisterBody,
  validateResetPasswordBody,
} from './auth.validation';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.authService.register(validateRegisterBody(body));
  }

  @Post('login')
  login(@Body() body: unknown) {
    return this.authService.login(validateLoginBody(body));
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: unknown) {
    return this.authService.forgotPassword(validateForgotPasswordBody(body));
  }

  @Post('reset-password')
  resetPassword(@Body() body: unknown) {
    return this.authService.resetPassword(validateResetPasswordBody(body));
  }
}

