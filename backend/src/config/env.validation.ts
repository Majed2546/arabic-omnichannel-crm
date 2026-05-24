type Environment = Record<string, string | undefined>

const requiredKeys = ['DATABASE_URL'] as const

export function validateEnvironment(config: Environment) {
  const missingKeys = requiredKeys.filter((key) => !config[key]?.trim())
  const authMode = config.AUTH_MODE?.trim() || 'local'

  if (missingKeys.length) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`)
  }

  if (!['local', 'keycloak'].includes(authMode)) {
    throw new Error('Environment variable AUTH_MODE must be either local or keycloak')
  }

  if (authMode === 'keycloak') {
    const keycloakMissingKeys = ['KEYCLOAK_CLIENT_ID'].filter((key) => !config[key]?.trim())
    const hasIssuer = Boolean(config.KEYCLOAK_ISSUER?.trim())
    const hasRealmUrl = Boolean(config.KEYCLOAK_URL?.trim() && config.KEYCLOAK_REALM?.trim())

    if (keycloakMissingKeys.length || (!hasIssuer && !hasRealmUrl)) {
      throw new Error(
        `Keycloak mode requires KEYCLOAK_CLIENT_ID and either KEYCLOAK_ISSUER or KEYCLOAK_URL + KEYCLOAK_REALM`,
      )
    }
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
