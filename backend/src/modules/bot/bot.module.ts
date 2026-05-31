import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { WHATSAPP_OUTBOUND_QUEUE } from '../../events/queue.constants'
import { NotificationsModule } from '../notifications/notifications.module'
import { BotController } from './bot.controller'
import { BotService } from './bot.service'

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    NotificationsModule,
    BullModule.registerQueue({ name: WHATSAPP_OUTBOUND_QUEUE }),
  ],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
