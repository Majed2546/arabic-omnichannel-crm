import { createRedisConfig } from './redis.config'

export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: createRedisConfig(process.env),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'development-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  whatsapp: {
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
    appId: process.env.WHATSAPP_APP_ID,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },
  socket: {
    corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN ?? '*',
  },
})
