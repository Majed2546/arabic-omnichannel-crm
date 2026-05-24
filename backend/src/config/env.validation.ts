type Environment = Record<string, string | undefined>

const requiredKeys = ['DATABASE_URL'] as const

export function validateEnvironment(config: Environment) {
  const missingKeys = requiredKeys.filter((key) => !config[key]?.trim())

  if (missingKeys.length) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`)
  }

  for (const key of ['PORT', 'REDIS_PORT'] as const) {
    const value = config[key]
    if (value && Number.isNaN(Number(value))) {
      throw new Error(`Environment variable ${key} must be a number`)
    }
  }

  if (config.REDIS_URL?.trim()) {
    try {
      const parsed = new URL(config.REDIS_URL)
      if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
        throw new Error('invalid protocol')
      }
    } catch {
      throw new Error('Environment variable REDIS_URL must be a valid redis:// or rediss:// URL')
    }
  }

  return config
}
