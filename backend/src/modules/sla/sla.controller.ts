import { Controller, Get, Headers, Post, Query } from '@nestjs/common'
import { TenantAccessService } from '../../common/tenant-access.service'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { SlaItemsQueryDto } from './dto'
import { SlaService } from './sla.service'

@Controller('sla')
@RequirePermissions('reports.view')
export class SlaController {
  constructor(
    private readonly sla: SlaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private tenantId(tenantId: string | undefined, localTenantId: string | undefined, user: AuthenticatedUser) {
    return this.tenantAccess.requireTenantAccess({ requestedTenantId: localTenantId || tenantId, user })
  }

  @Get('overview')
  overview(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.sla.overview(this.tenantId(tenantId, localTenantId, user))
  }

  @Get('items')
  items(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Query() query: SlaItemsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.sla.items(this.tenantId(tenantId, localTenantId, user), query)
  }

  @Post('recalculate')
  recalculate(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.sla.recalculate(this.tenantId(tenantId, localTenantId, user))
  }

  @Post('check-escalations')
  checkEscalations(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.sla.checkEscalations(this.tenantId(tenantId, localTenantId, user))
  }
}
