import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantId } from '../../decorators/tenant-id.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { TenantChannelsService } from '../channels/tenant-channels.service'
import { UpdateTenantWhatsAppStatusDto } from '../channels/tenant-channels.dto'

@RequirePermissions('channels.view')
@Controller('tenant-channels/whatsapp')
export class TenantWhatsAppOnboardingController {
  constructor(
    private readonly config: ConfigService,
    private readonly tenantChannels: TenantChannelsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('status')
  async getStatus(@TenantId() tenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    const accessToken = this.config.get<string>('whatsapp.accessToken')
    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId')
    const businessAccountId = this.config.get<string>('whatsapp.businessAccountId')
    const resolvedTenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user })
    const tenantStatus = await this.tenantChannels.getWhatsAppStatus(resolvedTenantId)

    return {
      channel: 'whatsapp',
      cloudApiReady: Boolean(accessToken && phoneNumberId && businessAccountId),
      embeddedSignupReady: false,
      webhookEngineReady: true,
      connectionStatus: tenantStatus.status,
      tenantStatus,
      mode: 'placeholder',
    }
  }

  @Patch('status')
  @RequirePermissions('channels.manage')
  updateStatus(
    @TenantId() tenantId: string | undefined,
    @Body() dto: UpdateTenantWhatsAppStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const resolvedTenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user })
    return this.tenantChannels.updateWhatsAppStatus(resolvedTenantId, dto.status, dto.notes)
  }

  @Post('onboarding-request')
  createOnboardingRequest(@Body() body: Record<string, unknown>) {
    return {
      accepted: true,
      stored: false,
      mode: 'placeholder',
      message: 'WhatsApp onboarding request placeholder accepted. No secrets or access tokens were stored.',
      receivedFields: Object.keys(body ?? {}),
    }
  }

  @Post('embedded-signup/start')
  startEmbeddedSignup() {
    return {
      ready: false,
      embeddedSignupReady: false,
      mode: 'placeholder',
      message: 'Meta Embedded Signup will be enabled after App Review and production app configuration.',
    }
  }

  @Post('embedded-signup/callback')
  embeddedSignupCallback(@Body() body: Record<string, unknown>) {
    return {
      accepted: true,
      storedTokens: false,
      mode: 'placeholder',
      message: 'Embedded Signup callback placeholder received. Token exchange is not implemented yet.',
      receivedFields: Object.keys(body ?? {}),
    }
  }
}
