import { Module } from '@nestjs/common';
import { AdminOnlyGuard } from '../admin-auth/admin-only.guard';
import { DatabaseModule } from '../database/database.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AdminOnlyGuard],
})
export class AdminUsersModule {}
