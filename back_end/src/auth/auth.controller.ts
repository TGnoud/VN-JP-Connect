import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { AuthService } from './auth.service';
import {
  validateLoginBody,
  validateRegisterBody,
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

  @Get('me')
  getMe(@CurrentUserId() currentUserId: string) {
    return this.authService.getMe(currentUserId);
  }

  @Post('presence')
  updatePresence(@CurrentUserId() currentUserId: string) {
    return this.authService.updatePresence(currentUserId);
  }

  @Post('logout')
  logout(@CurrentUserId() currentUserId: string) {
    return this.authService.logout(currentUserId);
  }
}

