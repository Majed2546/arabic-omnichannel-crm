import { Controller, Get } from '@nestjs/common'

@Controller('inbox')
export class InboxController {
  @Get()
  getInbox() {
    return { module: 'inbox', conversations: [] }
  }
}
