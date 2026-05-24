import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { MESSAGE_QUEUE } from '../../events/queue.constants'

@Processor(MESSAGE_QUEUE)
export class MessageProcessor extends WorkerHost {
  private readonly logger = new Logger(MessageProcessor.name)

  async process(job: Job) {
    this.logger.debug(`Message queue job ${job.name} received`)
    return { processed: true, jobId: job.id }
  }
}
