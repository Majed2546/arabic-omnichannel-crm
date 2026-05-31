import { Body, Controller, Get, Headers, Param, Patch, Post, Query } from '@nestjs/common'
import { TenantAccessService } from '../../common/tenant-access.service'
import { CurrentUser } from '../../decorators/current-user.decorator'
import { RequirePermissions } from '../auth/auth.decorators'
import type { AuthenticatedUser } from '../auth/auth.types'
import type { CreateTestNotificationDto, ListNotificationsQueryDto } from './dto'
import { NotificationsService } from './notifications.service'

@Controller('notifications')
@RequirePermissions('notifications.view')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private tenantId(tenantId: string | undefined, localTenantId: string | undefined, user: AuthenticatedUser) {
    return this.tenantAccess.requireTenantAccess({ requestedTenantId: localTenantId || tenantId, user })
  }

  @Get()
  list(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Query() query: ListNotificationsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.list(this.tenantId(tenantId, localTenantId, user), user, query)
  }

  @Get('unread-count')
  unreadCount(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.unreadCount(this.tenantId(tenantId, localTenantId, user), user)
  }

  @Patch(':id/read')
  markRead(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markRead(this.tenantId(tenantId, localTenantId, user), user, id)
  }

  @Patch('read-all')
  readAll(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.readAll(this.tenantId(tenantId, localTenantId, user), user)
  }

  @Patch(':id/archive')
  archive(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.archive(this.tenantId(tenantId, localTenantId, user), user, id)
  }

  @Post('test')
  @RequirePermissions('notifications.manage')
  createTest(@Headers('x-tenant-id') tenantId: string | undefined, @Headers('x-local-tenant-id') localTenantId: string | undefined, @Body() dto: CreateTestNotificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.createTest(this.tenantId(tenantId, localTenantId, user), user, dto)
  }
}
