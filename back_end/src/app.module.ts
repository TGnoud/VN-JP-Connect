import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AppService } from './app.service';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';
import { UsersModule } from './users/users.module';
import { ConversationsModule } from './conversations/conversations.module';
import { DevModule } from './dev/dev.module';
import { AdminEventsModule } from './admin-events/admin-events.module';

@Module({
  imports: [
    DatabaseModule,
    ProfileModule,
    AuthModule,
    HomeModule,
    UsersModule,
    ConversationsModule,
    DevModule,
    AdminEventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}