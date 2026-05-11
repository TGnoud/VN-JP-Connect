import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { HomeService } from './home.service';

@Controller()
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * Filter metadata for the Home/Discover screen.
   */
  @Get('home/filters')
  getFilters() {
    return this.homeService.getFilterOptions();
  }

  /**
   * Discover cards for Home screen.
   * This project uses x-user-id header auth (see CurrentUserId).
   */
  @Get('home/discover')
  discover(
    @CurrentUserId() userId: string,
    @Query('gender') gender?: string,
    @Query('nationality') nationality?: string,
    @Query('interestTagIds') interestTagIds?: string | string[],
    @Query('limit') limitRaw?: string,
  ) {
    const parsedLimit = limitRaw ? Number(limitRaw) : undefined;
    const normalizedInterestTagIds =
      typeof interestTagIds === 'string'
        ? interestTagIds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : Array.isArray(interestTagIds)
          ? interestTagIds
          : undefined;

    return this.homeService.discover(userId, {
      gender,
      nationality,
      interestTagIds: normalizedInterestTagIds,
      limit: parsedLimit,
    });
  }
}

