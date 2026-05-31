import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { WHATSAPP_MESSAGE_QUEUE, WHATSAPP_OUTBOUND_QUEUE, WHATSAPP_WEBHOOK_QUEUE } from '../../events/queue.constants'
import { CommonModule } from '../../common/common.module'
import { MessagesModule } from '../messages/messages.module'
import { AutomationModule } from '../automation/automation.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { ChannelsModule } from '../channels/channels.module'
import { BotModule } from '../bot/bot.module'
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
    CommonModule,
    MessagesModule,
    AutomationModule,
    RealtimeModule,
    ChannelsModule,
    BotModule,
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
