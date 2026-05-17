import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { AdminEventsService } from './admin-events.service';

const COVER_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];
const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function coverImageFilter(
  _request: unknown,
  file: { mimetype: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!COVER_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    callback(new BadRequestException('unsupported cover image type'), false);
    return;
  }

  callback(null, true);
}

@Controller('admin/events')
export class AdminEventsController {
  constructor(private readonly adminEventsService: AdminEventsService) {}

  @Get()
  listEvents(@CurrentUserId() _currentUserId: string) {
    return this.adminEventsService.listEvents();
  }

  @Post()
  createEvent(
    @CurrentUserId() currentUserId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.adminEventsService.createEvent(currentUserId, body ?? {});
  }

  @Post('cover-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: COVER_IMAGE_MAX_BYTES },
      fileFilter: coverImageFilter,
    }),
  )
  uploadCoverImage(
    @CurrentUserId() _currentUserId: string,
    @UploadedFile() file: any,
  ) {
    return this.adminEventsService.uploadCoverImage(file);
  }

  @Patch(':eventId')
  updateEvent(
    @CurrentUserId() _currentUserId: string,
    @Param('eventId') eventId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.adminEventsService.updateEvent(eventId, body ?? {});
  }

  @Delete(':eventId')
  deleteEvent(
    @CurrentUserId() _currentUserId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.adminEventsService.deleteEvent(eventId);
  }
}
