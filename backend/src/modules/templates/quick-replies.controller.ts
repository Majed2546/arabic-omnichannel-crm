import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ListQuickRepliesQueryDto, SaveQuickReplyDto } from './dto'
import { TemplatesService } from './templates.service'

@RequirePermissions('templates.view')
@Controller('quick-replies')
export class QuickRepliesController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListQuickRepliesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.listQuickReplies(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Post()
  @RequirePermissions('templates.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: SaveQuickReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.createQuickReply(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id')
  @RequirePermissions('templates.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveQuickReplyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.templates.updateQuickReply(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('templates.manage')
  setActive(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: { isActive: boolean },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.templates.setQuickReplyActive(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, Boolean(dto.isActive))
  }
}
