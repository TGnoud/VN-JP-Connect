import { Module } from '@nestjs/common';
import { AdminOnlyGuard } from '../admin-auth/admin-only.guard';
import { DatabaseModule } from '../database/database.module';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService, AdminOnlyGuard],
})
export class AdminDashboardModule {}
