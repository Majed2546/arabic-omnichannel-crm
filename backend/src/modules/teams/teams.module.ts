import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { DatabaseModule } from '../../database/database.module'
import { TeamsController } from './teams.controller'
import { TeamsService } from './teams.service'

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
