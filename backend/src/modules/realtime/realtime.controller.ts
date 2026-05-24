import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { RequirePermissions } from '../auth/auth.decorators'
import { RealtimeService } from './realtime.service'

@RequirePermissions('inbox.view')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Get('health')
  getHealth() {
    return this.realtime.getHealth()
  }

  @Get('events')
  getEvents() {
    return { events: this.realtime.getLatestEvents() }
  }

  @Get('presence')
  getPresence(@Query('tenantId') tenantId?: string) {
    return { agents: this.realtime.getPresence(tenantId) }
  }

  @Post('simulate')
  simulate(@Body() body: { tenantId?: string }) {
    return this.realtime.simulate(body.tenantId ?? 'tenant-demo')
  }
}
