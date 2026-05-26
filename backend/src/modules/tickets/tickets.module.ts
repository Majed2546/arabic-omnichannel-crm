import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { TicketsController } from './tickets.controller'
import { TicketsService } from './tickets.service'

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
