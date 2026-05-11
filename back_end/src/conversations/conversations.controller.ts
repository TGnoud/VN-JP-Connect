import { Controller, Param, Post } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('with/:userId')
  openWithUser(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string,
  ) {
    return this.conversationsService.openWithUser(currentUserId, userId);
  }
}
