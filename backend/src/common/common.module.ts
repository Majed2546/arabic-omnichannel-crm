import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { TenantAccessService } from './tenant-access.service'

@Module({
  controllers: [HealthController],
  providers: [TenantAccessService],
  exports: [TenantAccessService],
})
export class CommonModule {}
