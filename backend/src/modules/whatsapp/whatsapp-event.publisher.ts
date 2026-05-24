import { Injectable } from '@nestjs/common'
import { RealtimeService } from '../realtime/realtime.service'
import type { MappedWhatsAppMessage } from './whatsapp.types'

@Injectable()
export class WhatsAppEventPublisher {
  constructor(private readonly realtime: RealtimeService) {}

  publishMessageCreated(message: MappedWhatsAppMessage, conversationId: string) {
    return this.realtime.publishDomainEvent(
      'message.created',
      message.tenantId,
      {
        conversationId,
        channelId: message.channelId,
        externalMessageId: message.externalMessageId,
        senderType: 'CUSTOMER',
        content: message.content,
        messageType: message.messageType,
      },
      'webhook',
    )
  }

  publishConversationCreated(message: MappedWhatsAppMessage, conversationId: string) {
    return this.realtime.publishDomainEvent(
      'conversation.created',
      message.tenantId,
      {
        conversationId,
        channelId: message.channelId,
        customerPhone: message.customerPhone,
        customerName: message.customerName,
      },
      'webhook',
    )
  }

  publishNotification(message: MappedWhatsAppMessage, conversationId: string) {
    return this.realtime.publishDomainEvent(
      'notification.created',
      message.tenantId,
      {
        type: 'NEW_MESSAGE',
        priority: 'INFO',
        conversationId,
        title: 'رسالة واتساب جديدة',
        body: message.content || 'وصلت رسالة واتساب جديدة.',
      },
      'webhook',
    )
  }
}
