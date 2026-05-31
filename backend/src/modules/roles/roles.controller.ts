import { Body, Controller, Delete, Get, Headers, Param, Patch, Post } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CreateRoleDto, UpdateRoleDto, UpdateRolePermissionsDto } from './dto'
import { RolesService } from './roles.service'

@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get('roles')
  @RequirePermissions('roles.view')
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.roles.list(localTenantId || tenantId, user)
  }

  @Get('roles/:id')
  @RequirePermissions('roles.view')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roles.findById(id, localTenantId || tenantId, user)
  }

  @Post('roles')
  @RequirePermissions('roles.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: CreateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.roles.create(localTenantId || tenantId, user, dto)
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.roles.update(id, localTenantId || tenantId, user, dto)
  }

  @Delete('roles/:id')
  @RequirePermissions('roles.manage')
  remove(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.roles.softDelete(id, localTenantId || tenantId, user)
  }

  @Get('permissions')
  @RequirePermissions('roles.view')
  permissions() {
    return this.roles.listPermissions()
  }

  @Patch('roles/:id/permissions')
  @RequirePermissions('roles.manage')
  updatePermissions(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: UpdateRolePermissionsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.roles.updatePermissions(id, localTenantId || tenantId, user, dto.permissions)
  }
}
