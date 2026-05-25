import { Module } from '@nestjs/common'
import { TenantsModule } from '../tenants/tenants.module'
import { OnboardingRequestsController } from './onboarding-requests.controller'
import { OnboardingRequestsService } from './onboarding-requests.service'

@Module({
  imports: [TenantsModule],
  controllers: [OnboardingRequestsController],
  providers: [OnboardingRequestsService],
})
export class OnboardingRequestsModule {}
