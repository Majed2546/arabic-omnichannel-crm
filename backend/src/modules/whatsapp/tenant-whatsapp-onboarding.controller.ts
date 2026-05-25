import { Body, Controller, Get, Post } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('channels.view')
@Controller('tenant-channels/whatsapp')
export class TenantWhatsAppOnboardingController {
  constructor(private readonly config: ConfigService) {}

  @Get('status')
  getStatus() {
    const accessToken = this.config.get<string>('whatsapp.accessToken')
    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId')
    const businessAccountId = this.config.get<string>('whatsapp.businessAccountId')

    return {
      channel: 'whatsapp',
      cloudApiReady: Boolean(accessToken && phoneNumberId && businessAccountId),
      embeddedSignupReady: false,
      webhookEngineReady: true,
      connectionStatus: accessToken && phoneNumberId && businessAccountId ? 'CONNECTED' : 'DISCONNECTED',
      mode: 'placeholder',
    }
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
