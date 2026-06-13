import { Injectable } from '@nestjs/common'
import type { MappedWhatsAppMessage, WhatsAppChangeValue, WhatsAppInboundMessage } from './whatsapp.types'

@Injectable()
export class WhatsAppMessageMapper {
  mapInboundMessage(params: {
    tenantId: string
    channelId: string
    value: WhatsAppChangeValue
    message: WhatsAppInboundMessage
  }): MappedWhatsAppMessage {
    const contact = params.value.contacts?.find((item) => item.wa_id === params.message.from)

    return {
      tenantId: params.tenantId,
      channelId: params.channelId,
      phoneNumberId: params.value.metadata?.phone_number_id ?? 'unknown-phone-number-id',
      externalMessageId: params.message.id,
      customerPhone: params.message.from,
      customerName: contact?.profile?.name,
      messageType: params.message.type,
      content: this.extractContent(params.message),
      raw: params.message,
    }
  }

  private extractContent(message: WhatsAppInboundMessage) {
    if (message.type === 'text') return message.text?.body ?? ''
    if (message.type === 'image') return message.image?.caption ?? `[image:${message.image?.id ?? 'unknown'}]`
    if (message.type === 'audio') return `[audio:${message.audio?.id ?? 'unknown'}]`
    if (message.type === 'document') return message.document?.caption ?? message.document?.filename ?? `[document:${message.document?.id ?? 'unknown'}]`
    if (message.type === 'template') return `[template:${message.template?.name ?? 'unknown'}]`
    if (message.type === 'reaction') return `${message.reaction?.emoji ?? ''} على ${message.reaction?.message_id ?? 'رسالة'}`
    return ''
  }
}
