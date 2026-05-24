export type WhatsAppWebhookPayload = {
  object?: string
  entry?: WhatsAppEntry[]
}

export type WhatsAppEntry = {
  id: string
  changes?: WhatsAppChange[]
}

export type WhatsAppChange = {
  field: string
  value: WhatsAppChangeValue
}

export type WhatsAppChangeValue = {
  messaging_product?: string
  metadata?: {
    display_phone_number?: string
    phone_number_id?: string
  }
  contacts?: Array<{
    wa_id: string
    profile?: { name?: string }
  }>
  messages?: WhatsAppInboundMessage[]
  statuses?: WhatsAppStatusEvent[]
  event?: string
  message_template_id?: string
  message_template_name?: string
  message_template_language?: string
  reason?: string
}

export type WhatsAppInboundMessage = {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'audio' | 'document' | 'template' | 'reaction'
  text?: { body: string }
  image?: { id: string; mime_type?: string; caption?: string; sha256?: string }
  audio?: { id: string; mime_type?: string; sha256?: string; voice?: boolean }
  document?: { id: string; filename?: string; mime_type?: string; caption?: string; sha256?: string }
  template?: { name?: string; language?: { code?: string } }
  reaction?: { message_id: string; emoji: string }
}

export type WhatsAppStatusEvent = {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  conversation?: { id: string; origin?: { type?: string } }
  errors?: Array<{ code: number; title: string; message?: string }>
}

export type WhatsAppInternalEventType =
  | 'message.received'
  | 'message.status'
  | 'template.status'
  | 'conversation.started'

export type MappedWhatsAppMessage = {
  tenantId: string
  channelId: string
  phoneNumberId: string
  externalMessageId: string
  customerPhone: string
  customerName?: string
  messageType: WhatsAppInboundMessage['type']
  content: string
  raw: WhatsAppInboundMessage
}

export type WhatsAppProcessingResult = {
  eventType: WhatsAppInternalEventType
  tenantId: string
  channelId?: string
  externalMessageId?: string
  status: 'queued' | 'processed' | 'skipped' | 'failed'
  detail: string
}
