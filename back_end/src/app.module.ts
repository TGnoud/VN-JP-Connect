import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AppService } from './app.service';
import { ProfileModule } from './profile/profile.module';

@Module({
  imports: [DatabaseModule, ProfileModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
