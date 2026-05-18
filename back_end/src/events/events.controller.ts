import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  listEvents(
    @CurrentUserId() currentUserId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.eventsService.listEvents(currentUserId, {
      search: search ?? '',
      category: category ?? '',
    });
  }

  @Get(':eventId')
  getEvent(
    @CurrentUserId() currentUserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.getEvent(currentUserId, eventId);
  }

  @Post(':eventId/participants')
  joinEvent(
    @CurrentUserId() currentUserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.joinEvent(currentUserId, eventId);
  }

  @Delete(':eventId/participants')
  leaveEvent(
    @CurrentUserId() currentUserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.leaveEvent(currentUserId, eventId);
  }

  @Post(':eventId/bookmark')
  bookmarkEvent(
    @CurrentUserId() currentUserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.bookmarkEvent(currentUserId, eventId);
  }

  @Delete(':eventId/bookmark')
  unbookmarkEvent(
    @CurrentUserId() currentUserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventsService.unbookmarkEvent(currentUserId, eventId);
  }
}
