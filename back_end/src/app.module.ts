import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AppService } from './app.service';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';

@Module({
  imports: [DatabaseModule, ProfileModule, AuthModule, HomeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
