import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { formatRedisTarget, sanitizeRedisUrl, type RedisConnectionConfig } from './config/redis.config'
import { RedisIoAdapter } from './modules/realtime/redis.adapter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const logger = new Logger('Bootstrap')
  const redis = config.getOrThrow<RedisConnectionConfig>('redis')

  logger.log(
    `Runtime Redis env REDIS_URL=${sanitizeRedisUrl(process.env.REDIS_URL)} REDIS_HOST=${process.env.REDIS_HOST ?? '(unset)'} REDIS_PORT=${process.env.REDIS_PORT ?? '(unset)'}`,
  )
  logger.log(`Resolved Redis target: ${formatRedisTarget(redis)}`)

  app.enableCors({
    origin: config.get<string>('socket.corsOrigin') ?? true,
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  const redisIoAdapter = new RedisIoAdapter(app)
  await redisIoAdapter.connectToRedis()
  app.useWebSocketAdapter(redisIoAdapter)

  await app.listen(config.get<number>('port') ?? 4000)
}

void bootstrap()
