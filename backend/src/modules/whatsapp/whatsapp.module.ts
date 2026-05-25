import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { WHATSAPP_MESSAGE_QUEUE, WHATSAPP_OUTBOUND_QUEUE, WHATSAPP_WEBHOOK_QUEUE } from '../../events/queue.constants'
import { MessagesModule } from '../messages/messages.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { WhatsAppController } from './whatsapp.controller'
import { WhatsAppEventPublisher } from './whatsapp-event.publisher'
import { WhatsAppMessageMapper } from './whatsapp-message.mapper'
import { WhatsAppMessageDispatcher } from './whatsapp-message.dispatcher'
import { WhatsAppOutboundQueue } from './whatsapp-outbound.queue'
import { WhatsAppSendService } from './whatsapp-send.service'
import { TenantWhatsAppOnboardingController } from './tenant-whatsapp-onboarding.controller'
import { WhatsAppWebhookController } from './whatsapp-webhook.controller'
import { WhatsAppWebhookService } from './whatsapp-webhook.service'

@Module({
  imports: [
    BullModule.registerQueue(
      { name: WHATSAPP_WEBHOOK_QUEUE },
      { name: WHATSAPP_MESSAGE_QUEUE },
      { name: WHATSAPP_OUTBOUND_QUEUE },
    ),
    MessagesModule,
    RealtimeModule,
  ],
  controllers: [WhatsAppController, WhatsAppWebhookController, TenantWhatsAppOnboardingController],
  providers: [
    WhatsAppWebhookService,
    WhatsAppMessageMapper,
    WhatsAppEventPublisher,
    WhatsAppSendService,
    WhatsAppMessageDispatcher,
    WhatsAppOutboundQueue,
  ],
})
export class WhatsAppModule {}
