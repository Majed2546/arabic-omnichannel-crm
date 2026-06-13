import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Injectable, Logger } from '@nestjs/common'
import { MessageStatus } from '@prisma/client'
import type { Job } from 'bullmq'
import { WHATSAPP_OUTBOUND_QUEUE } from '../../events/queue.constants'
import { MessageService } from '../messages/message.service'
import { RealtimeService } from '../realtime/realtime.service'
import { WhatsAppMessageDispatcher } from './whatsapp-message.dispatcher'
import type { WhatsAppOutboundJob } from './whatsapp-send.types'

@Injectable()
@Processor(WHATSAPP_OUTBOUND_QUEUE, {
  limiter: { max: 40, duration: 60_000 },
})
export class WhatsAppOutboundQueue extends WorkerHost {
  private readonly logger = new Logger(WhatsAppOutboundQueue.name)

  constructor(
    private readonly dispatcher: WhatsAppMessageDispatcher,
    private readonly messages: MessageService,
    private readonly realtime: RealtimeService,
  ) {
    super()
  }

  async process(job: Job<WhatsAppOutboundJob>) {
    this.logger.log(`Outbound WhatsApp job started id=${job.id} message=${job.data.messageId}`)
    const result = await this.dispatcher.dispatch(job.data)

    if (result.status === 'sent') {
      const message = await this.messages.updateDelivery({
        tenantId: job.data.tenantId,
        messageId: job.data.messageId,
        status: MessageStatus.SENT,
        externalMessageId: result.externalMessageId,
        deliveryLog: {
          provider: 'meta',
          status: 'sent',
          externalMessageId: result.externalMessageId,
          attemptedAt: new Date().toISOString(),
        },
      })

      this.realtime.publishDomainEvent('notification.created', job.data.tenantId, {
        type: 'MESSAGE_SENT',
        conversationId: message.conversationId,
        title: 'تم إرسال رسالة واتساب',
        body: 'قبلت Meta Cloud API الرسالة الصادرة.',
      }, 'queue')

      return result
    }

    await this.messages.updateDelivery({
      tenantId: job.data.tenantId,
      messageId: job.data.messageId,
      status: MessageStatus.FAILED,
      deliveryLog: {
        provider: 'meta',
        status: 'failed',
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        attemptedAt: new Date().toISOString(),
      },
    })

    this.logger.warn(`Outbound WhatsApp job failed id=${job.id} code=${result.errorCode}`)
    throw new Error(result.errorMessage ?? 'WhatsApp outbound send failed')
  }
}
