import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { MESSAGE_QUEUE } from '../../events/queue.constants'
import { ConversationsModule } from '../conversations/conversations.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { MessagesController } from './messages.controller'
import { MessageProcessor } from './message.processor'
import { MessageService } from './message.service'

@Module({
  imports: [
    BullModule.registerQueue({ name: MESSAGE_QUEUE }),
    ConversationsModule,
    RealtimeModule,
  ],
  controllers: [MessagesController],
  providers: [MessageService, MessageProcessor],
  exports: [MessageService],
})
export class MessagesModule {}
