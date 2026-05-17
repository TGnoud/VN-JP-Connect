import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetController } from './password-reset/password-reset.controller';
import { PasswordResetService } from './password-reset/password-reset.service';
import { ResendMailService } from './password-reset/resend-mail.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, PasswordResetController],
  providers: [AuthService, PasswordResetService, ResendMailService],
})
export class AuthModule {}

