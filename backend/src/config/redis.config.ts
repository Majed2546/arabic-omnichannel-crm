import type { RedisOptions } from 'ioredis'

export type RedisConnectionConfig = {
  url: string
  host: string
  port: number
  password?: string
}

export function createRedisConfig(env: NodeJS.ProcessEnv): RedisConnectionConfig {
  const host = env.REDIS_HOST?.trim() || 'redis'
  const port = Number(env.REDIS_PORT ?? 6379)
  const password = env.REDIS_PASSWORD?.trim() || undefined
  const url = env.REDIS_URL?.trim() || `redis://${host}:${port}`

  return { url, host, port, password }
}

export function createRedisOptions(config: RedisConnectionConfig): RedisOptions {
  const options: RedisOptions = {
    maxRetriesPerRequest: null,
  }

  if (config.password) {
    options.password = config.password
  }

  if (!config.url) {
    return {
      ...options,
      host: config.host,
      port: config.port,
    }
  }

  const parsed = new URL(config.url)

  return {
    ...options,
    host: parsed.hostname || config.host,
    port: parsed.port ? Number(parsed.port) : config.port,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : config.password,
    db: parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
  }
}
