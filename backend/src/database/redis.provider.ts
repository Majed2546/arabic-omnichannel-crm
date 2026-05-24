import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'
import { createRedisClient, formatRedisTarget, type RedisConnectionConfig } from '../config/redis.config'

export const REDIS_CLIENT = Symbol('REDIS_CLIENT')

export const redisProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const redis = config.getOrThrow<RedisConnectionConfig>('redis')
    new Logger('RedisProvider').log(`Shared Redis client target: ${formatRedisTarget(redis)}`)
    return createRedisClient(redis, 'omni-crm:shared')
  },
}
