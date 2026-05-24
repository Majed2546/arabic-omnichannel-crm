import { Injectable, Logger } from '@nestjs/common'
import type { MetaSendResult, WhatsAppOutboundJob } from './whatsapp-send.types'
import { WhatsAppOutboundMessageType } from './whatsapp-send.dto'

@Injectable()
export class WhatsAppMessageDispatcher {
  private readonly logger = new Logger(WhatsAppMessageDispatcher.name)

  async dispatch(job: WhatsAppOutboundJob): Promise<MetaSendResult> {
    if (job.testMode) {
      this.logger.log(`Test WhatsApp send simulated message=${job.messageId}`)
      return { status: 'sent', externalMessageId: `test-${job.messageId}` }
    }

    if (!job.accessToken) {
      return { status: 'failed', errorCode: 'invalid_token', errorMessage: 'Missing WhatsApp access token' }
    }

    const response = await fetch(`https://graph.facebook.com/${job.apiVersion}/${job.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${job.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.createPayload(job)),
    })

    const body = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { code?: number; message?: string; type?: string } }

    if (!response.ok) {
      const errorCode = this.mapMetaError(body.error?.code, body.error?.message)
      this.logger.warn(`Meta WhatsApp send failed message=${job.messageId} code=${errorCode}`)
      return {
        status: 'failed',
        errorCode,
        errorMessage: body.error?.message ?? response.statusText,
      }
    }

    const externalMessageId = body.messages?.[0]?.id
    this.logger.log(`Meta WhatsApp send accepted message=${job.messageId} external=${externalMessageId}`)
    return { status: 'sent', externalMessageId }
  }

  private createPayload(job: WhatsAppOutboundJob) {
    if (job.messageType === WhatsAppOutboundMessageType.TEMPLATE) {
      return {
        messaging_product: 'whatsapp',
        to: job.recipient,
        type: 'template',
        template: {
          name: job.message,
          language: { code: 'ar' },
        },
      }
    }

    if (job.messageType === WhatsAppOutboundMessageType.IMAGE) {
      return {
        messaging_product: 'whatsapp',
        to: job.recipient,
        type: 'image',
        image: { link: job.message },
      }
    }

    if (job.messageType === WhatsAppOutboundMessageType.DOCUMENT) {
      return {
        messaging_product: 'whatsapp',
        to: job.recipient,
        type: 'document',
        document: { link: job.message, filename: 'document.pdf' },
      }
    }

    return {
      messaging_product: 'whatsapp',
      to: job.recipient,
      type: 'text',
      text: { preview_url: false, body: job.message },
    }
  }

  private mapMetaError(code?: number, message = ''): MetaSendResult['errorCode'] {
    const normalized = message.toLowerCase()
    if (code === 190 || normalized.includes('token')) return 'invalid_token'
    if (code === 4 || code === 80007 || normalized.includes('rate')) return 'rate_limit'
    if (code === 131047 || normalized.includes('recipient')) return 'blocked_recipient'
    if (code === 132000 || normalized.includes('template')) return 'template_error'
    return 'unknown'
  }
}
