import { INestApplicationContext, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { ServerOptions } from 'socket.io'
import { createRedisClient, formatRedisTarget, type RedisConnectionConfig } from '../../config/redis.config'

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name)
  private adapterConstructor?: ReturnType<typeof createAdapter>

  constructor(private readonly app: INestApplicationContext) {
    super(app)
  }

  async connectToRedis() {
    const config = this.app.get(ConfigService)
    const redis = config.getOrThrow<RedisConnectionConfig>('redis')

    this.logger.log(`Socket.io Redis adapter target: ${formatRedisTarget(redis)}`)
    const pubClient = createRedisClient(redis, 'omni-crm:socket.io:pub')
    const subClient = pubClient.duplicate()

    try {
      await Promise.all([pubClient.ping(), subClient.ping()])
      this.adapterConstructor = createAdapter(pubClient, subClient)
      this.logger.log('Socket.io Redis adapter connected')
    } catch (error) {
      this.logger.warn(`Socket.io Redis adapter disabled: ${String(error)}`)
      pubClient.disconnect()
      subClient.disconnect()
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options)
    if (this.adapterConstructor) server.adapter(this.adapterConstructor)
    return server
  }
}
