import { Module } from '@nestjs/common'
import { RealtimeController } from './realtime.controller'
import { NotificationsRealtimeGateway, PresenceRealtimeGateway, RealtimeGateway } from './realtime.gateway'
import { RealtimeService } from './realtime.service'

@Module({
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeGateway, NotificationsRealtimeGateway, PresenceRealtimeGateway],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
