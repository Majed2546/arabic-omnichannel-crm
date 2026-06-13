import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { SlaController } from './sla.controller'
import { SlaService } from './sla.service'

@Module({
  imports: [CommonModule, DatabaseModule, NotificationsModule],
  controllers: [SlaController],
  providers: [SlaService],
  exports: [SlaService],
})
export class SlaModule {}
