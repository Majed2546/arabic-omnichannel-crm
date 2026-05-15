export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'development-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  },
  whatsapp: {
    apiVersion: process.env.WHATSAPP_API_VERSION ?? 'v21.0',
    appId: process.env.WHATSAPP_APP_ID,
    appSecret: process.env.WHATSAPP_APP_SECRET,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
  },
  socket: {
    corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN ?? 'http://localhost:5173',
  },
})
