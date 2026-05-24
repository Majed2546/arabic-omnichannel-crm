import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('dashboard.view')
@Controller('notifications')
export class NotificationsController {
  @Get()
  list() {
    return { module: 'notifications', items: [] }
  }
}
