import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  listUsers(
    @CurrentUserId() _currentUserId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.adminUsersService.listUsers(query);
  }

  @Get('reports')
  listReports(
    @CurrentUserId() _currentUserId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.adminUsersService.listReports(query);
  }

  @Patch('reports/:reportId')
  updateReport(
    @CurrentUserId() _currentUserId: string,
    @Param('reportId') reportId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.adminUsersService.updateReport(reportId, body ?? {});
  }

  @Get(':userId')
  getUserDetail(
    @CurrentUserId() _currentUserId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminUsersService.getUserDetail(userId);
  }

  @Patch(':userId/status')
  updateUserStatus(
    @CurrentUserId() _currentUserId: string,
    @Param('userId') userId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.adminUsersService.updateUserStatus(userId, body ?? {});
  }
}
