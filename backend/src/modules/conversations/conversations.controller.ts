import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common'
import { ConversationService } from './conversation.service'
import { CreateConversationDto, ListConversationsQueryDto } from './dto'

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversations: ConversationService) {}

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.conversations.list(tenantId, query)
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string) {
    return this.conversations.findById(tenantId, id)
  }

  @Post()
  create(@Body() dto: CreateConversationDto) {
    return this.conversations.create(dto)
  }
}
