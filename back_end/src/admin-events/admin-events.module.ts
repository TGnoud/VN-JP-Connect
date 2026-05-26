import { Module } from '@nestjs/common';
import { AdminOnlyGuard } from '../admin-auth/admin-only.guard';
import { DatabaseModule } from '../database/database.module';
import { AdminEventsController } from './admin-events.controller';
import { AdminEventsService } from './admin-events.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminEventsController],
  providers: [AdminEventsService, AdminOnlyGuard],
})
export class AdminEventsModule {}
