import { Module } from '@nestjs/common'
import { AutomationController } from './automation.controller'
import { AutomationExecutorService } from './automation-executor.service'
import { AutomationService } from './automation.service'

@Module({
  controllers: [AutomationController],
  providers: [AutomationService, AutomationExecutorService],
  exports: [AutomationService, AutomationExecutorService],
})
export class AutomationModule {}
