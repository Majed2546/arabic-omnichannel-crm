import { Controller, Get } from '@nestjs/common'
import { Public } from '../modules/auth/auth.decorators'

@Public()
@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'arabic-omnichannel-crm-backend',
      timestamp: new Date().toISOString(),
    }
  }
}
