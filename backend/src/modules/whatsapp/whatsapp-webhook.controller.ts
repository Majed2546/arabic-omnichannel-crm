import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common'
import { Public } from '../auth/auth.decorators'
import { WhatsAppWebhookService } from './whatsapp-webhook.service'
import type { WhatsAppWebhookPayload } from './whatsapp.types'

@Public()
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  constructor(private readonly webhookService: WhatsAppWebhookService) {}

  @Get()
  verify(@Query() query: Record<string, string | undefined>) {
    return this.webhookService.verifyWebhook(query)
  }

  @Post()
  ingest(
    @Body() payload: WhatsAppWebhookPayload,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.webhookService.ingestWebhook(payload, headers)
  }

  @Get('diagnostics')
  diagnostics() {
    return this.webhookService.getDiagnostics()
  }
}
