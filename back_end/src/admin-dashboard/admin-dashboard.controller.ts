import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
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
