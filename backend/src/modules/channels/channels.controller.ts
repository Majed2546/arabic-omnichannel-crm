import { Controller, Get } from '@nestjs/common'

@Controller('channels')
export class ChannelsController {
  @Get()
  list() {
    return { module: 'channels', items: [] }
  }
}
