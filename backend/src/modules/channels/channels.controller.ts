import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('channels.view')
@Controller('channels')
export class ChannelsController {
  @Get()
  list() {
    return { module: 'channels', items: [] }
  }
}
