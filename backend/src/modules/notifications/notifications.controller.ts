import { Controller, Get } from '@nestjs/common'

@Controller('notifications')
export class NotificationsController {
  @Get()
  list() {
    return { module: 'notifications', items: [] }
  }
}
