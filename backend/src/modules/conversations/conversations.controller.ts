import { Body, Controller, Get, Headers, Param, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ConversationService } from './conversation.service'
import { CreateConversationDto, ListConversationsQueryDto } from './dto'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('inbox.view')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(
    @Headers('x-tenant-id') tenantId: string,
    @Query() query: ListConversationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.conversations.list(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.conversations.findById(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }

  @Post()
  @RequirePermissions('customers.manage')
  create(@Body() dto: CreateConversationDto, @Headers('x-tenant-id') tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    const scopedTenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId: dto.tenantId ?? tenantId, user })
    return this.conversations.create({ ...dto, tenantId: scopedTenantId })
  }
}
