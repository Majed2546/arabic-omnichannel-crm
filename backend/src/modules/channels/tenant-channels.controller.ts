import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { TenantId } from '../../decorators/tenant-id.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import { TenantWhatsAppOnboardingDto, UpdateTenantChannelStatusDto } from './tenant-channels.dto'
import { TenantChannelsService } from './tenant-channels.service'

@RequirePermissions('channels.view')
@Controller('tenant-channels')
export class TenantChannelsController {
  constructor(private readonly tenantChannels: TenantChannelsService) {}

  @Get()
  listForCurrentTenant(@TenantId() tenantId?: string) {
    return this.tenantChannels.listForCurrentTenant(tenantId)
  }

  @Get(':tenantId')
  getByTenantId(@Param('tenantId') tenantId: string) {
    return this.tenantChannels.getByTenantId(tenantId)
  }

  @Post(':tenantId/whatsapp/onboarding')
  @RequirePermissions('channels.manage')
  startWhatsAppOnboarding(@Param('tenantId') tenantId: string, @Body() dto: TenantWhatsAppOnboardingDto) {
    return this.tenantChannels.startWhatsAppOnboarding(tenantId, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('channels.manage')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantChannelStatusDto) {
    return this.tenantChannels.updateStatus(id, dto)
  }
}
