import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../modules/auth/auth.decorators'
import { KeycloakAuthService } from '../modules/auth/keycloak-auth.service'
import { permissionsForRole } from '../modules/auth/permissions'
import type { AuthMode, AuthenticatedUser, PlatformRole } from '../modules/auth/auth.types'

type AuthRequest = {
  user?: AuthenticatedUser
  method?: string
  headers?: Record<string, string | string[] | undefined>
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly keycloakAuth: KeycloakAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const request = context.switchToHttp().getRequest<AuthRequest>()
    if (request.method === 'OPTIONS') return true

    const authMode = this.config.get<AuthMode>('auth.mode') ?? 'local'
    if (authMode !== 'keycloak') {
      const platformRole = this.resolveLocalPlatformRole(request)
      const role = platformRole === 'COMPANY_USER' ? 'analyst' : 'admin'
      request.user = {
        id: 'local-dev-user',
        name: 'Local development user',
        email: 'admin@example.com',
        role,
        roles: this.resolveLocalRoles(platformRole),
        permissions: permissionsForRole(role),
        platformRole,
        tenantId: this.resolveLocalTenantId(request),
      }
      return true
    }

    const token = this.extractBearerToken(request)
    request.user = await this.keycloakAuth.validateAccessToken(token)
    return true
  }

  private extractBearerToken(request: { headers?: Record<string, string | string[] | undefined> }) {
    const authorization = request.headers?.authorization
    const header = Array.isArray(authorization) ? authorization[0] : authorization
    const [scheme, token] = header?.split(' ') ?? []

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Bearer token required')
    }

    return token
  }

  private resolveTenantId(request: { headers?: Record<string, string | string[] | undefined> }) {
    const header = request.headers?.['x-tenant-id'] ?? request.headers?.tenant_id
    const tenantId = Array.isArray(header) ? header[0] : header
    return tenantId || 'default-tenant'
  }

  private resolveLocalTenantId(request: { headers?: Record<string, string | string[] | undefined> }) {
    const header = request.headers?.['x-local-tenant-id'] ?? request.headers?.['x-tenant-id'] ?? request.headers?.tenant_id
    const tenantId = Array.isArray(header) ? header[0] : header
    return tenantId || 'default-tenant'
  }

  private resolveLocalPlatformRole(request: { headers?: Record<string, string | string[] | undefined> }): PlatformRole {
    const header = request.headers?.['x-local-platform-role']
    const platformRole = Array.isArray(header) ? header[0] : header
    if (platformRole === 'COMPANY_ADMIN' || platformRole === 'COMPANY_USER' || platformRole === 'SUPER_ADMIN') {
      return platformRole
    }
    return 'SUPER_ADMIN'
  }

  private resolveLocalRoles(platformRole: PlatformRole) {
    if (platformRole === 'SUPER_ADMIN') return ['admin', 'local-admin']
    if (platformRole === 'COMPANY_ADMIN') return ['admin', 'company-admin']
    return ['analyst', 'company-user']
  }
}
