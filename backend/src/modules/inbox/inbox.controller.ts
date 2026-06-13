import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'

@RequirePermissions('inbox.view')
@Controller('inbox')
export class InboxController {
  @Get()
  getInbox() {
    return { module: 'inbox', conversations: [] }
  }
}
