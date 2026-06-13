import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { RequirePermissions, RequirePlatformAdmin } from '../auth/auth.decorators'
import {
  CreateOnboardingRequestDto,
  UpdateOnboardingRequestDto,
  UpdateOnboardingRequestStatusDto,
} from './dto'
import { OnboardingRequestsService } from './onboarding-requests.service'

@RequirePermissions('settings.manage')
@RequirePlatformAdmin()
@Controller('onboarding-requests')
export class OnboardingRequestsController {
  constructor(private readonly onboardingRequests: OnboardingRequestsService) {}

  @Get()
  list() {
    return this.onboardingRequests.list()
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.onboardingRequests.findById(id)
  }

  @Post()
  create(@Body() dto: CreateOnboardingRequestDto) {
    return this.onboardingRequests.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOnboardingRequestDto) {
    return this.onboardingRequests.update(id, dto)
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOnboardingRequestStatusDto) {
    return this.onboardingRequests.updateStatus(id, dto)
  }

  @Post(':id/create-tenant')
  createTenant(@Param('id') id: string) {
    return this.onboardingRequests.createTenant(id)
  }
}
