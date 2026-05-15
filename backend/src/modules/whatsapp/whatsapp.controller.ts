import { Controller, Get } from '@nestjs/common'

@Controller('whatsapp')
export class WhatsAppController {
  @Get('status')
  getStatus() {
    return {
      module: 'whatsapp',
      cloudApiReady: false,
      embeddedSignupReady: false,
      webhookEngineReady: true,
    }
  }
}
