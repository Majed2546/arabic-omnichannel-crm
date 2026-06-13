import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RequirePermissions } from '../auth/auth.decorators'
import { DirectWhatsAppTestDto, SendWhatsAppMessageDto } from './whatsapp-send.dto'
import { WhatsAppSendService } from './whatsapp-send.service'

@RequirePermissions('channels.view')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(
    private readonly sendService: WhatsAppSendService,
    private readonly config: ConfigService,
  ) {}

  @Get('status')
  getStatus() {
    const accessToken = this.config.get<string>('whatsapp.accessToken')
    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId')
    const businessAccountId = this.config.get<string>('whatsapp.businessAccountId')

    return {
      module: 'whatsapp',
      cloudApiReady: Boolean(accessToken && phoneNumberId && businessAccountId),
      embeddedSignupReady: false,
      webhookEngineReady: true,
      diagnostics: {
        accessToken: maskSecret(accessToken),
        phoneNumberId: maskSecret(phoneNumberId),
        businessAccountId: maskSecret(businessAccountId),
      },
    }
  }

  @Post('send')
  @RequirePermissions('inbox.reply')
  send(@Body() body: SendWhatsAppMessageDto) {
    return this.sendService.send(body)
  }

  @Get('send-config/diagnostics')
  diagnostics(@Query('tenantId') tenantId?: string, @Query('conversationId') conversationId?: string) {
    return this.sendService.getSendConfigDiagnostics(tenantId, conversationId)
  }

  @Post('send/test')
  @RequirePermissions('inbox.reply')
  sendTest(@Body() body: SendWhatsAppMessageDto) {
    return this.sendService.sendTest(body)
  }

  @Post('send/direct-test')
  @RequirePermissions('inbox.reply')
  sendDirectTest(@Body() body: DirectWhatsAppTestDto) {
    return this.sendService.sendDirectTest(body)
  }
}

function maskSecret(value?: string) {
  if (!value) return { present: false }
  if (value.length <= 6) return { present: true, value: '***' }
  return { present: true, value: `${value.slice(0, 3)}...${value.slice(-3)}` }
}
