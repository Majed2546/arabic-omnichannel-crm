import { Module } from '@nestjs/common'
import { CommonModule } from '../../common/common.module'
import { AutomationController } from './automation.controller'
import { AutomationExecutorService } from './automation-executor.service'
import { AutomationService } from './automation.service'

@Module({
  imports: [CommonModule],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationExecutorService],
  exports: [AutomationService, AutomationExecutorService],
})
export class AutomationModule {}
