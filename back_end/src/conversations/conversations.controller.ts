import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUserId } from '../profile/current-user-id.decorator';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listConversations(
    @CurrentUserId() currentUserId: string,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.listConversations(
      currentUserId,
      search ?? '',
    );
  }

  @Get('matched-users')
  getMatchedUsers(@CurrentUserId() currentUserId: string) {
    return this.conversationsService.getMatchedUsers(currentUserId);
  }

  @Post('groups')
  createGroup(
    @CurrentUserId() currentUserId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.conversationsService.createGroup(currentUserId, body ?? {});
  }

  @Post('translate')
  translate(@Body() body?: Record<string, unknown>) {
    return this.conversationsService.translate(body ?? {});
  }

  @Post('with/:userId')
  openWithUser(
    @CurrentUserId() currentUserId: string,
    @Param('userId') userId: string,
  ) {
    return this.conversationsService.openWithUser(currentUserId, userId);
  }

  @Get(':conversationId/messages')
  getMessages(
    @CurrentUserId() currentUserId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.conversationsService.getMessages(
      currentUserId,
      conversationId,
      {
        limit,
        before,
      },
    );
  }

  @Post(':conversationId/messages')
  sendMessage(
    @CurrentUserId() currentUserId: string,
    @Param('conversationId') conversationId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.conversationsService.sendMessage(
      currentUserId,
      conversationId,
      body ?? {},
    );
  }

  @Post(':conversationId/read')
  markRead(
    @CurrentUserId() currentUserId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversationsService.markRead(currentUserId, conversationId);
  }

  @Post(':conversationId/favorite-feedback')
  submitFavoriteFeedback(
    @CurrentUserId() currentUserId: string,
    @Param('conversationId') conversationId: string,
    @Body() body?: Record<string, unknown>,
  ) {
    return this.conversationsService.submitFavoriteFeedback(
      currentUserId,
      conversationId,
      body ?? {},
    );
  }
}
