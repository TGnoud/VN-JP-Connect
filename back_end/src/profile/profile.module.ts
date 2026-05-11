import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  ProfileController,
  ProfileOptionsController,
  TagsController,
} from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfileController, ProfileOptionsController, TagsController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
