import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ProfileImageStorageService } from '../profile/profile-image-storage.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, ProfileImageStorageService],
})
export class UsersModule {}
