import { Body, Controller, Get, Post } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'
import { DirectWhatsAppTestDto, SendWhatsAppMessageDto } from './whatsapp-send.dto'
import { WhatsAppSendService } from './whatsapp-send.service'

@RequirePermissions('channels.view')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly sendService: WhatsAppSendService) {}

  @Get('status')
  getStatus() {
    return {
      module: 'whatsapp',
      cloudApiReady: false,
      embeddedSignupReady: false,
      webhookEngineReady: true,
    }
  }

  @Post('send')
  @RequirePermissions('inbox.reply')
  send(@Body() body: SendWhatsAppMessageDto) {
    return this.sendService.send(body)
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
