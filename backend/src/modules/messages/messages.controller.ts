import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CreateMessageDto, ListMessagesQueryDto, UpdateMessageStatusDto } from './dto'
import { MessageService } from './message.service'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('inbox.view')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messages: MessageService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('unread-counts')
  unreadCounts(@Headers('x-tenant-id') tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.messages.fetchUnreadCounts(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }))
  }

  @Get(':conversationId')
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messages.fetchConversationMessages(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), conversationId, query)
  }

  @Post()
  @RequirePermissions('inbox.reply')
  create(@Body() dto: CreateMessageDto, @Headers('x-tenant-id') tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    const scopedTenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId: dto.tenantId ?? tenantId, user })
    return this.messages.create({ ...dto, tenantId: scopedTenantId })
  }

  @Patch(':id/status')
  @RequirePermissions('inbox.reply')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateMessageStatusDto, @Headers('x-tenant-id') tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    const scopedTenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId: dto.tenantId ?? tenantId, user })
    return this.messages.updateStatus(id, { ...dto, tenantId: scopedTenantId })
  }
}
