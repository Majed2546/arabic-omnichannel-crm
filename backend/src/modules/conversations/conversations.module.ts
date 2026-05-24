import { Module } from '@nestjs/common'
import { ConversationsController } from './conversations.controller'
import { ConversationService } from './conversation.service'

@Module({
  controllers: [ConversationsController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationsModule {}
