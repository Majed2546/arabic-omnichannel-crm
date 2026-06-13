import Redis, { type RedisOptions } from 'ioredis'

export type RedisConnectionConfig = {
  url: string
  host: string
  port: number
  password?: string
}

const LOCAL_REDIS_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function createRedisConfig(env: NodeJS.ProcessEnv): RedisConnectionConfig {
  const envHost = env.REDIS_HOST?.trim() || 'redis'
  const envPort = Number(env.REDIS_PORT ?? 6379)
  const password = env.REDIS_PASSWORD?.trim() || undefined
  const url = env.REDIS_URL?.trim() || `redis://${envHost}:${envPort}`
  const parsed = new URL(url)
  const host = parsed.hostname || envHost
  const port = parsed.port ? Number(parsed.port) : envPort

  if (env.NODE_ENV === 'production' && LOCAL_REDIS_HOSTS.has(host)) {
    throw new Error(
      `Production Redis host resolved to ${host}. Set REDIS_URL=redis://redis:6379 or REDIS_HOST=redis.`,
    )
  }

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

export function createRedisClient(config: RedisConnectionConfig, connectionName: string) {
  return new Redis({
    ...createRedisOptions(config),
    connectionName,
  })
}

export function formatRedisTarget(config: RedisConnectionConfig) {
  const parsed = new URL(config.url)
  const protocol = parsed.protocol.replace(':', '')
  const db = parsed.pathname.length > 1 ? parsed.pathname : ''
  return `${protocol}://${config.host}:${config.port}${db}`
}

export function sanitizeRedisUrl(value: string | undefined) {
  if (!value?.trim()) return '(unset)'

  try {
    const parsed = new URL(value)
    if (parsed.password) parsed.password = '***'
    return parsed.toString()
  } catch {
    return '(invalid)'
  }
}
