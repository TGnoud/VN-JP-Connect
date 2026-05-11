import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  AVATAR_MAX_BYTES,
  AVATAR_MIME_TYPES,
  COVER_MAX_BYTES,
  COVER_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
} from './profile.constants';
import { CurrentUserId } from './current-user-id.decorator';
import { ProfileService } from './profile.service';
import {
  validateBioBody,
  validateImageUrlBody,
  validateImageUrlsBody,
  validateInterestBody,
  validateLanguagesBody,
  validatePersonalBody,
} from './profile.validation';

function imageFileFilter(allowedMimeTypes: string[]) {
  return (_request: unknown, file: { mimetype: string }, callback: Function) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new BadRequestException('unsupported image type'), false);
      return;
    }

    callback(null, true);
  };
}

@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMe(@CurrentUserId() userId: string) {
    return this.profileService.getMe(userId);
  }

  @Patch('me/personal')
  updatePersonal(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.updatePersonal(userId, validatePersonalBody(body));
  }

  @Patch('me/bio')
  updateBio(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.updateBio(userId, validateBioBody(body).bio);
  }

  @Put('me/languages')
  replaceLanguages(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.replaceLanguages(userId, validateLanguagesBody(body));
  }

  @Put('me/interests')
  replaceInterests(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.replaceInterests(userId, validateInterestBody(body));
  }

  @Post('me/photos')
  @UseInterceptors(
    FilesInterceptor('files', 9, {
      limits: { fileSize: PHOTO_MAX_BYTES },
      fileFilter: imageFileFilter(PHOTO_MIME_TYPES),
    }),
  )
  addPhotos(@CurrentUserId() userId: string, @UploadedFiles() files: any[]) {
    return this.profileService.addPhotos(userId, files);
  }

  @Post('me/photos-url')
  addPhotoUrls(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.addPhotoUrls(userId, validateImageUrlsBody(body).urls);
  }

  @Delete('me/photos/:photoId')
  deletePhoto(@CurrentUserId() userId: string, @Param('photoId') photoId: string) {
    return this.profileService.deletePhoto(userId, photoId);
  }

  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AVATAR_MAX_BYTES },
      fileFilter: imageFileFilter(AVATAR_MIME_TYPES),
    }),
  )
  updateAvatar(@CurrentUserId() userId: string, @UploadedFile() file: any) {
    return this.profileService.updateAvatar(userId, file);
  }

  @Patch('me/avatar-url')
  updateAvatarUrl(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.updateAvatarUrl(userId, validateImageUrlBody(body).url);
  }

  @Patch('me/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: COVER_MAX_BYTES },
      fileFilter: imageFileFilter(COVER_MIME_TYPES),
    }),
  )
  updateCover(@CurrentUserId() userId: string, @UploadedFile() file: any) {
    return this.profileService.updateCover(userId, file);
  }

  @Patch('me/cover-url')
  updateCoverUrl(@CurrentUserId() userId: string, @Body() body: unknown) {
    return this.profileService.updateCoverUrl(userId, validateImageUrlBody(body).url);
  }
}

@Controller('profile-options')
export class ProfileOptionsController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getOptions() {
    return this.profileService.getProfileOptions();
  }
}

@Controller('tags')
export class TagsController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  searchTags(@Query('type') type?: string, @Query('q') q?: string) {
    return this.profileService.searchTags(type, q);
  }
}
