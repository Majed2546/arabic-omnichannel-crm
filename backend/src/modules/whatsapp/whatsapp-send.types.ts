import type { WhatsAppOutboundMessageType } from './whatsapp-send.dto'

export type WhatsAppOutboundJob = {
  tenantId: string
  conversationId: string
  messageId: string
  channelId: string
  phoneNumberId: string
  recipient: string
  message: string
  messageType: WhatsAppOutboundMessageType
  apiVersion: string
  testMode: boolean
  source?: 'manual' | 'bot'
}

export type MetaSendResult = {
  externalMessageId?: string
  status: 'sent' | 'failed'
  errorCode?: 'invalid_token' | 'rate_limit' | 'blocked_recipient' | 'template_error' | 'unknown'
  errorMessage?: string
}
