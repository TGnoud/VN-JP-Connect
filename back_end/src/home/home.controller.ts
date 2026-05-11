import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { HomeService } from './home.service';

function commaList(value?: string | string[]) {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : undefined;
}

function optionalNumber(value?: string) {
  return value === undefined || value === '' ? undefined : Number(value);
}

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
    @Query('japaneseLevels') japaneseLevels?: string | string[],
    @Query('excludeUserIds') excludeUserIds?: string | string[],
    @Query('ageMin') ageMinRaw?: string,
    @Query('ageMax') ageMaxRaw?: string,
    @Query('distanceMax') distanceMaxRaw?: string,
    @Query('limit') limitRaw?: string,
  ) {
    return this.homeService.discover(userId, {
      gender,
      nationality,
      interestTagIds: commaList(interestTagIds),
      japaneseLevels: commaList(japaneseLevels),
      excludeUserIds: commaList(excludeUserIds),
      ageMin: optionalNumber(ageMinRaw),
      ageMax: optionalNumber(ageMaxRaw),
      distanceMax: optionalNumber(distanceMaxRaw),
      limit: optionalNumber(limitRaw),
    });
  }

  @Post('home/discover/:userId/interest')
  showInterest(@CurrentUserId() currentUserId: string, @Param('userId') userId: string) {
    return this.homeService.showInterest(currentUserId, userId);
  }

  @Get('home/nav-summary')
  getNavSummary(@CurrentUserId() userId: string) {
    return this.homeService.getNavSummary(userId);
  }
}

