import { InjectQueue } from '@nestjs/bullmq'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MessageStatus, MessageType, Prisma } from '@prisma/client'
import type { Queue } from 'bullmq'
import { PrismaService } from '../../database/prisma.service'
import { WHATSAPP_OUTBOUND_QUEUE } from '../../events/queue.constants'
import { MessageService } from '../messages/message.service'
import { SendWhatsAppMessageDto, WhatsAppOutboundMessageType } from './whatsapp-send.dto'
import type { WhatsAppOutboundJob } from './whatsapp-send.types'

type ChannelConfig = {
  phoneNumberId?: string
  accessToken?: string
}

@Injectable()
export class WhatsAppSendService {
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
    const phoneNumberId = channelConfig.phoneNumberId ?? conversation.channel.externalId
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

    const job: WhatsAppOutboundJob = {
      tenantId: dto.tenantId,
      conversationId: dto.conversationId,
      messageId: message.id,
      channelId: conversation.channelId,
      phoneNumberId: phoneNumberId ?? 'test-phone-number-id',
      recipient: dto.recipient,
      message: dto.message,
      messageType: dto.messageType,
      accessToken: channelConfig.accessToken ?? this.config.get<string>('whatsapp.accessToken'),
      apiVersion: this.config.get<string>('whatsapp.apiVersion') ?? 'v21.0',
      testMode: Boolean(dto.testMode),
    }

    await this.outboundQueue.add('whatsapp.outbound.send', job, {
      jobId: `whatsapp-outbound:${message.id}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
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
}
