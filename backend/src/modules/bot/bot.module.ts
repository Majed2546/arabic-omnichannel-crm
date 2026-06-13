import { forwardRef, Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { WhatsAppModule } from '../whatsapp/whatsapp.module'
import { BotController } from './bot.controller'
import { BotService } from './bot.service'

@Module({
  imports: [
    CommonModule,
    DatabaseModule,
    NotificationsModule,
    forwardRef(() => WhatsAppModule),
  ],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
