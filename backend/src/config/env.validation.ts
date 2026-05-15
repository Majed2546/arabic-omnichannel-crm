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

  return config
}
