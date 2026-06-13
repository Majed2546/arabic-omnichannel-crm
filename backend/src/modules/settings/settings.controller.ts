import { Body, Controller, Get, Headers, Patch } from '@nestjs/common'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { TenantAccessService } from '../../common/tenant-access.service'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import { SettingsService } from './settings.service'
import { UpdateCompanySettingsDto, UpdateNotificationSettingsDto, UpdateSettingsDto, UpdateSlaSettingsDto } from './dto'

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  @RequirePermissions('settings.view')
  getSettings(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getSettings(this.scope(tenantId, localTenantId, user))
  }

  @Patch()
  @RequirePermissions('settings.manage')
  updateSettings(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: UpdateSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateSettings(this.scope(tenantId, localTenantId, user), dto)
  }

  @Get('company')
  @RequirePermissions('settings.view')
  getCompany(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getCompanySettings(this.scope(tenantId, localTenantId, user))
  }

  @Patch('company')
  @RequirePermissions('settings.manage')
  updateCompany(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: UpdateCompanySettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateCompanySettings(this.scope(tenantId, localTenantId, user), dto)
  }

  @Get('sla')
  @RequirePermissions('settings.view')
  getSla(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getSlaSettings(this.scope(tenantId, localTenantId, user))
  }

  @Patch('sla')
  @RequirePermissions('settings.manage')
  updateSla(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: UpdateSlaSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateSlaSettings(this.scope(tenantId, localTenantId, user), dto)
  }

  @Get('notifications')
  @RequirePermissions('settings.view')
  getNotifications(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.getNotificationSettings(this.scope(tenantId, localTenantId, user))
  }

  @Patch('notifications')
  @RequirePermissions('settings.manage')
  updateNotifications(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: UpdateNotificationSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.updateNotificationSettings(this.scope(tenantId, localTenantId, user), dto)
  }

  private scope(headerTenantId: string | undefined, localTenantId: string | undefined, user: AuthenticatedUser) {
    return this.tenantAccess.requireTenantAccess({ requestedTenantId: localTenantId || headerTenantId, user })
  }
}
