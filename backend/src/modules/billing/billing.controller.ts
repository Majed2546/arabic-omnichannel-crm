import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions, RequirePlatformAdmin } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BillingService } from './billing.service'
import { UpdateTenantBillingStatusDto, UpdateTenantPlanDto } from './dto'

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('plans')
  @RequirePermissions('reports.view')
  plans() {
    return this.billing.listPlans()
  }

  @Get('current-subscription')
  @RequirePermissions('reports.view')
  currentSubscription(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-local-tenant-id') localTenantId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billing.currentSubscription(this.scope(tenantId, localTenantId, user))
  }

  @Get('usage')
  @RequirePermissions('reports.view')
  usage(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-local-tenant-id') localTenantId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.billing.usage(this.scope(tenantId, localTenantId, user))
  }

  @Patch('tenants/:tenantId/plan')
  @RequirePermissions('settings.manage')
  @RequirePlatformAdmin()
  updateTenantPlan(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantPlanDto) {
    return this.billing.updateTenantPlan(tenantId, dto.plan, dto.subscriptionEnd)
  }

  @Patch('tenants/:tenantId/status')
  @RequirePermissions('settings.manage')
  @RequirePlatformAdmin()
  updateTenantStatus(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantBillingStatusDto) {
    return this.billing.updateTenantStatus(tenantId, dto.status)
  }

  private scope(headerTenantId: string | undefined, localTenantId: string | undefined, user: AuthenticatedUser) {
    const isPlatform = this.tenantAccess.isSuperAdmin(user)
    if (isPlatform) return { isPlatform: true }
    const requestedTenantId = localTenantId || headerTenantId
    return {
      isPlatform,
      tenantId: this.tenantAccess.requireTenantAccess({ requestedTenantId, user }),
    }
  }
}
