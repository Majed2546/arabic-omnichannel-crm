import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import {
  AUTOMATION_QUEUE,
  MESSAGE_QUEUE,
  NOTIFICATION_QUEUE,
  WHATSAPP_MESSAGE_QUEUE,
  WHATSAPP_OUTBOUND_QUEUE,
  WHATSAPP_WEBHOOK_QUEUE,
} from './queue.constants'
import { EventBusService } from './event-bus.service'

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: MESSAGE_QUEUE },
      { name: NOTIFICATION_QUEUE },
      { name: AUTOMATION_QUEUE },
      { name: WHATSAPP_WEBHOOK_QUEUE },
      { name: WHATSAPP_MESSAGE_QUEUE },
      { name: WHATSAPP_OUTBOUND_QUEUE },
    ),
  ],
  providers: [EventBusService],
  exports: [BullModule, EventBusService],
})
export class EventsModule {}
