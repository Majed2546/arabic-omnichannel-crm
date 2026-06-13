import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { SaveUserDto, UpdateUserStatusDto, UserQueryDto } from './dto'
import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @RequirePermissions('users.view')
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Query() query: UserQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.list(localTenantId || tenantId, user, query)
  }

  @Get(':id')
  @RequirePermissions('users.view')
  getById(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.findById(id, localTenantId || tenantId, user)
  }

  @Post()
  @RequirePermissions('users.manage')
  create(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: SaveUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.create(localTenantId || tenantId, user, dto)
  }

  @Patch(':id')
  @RequirePermissions('users.manage')
  update(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: SaveUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.update(id, localTenantId || tenantId, user, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('users.manage')
  updateStatus(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @Body() dto: UpdateUserStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.updateStatus(id, localTenantId || tenantId, user, dto)
  }

  @Delete(':id')
  @RequirePermissions('users.manage')
  remove(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.softDelete(id, localTenantId || tenantId, user)
  }
}
