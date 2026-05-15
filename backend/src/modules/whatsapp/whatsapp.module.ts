import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { WHATSAPP_MESSAGE_QUEUE, WHATSAPP_WEBHOOK_QUEUE } from '../../events/queue.constants'
import { MessagesModule } from '../messages/messages.module'
import { WhatsAppController } from './whatsapp.controller'
import { WhatsAppEventPublisher } from './whatsapp-event.publisher'
import { WhatsAppMessageMapper } from './whatsapp-message.mapper'
import { WhatsAppWebhookController } from './whatsapp-webhook.controller'
import { WhatsAppWebhookService } from './whatsapp-webhook.service'

@Module({
  imports: [
    BullModule.registerQueue(
      { name: WHATSAPP_WEBHOOK_QUEUE },
      { name: WHATSAPP_MESSAGE_QUEUE },
    ),
    MessagesModule,
  ],
  controllers: [WhatsAppController, WhatsAppWebhookController],
  providers: [WhatsAppWebhookService, WhatsAppMessageMapper, WhatsAppEventPublisher],
})
export class WhatsAppModule {}
