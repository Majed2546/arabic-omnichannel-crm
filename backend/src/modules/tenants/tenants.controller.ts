import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { RequirePermissions, RequirePlatformAdmin } from '../auth/auth.decorators'
import { CreateTenantDto, UpdateTenantDto, UpdateTenantStatusDto } from './dto'
import { TenantsService } from './tenants.service'

@RequirePermissions('settings.view')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    if (user.platformRole === 'SUPER_ADMIN') return this.tenants.list()
    return this.tenants.listForUser(user.tenantId)
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.platformRole === 'SUPER_ADMIN' || user.tenantId === id) return this.tenants.findById(id)
    return this.tenants.denyTenantAccess()
  }

  @Post()
  @RequirePermissions('settings.manage')
  @RequirePlatformAdmin()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto)
  }

  @Patch(':id')
  @RequirePermissions('settings.manage')
  @RequirePlatformAdmin()
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto)
  }

  @Patch(':id/status')
  @RequirePermissions('settings.manage')
  @RequirePlatformAdmin()
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantStatusDto) {
    return this.tenants.updateStatus(id, dto)
  }
}
