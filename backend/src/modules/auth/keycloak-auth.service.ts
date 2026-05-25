import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createPublicKey, verify } from 'node:crypto'
import type { AuthenticatedUser, KeycloakTokenPayload } from './auth.types'
import { mapExternalRolesToCrmRole, permissionsForRole } from './permissions'

type Jwk = {
  kid?: string
  kty: string
  n?: string
  e?: string
}

type Jwks = {
  keys: Jwk[]
}

type JwtHeader = {
  alg?: string
  kid?: string
  typ?: string
}

@Injectable()
export class KeycloakAuthService {
  private jwksCache: { expiresAt: number; keys: Jwk[] } | null = null

  constructor(private readonly config: ConfigService) {}

  async validateAccessToken(token: string): Promise<AuthenticatedUser> {
    const [encodedHeader, encodedPayload, signature] = token.split('.')
    if (!encodedHeader || !encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid bearer token')
    }

    const header = this.decodePart<JwtHeader>(encodedHeader)
    const payload = this.decodePart<KeycloakTokenPayload>(encodedPayload)

    if (header.alg !== 'RS256') {
      throw new UnauthorizedException('Unsupported token algorithm')
    }

    this.validateClaims(payload)
    await this.verifySignature(token, header)

    const externalRoles = this.extractRoles(payload)
    const role = mapExternalRolesToCrmRole(externalRoles)
    const platformRole = this.mapPlatformRole(payload.platform_role, externalRoles)

    return {
      id: payload.sub ?? payload.preferred_username ?? 'keycloak-user',
      name: payload.name ?? payload.preferred_username ?? payload.email ?? 'Keycloak user',
      email: payload.email ?? `${payload.preferred_username ?? 'user'}@keycloak.local`,
      role,
      roles: externalRoles,
      permissions: permissionsForRole(role),
      platformRole,
      tenantId: payload.tenant_id ?? payload.tenantId ?? payload.tenant,
      issuer: payload.iss,
    }
  }

  private decodePart<T>(part: string): T {
    try {
      return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T
    } catch {
      throw new UnauthorizedException('Invalid bearer token')
    }
  }

  private validateClaims(payload: KeycloakTokenPayload) {
    const now = Math.floor(Date.now() / 1000)
    const issuer = this.getIssuer()
    const clientId = this.config.get<string>('keycloak.clientId')

    if (!payload.exp || payload.exp <= now) {
      throw new UnauthorizedException('Expired bearer token')
    }

    if (issuer && payload.iss !== issuer) {
      throw new UnauthorizedException('Invalid token issuer')
    }

    if (clientId && payload.aud) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
      if (!audiences.includes(clientId) && !payload.resource_access?.[clientId]) {
        throw new UnauthorizedException('Invalid token audience')
      }
    }
  }

  private async verifySignature(token: string, header: JwtHeader) {
    const key = await this.getSigningKey(header.kid)
    const publicKey = createPublicKey({ key, format: 'jwk' })
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.')
    const verified = verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, 'base64url'),
    )

    if (!verified) {
      throw new UnauthorizedException('Invalid bearer token signature')
    }
  }

  private async getSigningKey(kid?: string) {
    const keys = await this.getJwks()
    const key = keys.find((candidate) => (kid ? candidate.kid === kid : candidate.kty === 'RSA'))

    if (!key) {
      throw new UnauthorizedException('Unable to resolve Keycloak signing key')
    }

    return key
  }

  private async getJwks() {
    if (this.jwksCache && this.jwksCache.expiresAt > Date.now()) {
      return this.jwksCache.keys
    }

    const issuer = this.getIssuer()
    if (!issuer) {
      throw new UnauthorizedException('Keycloak issuer is not configured')
    }

    const response = await fetch(`${issuer}/protocol/openid-connect/certs`)
    if (!response.ok) {
      throw new UnauthorizedException('Unable to fetch Keycloak signing keys')
    }

    const jwks = (await response.json()) as Jwks
    this.jwksCache = {
      keys: jwks.keys,
      expiresAt: Date.now() + 5 * 60 * 1000,
    }

    return jwks.keys
  }

  private getIssuer() {
    const explicitIssuer = this.config.get<string>('keycloak.issuer')
    if (explicitIssuer) return explicitIssuer.replace(/\/$/, '')

    const keycloakUrl = this.config.get<string>('keycloak.url')?.replace(/\/$/, '')
    const realm = this.config.get<string>('keycloak.realm')
    return keycloakUrl && realm ? `${keycloakUrl}/realms/${realm}` : undefined
  }

  private extractRoles(payload: KeycloakTokenPayload) {
    const clientId = this.config.get<string>('keycloak.clientId') ?? ''
    const realmRoles = payload.realm_access?.roles ?? []
    const clientRoles = clientId ? payload.resource_access?.[clientId]?.roles ?? [] : []
    const groupRoles = (payload.groups ?? []).map((group) => group.split('/').filter(Boolean).at(-1) ?? group)

    return Array.from(new Set([...realmRoles, ...clientRoles, ...groupRoles]))
  }

  private mapPlatformRole(claimRole: string | undefined, roles: string[]) {
    const normalizedRoles = [claimRole, ...roles].filter(Boolean).map((value) => value!.toLowerCase())
    if (normalizedRoles.some((role) => ['super_admin', 'super-admin', 'platform_admin', 'platform-admin'].includes(role))) {
      return 'SUPER_ADMIN'
    }
    if (normalizedRoles.some((role) => ['company_admin', 'company-admin', 'admin', 'crm-admin', 'crm_admin'].includes(role))) {
      return 'COMPANY_ADMIN'
    }
    return 'COMPANY_USER'
  }
}
