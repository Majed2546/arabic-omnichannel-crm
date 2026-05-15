import { INestApplicationContext, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { ServerOptions } from 'socket.io'

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name)
  private adapterConstructor?: ReturnType<typeof createAdapter>

  constructor(private readonly app: INestApplicationContext) {
    super(app)
  }

  async connectToRedis() {
    const config = this.app.get(ConfigService)
    const connection = {
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      password: config.get<string>('redis.password'),
      maxRetriesPerRequest: null,
    }

    const pubClient = new Redis(connection)
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
