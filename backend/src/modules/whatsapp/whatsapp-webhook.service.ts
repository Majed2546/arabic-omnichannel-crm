import { InjectQueue } from '@nestjs/bullmq'
import { ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ChannelType, MessageStatus, MessageType } from '@prisma/client'
import type { Queue } from 'bullmq'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { WHATSAPP_MESSAGE_QUEUE, WHATSAPP_WEBHOOK_QUEUE } from '../../events/queue.constants'
import { createQueueJobId } from '../../events/queue-job-id'
import { PrismaService } from '../../database/prisma.service'
import { MessageService } from '../messages/message.service'
import { WhatsAppEventPublisher } from './whatsapp-event.publisher'
import { WhatsAppMessageMapper } from './whatsapp-message.mapper'
import type {
  MappedWhatsAppMessage,
  WhatsAppChangeValue,
  WhatsAppProcessingResult,
  WhatsAppStatusEvent,
  WhatsAppWebhookPayload,
} from './whatsapp.types'

type VerificationQuery = {
  'hub.mode'?: string
  'hub.verify_token'?: string
  'hub.challenge'?: string
}

type DiagnosticsRecord = {
  id: string
  receivedAt: string
  eventType: string
  tenantId?: string
  result: string
  detail: string
}

@Injectable()
export class WhatsAppWebhookService {
  private readonly logger = new Logger(WhatsAppWebhookService.name)
  private readonly diagnostics: DiagnosticsRecord[] = []

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly messages: MessageService,
    private readonly mapper: WhatsAppMessageMapper,
    private readonly publisher: WhatsAppEventPublisher,
    @InjectQueue(WHATSAPP_WEBHOOK_QUEUE) private readonly webhookQueue: Queue,
    @InjectQueue(WHATSAPP_MESSAGE_QUEUE) private readonly messageQueue: Queue,
  ) {}

  verifyWebhook(query: VerificationQuery) {
    const expectedToken = this.config.get<string>('whatsapp.webhookVerifyToken')
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    if (mode === 'subscribe' && token && token === expectedToken && challenge) {
      this.logDiagnostic('webhook.verification', undefined, 'processed', 'Meta webhook verification succeeded')
      return challenge
    }

    this.logDiagnostic('webhook.verification', undefined, 'failed', 'Meta webhook verification failed')
    throw new ForbiddenException('Invalid WhatsApp webhook verification token')
  }

  async ingestWebhook(payload: WhatsAppWebhookPayload, headers: Record<string, string | string[] | undefined>) {
    this.validateSignaturePlaceholder(headers)

    await this.webhookQueue.add(
      'whatsapp.webhook.received',
      { payload, receivedAt: new Date().toISOString() },
      { jobId: this.retrySafeJobId(payload), attempts: 5, backoff: { type: 'exponential', delay: 5_000 } },
    )

    const results = await this.processPayload(payload)
    return { received: true, results }
  }

  getDiagnostics() {
    return {
      ready: true,
      cloudApiReady: false,
      signatureValidation: 'placeholder',
      recent: this.diagnostics,
    }
  }

  private async processPayload(payload: WhatsAppWebhookPayload): Promise<WhatsAppProcessingResult[]> {
    const results: WhatsAppProcessingResult[] = []

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const tenantChannel = await this.resolveTenantChannel(change.value)
        if (!tenantChannel) {
          results.push(this.result('message.received', 'unknown', 'skipped', 'No tenant channel is registered for this WhatsApp phone number'))
          continue
        }

        for (const message of change.value.messages ?? []) {
          const mapped = this.mapper.mapInboundMessage({
            tenantId: tenantChannel.tenantId,
            channelId: tenantChannel.channelId,
            value: change.value,
            message,
          })

          await this.messageQueue.add(
            'whatsapp.message.process',
            mapped,
            { jobId: createQueueJobId('wa-message', mapped.tenantId, mapped.externalMessageId), attempts: 5, backoff: { type: 'exponential', delay: 5_000 } },
          )

          const persisted = await this.messages.createIncomingWhatsApp({
            tenantId: mapped.tenantId,
            channelId: mapped.channelId,
            customerName: mapped.customerName,
            customerPhone: mapped.customerPhone,
            content: mapped.content,
            messageType: this.mapMessageType(mapped.messageType),
            externalMessageId: mapped.externalMessageId,
            metadata: { whatsapp: mapped.raw },
          })

          results.push(this.result('message.received', mapped.tenantId, 'processed', `Message ${mapped.externalMessageId} mapped to ${persisted.conversation.id}`, mapped.channelId, mapped.externalMessageId))
        }

        for (const status of change.value.statuses ?? []) {
          const result = await this.processStatusEvent(tenantChannel.tenantId, tenantChannel.channelId, status)
          results.push(result)
        }

        if (this.isTemplateStatus(change.value)) {
          results.push(this.result('template.status', tenantChannel.tenantId, 'processed', `Template ${change.value.message_template_name ?? 'unknown'} status received`, tenantChannel.channelId))
        }

        if (this.isConversationStarted(change.value)) {
          results.push(this.result('conversation.started', tenantChannel.tenantId, 'processed', 'Conversation lifecycle event received', tenantChannel.channelId))
        }
      }
    }

    if (!results.length) {
      this.logDiagnostic('webhook.unknown', undefined, 'skipped', 'Webhook contained no supported WhatsApp changes')
    }

    return results
  }

  private async processStatusEvent(tenantId: string, channelId: string, status: WhatsAppStatusEvent) {
    await this.messages.updateStatusByExternalId({
      tenantId,
      externalMessageId: status.id,
      status: this.mapStatus(status.status),
    })
    this.logDiagnostic('message.status', tenantId, 'processed', `Message ${status.id} status=${status.status}`)
    return this.result('message.status', tenantId, 'processed', `Message ${status.id} status=${status.status}`, channelId, status.id)
  }

  private async resolveTenantChannel(value: WhatsAppChangeValue) {
    const phoneNumberId = value.metadata?.phone_number_id ?? 'unknown-phone-number-id'
    const channel = await this.prisma.channel.findFirst({
      where: {
        type: ChannelType.WHATSAPP,
        externalId: phoneNumberId,
        deletedAt: null,
      },
      select: { id: true, tenantId: true },
    })

    if (channel) {
      return {
        tenantId: channel.tenantId,
        channelId: channel.id,
      }
    }

    return null
  }

  private mapMessageType(type: MappedWhatsAppMessage['messageType']) {
    const types: Record<MappedWhatsAppMessage['messageType'], MessageType> = {
      text: MessageType.TEXT,
      image: MessageType.IMAGE,
      audio: MessageType.AUDIO,
      document: MessageType.DOCUMENT,
      template: MessageType.TEMPLATE,
      reaction: MessageType.SYSTEM,
    }
    return types[type]
  }

  private mapStatus(status: WhatsAppStatusEvent['status']) {
    const statuses: Record<WhatsAppStatusEvent['status'], MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    }
    return statuses[status]
  }

  private result(
    eventType: WhatsAppProcessingResult['eventType'],
    tenantId: string,
    status: WhatsAppProcessingResult['status'],
    detail: string,
    channelId?: string,
    externalMessageId?: string,
  ) {
    this.logDiagnostic(eventType, tenantId, status, detail)
    return { eventType, tenantId, channelId, externalMessageId, status, detail }
  }

  private retrySafeJobId(payload: WhatsAppWebhookPayload) {
    const firstEntry = payload.entry?.[0]
    const firstChange = firstEntry?.changes?.[0]
    const firstMessageId = firstChange?.value.messages?.[0]?.id
    const firstStatusId = firstChange?.value.statuses?.[0]?.id
    return createQueueJobId('wa-webhook', firstEntry?.id ?? 'unknown', firstMessageId ?? firstStatusId ?? Date.now())
  }

  private validateSignaturePlaceholder(headers: Record<string, string | string[] | undefined>) {
    const appSecret = this.config.get<string>('whatsapp.appSecret')
    const signature = this.headerValue(headers['x-hub-signature-256'])

    if (!appSecret || !signature) {
      this.logger.debug('WhatsApp signature validation placeholder skipped')
      return
    }

    // Placeholder structure: raw body support will be added before enforcing signatures.
    const expected = `sha256=${createHmac('sha256', appSecret).update('').digest('hex')}`
    const safeExpected = Buffer.from(expected)
    const safeActual = Buffer.from(signature)
    if (safeExpected.length === safeActual.length && timingSafeEqual(safeExpected, safeActual)) return
    this.logger.warn('WhatsApp signature placeholder detected a mismatch')
  }

  private headerValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
  }

  private isTemplateStatus(value: WhatsAppChangeValue) {
    return Boolean(value.message_template_id || value.message_template_name)
  }

  private isConversationStarted(value: WhatsAppChangeValue) {
    return value.event === 'conversation_started'
  }

  private logDiagnostic(eventType: string, tenantId: string | undefined, result: string, detail: string) {
    this.diagnostics.unshift({
      id: `${Date.now()}-${this.diagnostics.length}`,
      receivedAt: new Date().toISOString(),
      eventType,
      tenantId,
      result,
      detail,
    })
    this.diagnostics.splice(50)
    this.logger.log(`${eventType} ${result}: ${detail}`)
  }
}
