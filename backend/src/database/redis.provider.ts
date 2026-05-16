import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'
import { createRedisOptions, type RedisConnectionConfig } from '../config/redis.config'

export const REDIS_CLIENT = Symbol('REDIS_CLIENT')

export const redisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) =>
    new Redis(createRedisOptions(config.getOrThrow<RedisConnectionConfig>('redis'))),
}
