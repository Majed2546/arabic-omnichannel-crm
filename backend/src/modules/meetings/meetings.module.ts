import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { MeetingsController } from './meetings.controller'
import { MeetingsService } from './meetings.service'

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
