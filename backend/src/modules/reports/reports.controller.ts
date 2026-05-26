import { Controller, Get, Headers, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ReportsQueryDto } from './dto'
import { ReportsService } from './reports.service'

@RequirePermissions('reports.view')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('overview')
  overview(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.overview(this.scope(tenantId, query, user), query)
  }

  @Get('conversations')
  conversations(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.conversations(this.scope(tenantId, query, user), query)
  }

  @Get('customers')
  customers(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.customers(this.scope(tenantId, query, user), query)
  }

  @Get('tickets')
  tickets(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.tickets(this.scope(tenantId, query, user), query)
  }

  @Get('appointments')
  appointments(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.appointments(this.scope(tenantId, query, user), query)
  }

  @Get('channels')
  channels(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.channels(this.scope(tenantId, query, user), query)
  }

  @Get('usage')
  usage(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ReportsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.usage(this.scope(tenantId, query, user), query)
  }

  private scope(headerTenantId: string | undefined, query: ReportsQueryDto, user: AuthenticatedUser) {
    const isPlatform = this.tenantAccess.isSuperAdmin(user)
    const requestedTenantId = query.tenantId || headerTenantId
    if (isPlatform && !requestedTenantId) return { isPlatform: true }
    return {
      isPlatform,
      tenantId: this.tenantAccess.requireTenantAccess({ requestedTenantId, user }),
    }
  }
}
