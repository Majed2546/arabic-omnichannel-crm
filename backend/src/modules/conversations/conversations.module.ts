import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { ConversationsController } from './conversations.controller'
import { ConversationService } from './conversation.service'

@Module({
  imports: [CommonModule, NotificationsModule],
  controllers: [ConversationsController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationsModule {}
