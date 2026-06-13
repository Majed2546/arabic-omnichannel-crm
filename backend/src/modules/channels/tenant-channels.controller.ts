import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantId } from '../../decorators/tenant-id.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { RequirePermissions } from '../auth/auth.decorators'
import { TenantWhatsAppOnboardingDto, UpdateTenantChannelStatusDto } from './tenant-channels.dto'
import { TenantChannelsService } from './tenant-channels.service'

@RequirePermissions('channels.view')
@Controller('tenant-channels')
export class TenantChannelsController {
  constructor(
    private readonly tenantChannels: TenantChannelsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  listForCurrentTenant(@TenantId() tenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantChannels.listForCurrentTenant(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }))
  }

  @Get(':tenantId')
  getByTenantId(@Param('tenantId') tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantChannels.getByTenantId(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }))
  }

  @Post(':tenantId/whatsapp/onboarding')
  @RequirePermissions('channels.manage')
  startWhatsAppOnboarding(@Param('tenantId') tenantId: string, @Body() dto: TenantWhatsAppOnboardingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantChannels.startWhatsAppOnboarding(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id/status')
  @RequirePermissions('channels.manage')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantChannelStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantChannels.updateStatus(id, dto, user)
  }
}
