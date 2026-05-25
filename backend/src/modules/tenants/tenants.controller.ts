import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { RequirePermissions, RequirePlatformAdmin } from '../auth/auth.decorators'
import { CreateTenantDto, UpdateTenantDto, UpdateTenantStatusDto } from './dto'
import { TenantsService } from './tenants.service'

@RequirePermissions('settings.view')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list() {
    return this.tenants.list()
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.tenants.findById(id)
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
