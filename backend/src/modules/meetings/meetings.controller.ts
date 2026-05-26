import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ListMeetingsQueryDto, SaveMeetingDto, UpdateMeetingStatusDto } from './dto'
import { MeetingsService } from './meetings.service'

@RequirePermissions('meetings.view')
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetings: MeetingsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Query() query: ListMeetingsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.list(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), query)
  }

  @Get(':id')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.findById(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id)
  }

  @Post()
  @RequirePermissions('meetings.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Body() dto: SaveMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.create(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), dto)
  }

  @Patch(':id')
  @RequirePermissions('meetings.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveMeetingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.meetings.update(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('meetings.manage')
  updateStatus(
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateMeetingStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.meetings.updateStatus(this.tenantAccess.requireTenantAccess({ requestedTenantId: tenantId, user }), id, dto.status)
  }
}
