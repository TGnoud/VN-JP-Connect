import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { USER_REPORT_REASONS, UserReportReason } from '../database/schemas';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import {
  REPORT_EVIDENCE_MAX_BYTES,
  REPORT_EVIDENCE_MAX_FILES,
  REPORT_EVIDENCE_MIME_TYPES,
  UsersService,
} from './users.service';

function evidenceFileFilter() {
  return (_request: unknown, file: { mimetype: string }, callback: Function) => {
    if (!REPORT_EVIDENCE_MIME_TYPES.includes(file.mimetype)) {
      callback(new BadRequestException('unsupported evidence file type'), false);
      return;
    }

    callback(null, true);
  };
}

function validateReportBody(body: unknown) {
  const value = (body ?? {}) as Record<string, unknown>;
  const reason = typeof value.reason === 'string' ? value.reason : '';
  const detail = typeof value.detail === 'string' ? value.detail.trim() : '';

  if (!USER_REPORT_REASONS.includes(reason as UserReportReason)) {
    throw new BadRequestException('reason is invalid');
  }

  return {
    reason: reason as UserReportReason,
    detail,
  };
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':userId/profile')
  getPublicProfile(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string,
  ) {
    return this.usersService.getPublicProfile(currentUserId, userId);
  }

  @Post(':userId/report')
  @UseInterceptors(
    FilesInterceptor('evidence', REPORT_EVIDENCE_MAX_FILES, {
      limits: { fileSize: REPORT_EVIDENCE_MAX_BYTES },
      fileFilter: evidenceFileFilter(),
    }),
  )
  reportUser(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
    @UploadedFiles() files: any[],
  ) {
    return this.usersService.reportUser(
      currentUserId,
      userId,
      validateReportBody(body),
      files ?? [],
    );
  }
}
