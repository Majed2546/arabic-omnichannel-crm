import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { CommonModule } from '../../common/common.module'
import { MESSAGE_QUEUE } from '../../events/queue.constants'
import { ConversationsModule } from '../conversations/conversations.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { SlaModule } from '../sla/sla.module'
import { MessagesController } from './messages.controller'
import { MessageProcessor } from './message.processor'
import { MessageService } from './message.service'

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({ name: MESSAGE_QUEUE }),
    ConversationsModule,
    NotificationsModule,
    RealtimeModule,
    SlaModule,
  ],
  controllers: [MessagesController],
  providers: [MessageService, MessageProcessor],
  exports: [MessageService],
})
export class MessagesModule {}
