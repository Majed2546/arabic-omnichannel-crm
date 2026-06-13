import { InjectQueue } from '@nestjs/bullmq'
import { BadRequestException, HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MessageType, Prisma } from '@prisma/client'
import type { Queue } from 'bullmq'
import { PrismaService } from '../../database/prisma.service'
import { WHATSAPP_OUTBOUND_QUEUE } from '../../events/queue.constants'
import { createQueueJobId } from '../../events/queue-job-id'
import { MessageService } from '../messages/message.service'
import { DirectWhatsAppTestDto, SendWhatsAppMessageDto, WhatsAppOutboundMessageType } from './whatsapp-send.dto'
import type { WhatsAppOutboundJob } from './whatsapp-send.types'

type ChannelConfig = {
  phoneNumberId?: string
  accessToken?: string
}

type ExistingMessageSendInput = {
  tenantId: string
  conversationId: string
  messageId: string
  recipient: string
  message: string
  messageType: WhatsAppOutboundMessageType
  source: 'manual' | 'bot'
  testMode?: boolean
}

@Injectable()
export class WhatsAppSendService {
  private readonly logger = new Logger(WhatsAppSendService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly messages: MessageService,
    @InjectQueue(WHATSAPP_OUTBOUND_QUEUE) private readonly outboundQueue: Queue<WhatsAppOutboundJob>,
  ) {}

