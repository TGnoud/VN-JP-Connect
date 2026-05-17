import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AdminEventsController } from './admin-events.controller';
import { AdminEventsService } from './admin-events.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminEventsController],
  providers: [AdminEventsService],
})
export class AdminEventsModule {}
