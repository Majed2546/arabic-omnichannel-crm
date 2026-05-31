import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AppointmentsService } from './appointments.service'
import { AssignAppointmentDto, ListAppointmentsQueryDto, SaveAppointmentDto, UpdateAppointmentStatusDto } from './dto'

@RequirePermissions('appointments.view')
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListAppointmentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.list(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.findById(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }

  @Post()
  @RequirePermissions('appointments.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: SaveAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.create(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id')
  @RequirePermissions('appointments.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.update(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('appointments.manage')
  updateStatus(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointments.updateStatus(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto.status)
  }

  @Patch(':id/assign')
  @RequirePermissions('appointments.manage')
  assign(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: AssignAppointmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.assign(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Delete(':id')
  @RequirePermissions('appointments.manage')
  softDelete(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appointments.softDelete(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }
}