  async send(dto: SendWhatsAppMessageDto) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: dto.conversationId, tenantId: dto.tenantId, deletedAt: null },
      include: { channel: true },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')
    if (conversation.channel.type !== 'WHATSAPP') throw new BadRequestException('Conversation channel is not WhatsApp')

    const channelConfig = this.readChannelConfig(conversation.channel.config)
    const phoneNumberId = this.resolvePhoneNumberId(channelConfig, conversation.channel.externalId)
    if (!phoneNumberId && !dto.testMode) throw new BadRequestException('WhatsApp phone number ID is missing')

    const message = await this.messages.createOutgoing({
      tenantId: dto.tenantId,
      conversationId: dto.conversationId,
      channelId: conversation.channelId,
      content: dto.message,
      messageType: this.mapMessageType(dto.messageType),
      metadata: {
        whatsapp: {
          recipient: dto.recipient,
          outboundType: dto.messageType,
          testMode: Boolean(dto.testMode),
        },
      },
    })

    await this.enqueueExistingMessage({
      tenantId: dto.tenantId,
      conversationId: dto.conversationId,
      messageId: message.id,
      recipient: dto.recipient,
      message: dto.message,
      messageType: dto.messageType,
      source: 'manual',
      testMode: Boolean(dto.testMode),
    })

    return {
      queued: true,
      messageId: message.id,
      status: message.status,
    }
  }

  sendTest(dto: SendWhatsAppMessageDto) {
    return this.send({ ...dto, testMode: true })
  }

  async enqueueExistingMessage(input: ExistingMessageSendInput) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: input.conversationId, tenantId: input.tenantId, deletedAt: null },
      include: { channel: true },
    })
    if (!conversation) throw new NotFoundException('Conversation not found')
    if (conversation.channel.type !== 'WHATSAPP') throw new BadRequestException('Conversation channel is not WhatsApp')

    const channelConfig = this.readChannelConfig(conversation.channel.config)
    const phoneNumberId = this.resolvePhoneNumberId(channelConfig, conversation.channel.externalId)
    if (!phoneNumberId && !input.testMode) throw new BadRequestException('WhatsApp phone number ID is missing')

    const job: WhatsAppOutboundJob = {
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      channelId: conversation.channelId,
      phoneNumberId: phoneNumberId ?? 'test-phone-number-id',
      recipient: input.recipient,
      message: input.message,
      messageType: input.messageType,
      apiVersion: this.config.get<string>('whatsapp.apiVersion') ?? 'v21.0',
      testMode: Boolean(input.testMode),
      source: input.source,
    }

    this.logger.log(JSON.stringify({
      event: 'whatsapp_outbound_queued',
      source: input.source,
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      recipient: maskRecipient(input.recipient),
      configSource: this.resolveDiagnosticSource(channelConfig),
      tokenPresent: this.hasUsableToken(channelConfig.accessToken) || this.hasUsableToken(this.config.get<string>('whatsapp.accessToken')),
    }))

    await this.outboundQueue.add('whatsapp.outbound.send', job, {
      jobId: createQueueJobId(input.source === 'bot' ? 'whatsapp-bot-outbound' : 'whatsapp-outbound', input.messageId, Date.now()),
      attempts: input.source === 'bot' ? 1 : 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    })
  }

  async getSendConfigDiagnostics(tenantId?: string, conversationId?: string) {
    const envToken = this.config.get<string>('whatsapp.accessToken')
    const envPhoneNumberId = this.config.get<string>('whatsapp.phoneNumberId')
    const diagnostics: Record<string, unknown> = {
      env: {
        accessTokenPresent: this.hasUsableToken(envToken),
        phoneNumberIdPresent: Boolean(envPhoneNumberId),
        apiVersionPresent: Boolean(this.config.get<string>('whatsapp.apiVersion')),
      },
    }

    if (tenantId && conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: conversationId, tenantId, deletedAt: null },
        include: { channel: true },
      })
      const channelConfig = this.readChannelConfig(conversation?.channel.config ?? null)
      diagnostics.conversation = {
        found: Boolean(conversation),
        channelType: conversation?.channel.type,
        configSource: this.resolveDiagnosticSource(channelConfig),
        tenantChannelTokenPresent: this.hasUsableToken(channelConfig.accessToken),
        tenantChannelPhonePresent: Boolean(channelConfig.phoneNumberId || conversation?.channel.externalId),
      }
    }

    return diagnostics
  }

  async sendDirectTest(dto: DirectWhatsAppTestDto) {
    const accessToken = this.config.get<string>('whatsapp.accessToken')
    const phoneNumberId = this.config.get<string>('whatsapp.phoneNumberId')
    const apiVersion = this.config.get<string>('whatsapp.apiVersion') ?? 'v21.0'

    if (!accessToken) throw new BadRequestException('Missing WHATSAPP_ACCESS_TOKEN')
    if (!phoneNumberId) throw new BadRequestException('Missing WHATSAPP_PHONE_NUMBER_ID')

    const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: dto.to,
        type: 'text',
        text: {
          preview_url: false,
          body: dto.message,
        },
      }),
    })

    const body = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new HttpException(body, response.status)
    }

    return body
  }

  private mapMessageType(type: WhatsAppOutboundMessageType) {
    const map: Record<WhatsAppOutboundMessageType, MessageType> = {
      [WhatsAppOutboundMessageType.TEXT]: MessageType.TEXT,
      [WhatsAppOutboundMessageType.TEMPLATE]: MessageType.TEMPLATE,
      [WhatsAppOutboundMessageType.IMAGE]: MessageType.IMAGE,
      [WhatsAppOutboundMessageType.DOCUMENT]: MessageType.DOCUMENT,
    }
    return map[type]
  }

  private readChannelConfig(config: Prisma.JsonValue | null): ChannelConfig {
    if (!config || typeof config !== 'object' || Array.isArray(config)) return {}
    return config as ChannelConfig
  }

  private resolvePhoneNumberId(channelConfig: ChannelConfig, channelExternalId?: string | null) {
    return channelConfig.phoneNumberId ?? channelExternalId ?? this.config.get<string>('whatsapp.phoneNumberId')
  }

  private resolveDiagnosticSource(channelConfig: ChannelConfig): 'tenant-channel' | 'env' | 'default-channel' {
    if (this.hasUsableToken(channelConfig.accessToken)) return 'tenant-channel'
    if (this.hasUsableToken(this.config.get<string>('whatsapp.accessToken'))) return 'env'
    return 'default-channel'
  }

  private hasUsableToken(token?: string) {
    if (!token) return false
    const normalized = token.trim().toLowerCase()
    if (!normalized) return false
    return !['placeholder', 'masked', 'changeme', 'change-me', 'test-token'].some((part) => normalized.includes(part)) && !normalized.includes('***')
  }
}

function maskRecipient(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 4) return '****'
  return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`
}
