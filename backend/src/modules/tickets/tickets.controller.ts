import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AssignTicketDto, ListTicketsQueryDto, SaveTicketDto, UpdateTicketStatusDto } from './dto'
import { TicketsService } from './tickets.service'

@RequirePermissions('tickets.view')
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListTicketsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tickets.list(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tickets.findById(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }

  @Post()
  @RequirePermissions('tickets.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: SaveTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tickets.create(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id')
  @RequirePermissions('tickets.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tickets.update(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('tickets.manage')
  updateStatus(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tickets.updateStatus(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto.status)
  }

  @Patch(':id/assign')
  @RequirePermissions('tickets.manage')
  assign(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: AssignTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tickets.assign(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Delete(':id')
  @RequirePermissions('tickets.manage')
  softDelete(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tickets.softDelete(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }
}
