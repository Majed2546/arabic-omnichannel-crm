import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CreateMessageDto, ListMessagesQueryDto, UpdateMessageStatusDto } from './dto'
import { MessageService } from './message.service'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('inbox.view')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessageService) {}

  @Get('unread-counts')
  unreadCounts(@Headers('x-tenant-id') tenantId: string) {
    return this.messages.fetchUnreadCounts(tenantId)
  }

  @Get(':conversationId')
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
  ) {
    return this.messages.fetchConversationMessages(tenantId, conversationId, query)
  }

  @Post()
  @RequirePermissions('inbox.reply')
  create(@Body() dto: CreateMessageDto) {
    return this.messages.create(dto)
  }

  @Patch(':id/status')
  @RequirePermissions('inbox.reply')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMessageStatusDto) {
    return this.messages.updateStatus(id, dto)
  }
}
