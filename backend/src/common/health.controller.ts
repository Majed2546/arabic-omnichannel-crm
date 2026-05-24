import { Controller, Get } from '@nestjs/common'

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
