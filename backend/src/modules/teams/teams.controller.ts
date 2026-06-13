import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AddTeamMemberDto, SaveTeamDto, UpdateTeamStatusDto } from './dto'
import { TeamsService } from './teams.service'

@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @RequirePermissions('users.view')
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.list(localTenantId || tenantId, user)
  }

  @Get(':id')
  @RequirePermissions('users.view')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.findById(id, localTenantId || tenantId, user)
  }

  @Post()
  @RequirePermissions('users.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: SaveTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.create(localTenantId || tenantId, user, dto)
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveTeamDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.update(id, localTenantId || tenantId, user, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('users.manage')
  updateStatus(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: UpdateTeamStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.updateStatus(id, localTenantId || tenantId, user, dto.isActive)
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  remove(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.softDelete(id, localTenantId || tenantId, user)
  }

  @Get(':id/members')
  @RequirePermissions('users.view')
  members(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.members(id, localTenantId || tenantId, user)
  }

  @Post(':id/members')
  @RequirePermissions('users.manage')
  addMember(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: AddTeamMemberDto, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.addMember(id, localTenantId || tenantId, user, dto)
  }

  @Delete(':id/members/:userId')
  @RequirePermissions('users.manage')
  removeMember(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.teams.removeMember(id, userId, localTenantId || tenantId, user)
  }
}
