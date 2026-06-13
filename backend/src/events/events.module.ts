import { Logger, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { createRedisOptions, formatRedisTarget, type RedisConnectionConfig } from '../config/redis.config'
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
      useFactory: (config: ConfigService) => {
        const redis = config.getOrThrow<RedisConnectionConfig>('redis')
        new Logger('BullMQ').log(`BullMQ Redis target: ${formatRedisTarget(redis)}`)
        return {
          connection: createRedisOptions(redis),
        }
      },
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
