import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { MetaSendResult, WhatsAppOutboundJob } from './whatsapp-send.types'
import { WhatsAppOutboundMessageType } from './whatsapp-send.dto'

type ChannelConfig = {
  phoneNumberId?: string
  accessToken?: string
}

@Injectable()
export class WhatsAppMessageDispatcher {
  private readonly logger = new Logger(WhatsAppMessageDispatcher.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async dispatch(job: WhatsAppOutboundJob): Promise<MetaSendResult> {
    if (job.testMode) {
      this.logger.log(`Test WhatsApp send simulated message=${job.messageId}`)
      return { status: 'sent', externalMessageId: `test-${job.messageId}` }
    }

    const resolved = await this.resolveSendConfig(job)
    this.logger.log(JSON.stringify({
      event: 'whatsapp_outbound_send_config',
      source: job.source ?? 'manual',
      tenantId: job.tenantId,
      conversationId: job.conversationId,
      messageId: job.messageId,
      recipient: maskRecipient(job.recipient),
      configSource: resolved.configSource,
      tokenPresent: Boolean(resolved.accessToken),
    }))

    if (!resolved.accessToken) {
      return { status: 'failed', errorCode: 'invalid_token', errorMessage: 'Missing WhatsApp access token' }
    }

    const response = await fetch(`https://graph.facebook.com/${job.apiVersion}/${resolved.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved.accessToken}`,
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

  private async resolveSendConfig(job: WhatsAppOutboundJob) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: job.conversationId, tenantId: job.tenantId, deletedAt: null },
      include: { channel: true },
    })
    const channelConfig = this.readChannelConfig(conversation?.channel.config ?? null)
    const envToken = this.config.get<string>('whatsapp.accessToken')
    const tenantToken = this.usableToken(channelConfig.accessToken)
    const envFallbackToken = this.usableToken(envToken)
    const accessToken = tenantToken ?? envFallbackToken
    const configSource = tenantToken ? 'tenant-channel' : envFallbackToken ? 'env' : 'default-channel'
    const phoneNumberId =
      channelConfig.phoneNumberId ??
      conversation?.channel.externalId ??
      this.config.get<string>('whatsapp.phoneNumberId') ??
      job.phoneNumberId

    return { accessToken, phoneNumberId, configSource }
  }

  private readChannelConfig(config: Prisma.JsonValue | null): ChannelConfig {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
    return config as ChannelConfig
  }

  private usableToken(token?: string) {
    if (!token) return undefined
    const trimmed = token.trim()
    const normalized = trimmed.toLowerCase()
    if (!trimmed) return undefined
    if (normalized.includes('***')) return undefined
    if (['placeholder', 'masked', 'changeme', 'change-me', 'test-token'].some((part) => normalized.includes(part))) return undefined
    return trimmed
  }
}

function maskRecipient(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return '****'
  return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`
}
