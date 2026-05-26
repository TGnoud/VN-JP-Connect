import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminOnlyGuard } from '../admin-auth/admin-only.guard';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AdminOnlyGuard)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  getDashboard(
    @CurrentUserId() _currentUserId: string,
    @Query('range') range?: string,
  ) {
    return this.adminDashboardService.getDashboard(range);
  }
}
