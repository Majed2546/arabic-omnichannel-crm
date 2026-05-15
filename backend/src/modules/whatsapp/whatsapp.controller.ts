import { Body, Controller, Get, Post } from '@nestjs/common'
import { DirectWhatsAppTestDto, SendWhatsAppMessageDto } from './whatsapp-send.dto'
import { WhatsAppSendService } from './whatsapp-send.service'

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
  send(@Body() body: SendWhatsAppMessageDto) {
    return this.sendService.send(body)
  }

  @Post('send/test')
  sendTest(@Body() body: SendWhatsAppMessageDto) {
    return this.sendService.sendTest(body)
  }

  @Post('send/direct-test')
  sendDirectTest(@Body() body: DirectWhatsAppTestDto) {
    return this.sendService.sendDirectTest(body)
  }
}
