export const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE ?? 'local') as 'local' | 'keycloak'

export const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  clientSecret: import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET,
  issuer:
    import.meta.env.VITE_KEYCLOAK_ISSUER ??
    (import.meta.env.VITE_KEYCLOAK_URL && import.meta.env.VITE_KEYCLOAK_REALM
      ? `${String(import.meta.env.VITE_KEYCLOAK_URL).replace(/\/$/, '')}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}`
      : undefined),
}

export function isKeycloakConfigured() {
  return Boolean(keycloakConfig.issuer && keycloakConfig.clientId)
}
