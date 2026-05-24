import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../modules/auth/auth.decorators'
import { KeycloakAuthService } from '../modules/auth/keycloak-auth.service'
import { permissionsForRole } from '../modules/auth/permissions'
import type { AuthMode, AuthenticatedUser } from '../modules/auth/auth.types'

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
      request.user = {
        id: 'local-dev-user',
        name: 'Local development user',
        email: 'admin@example.com',
        role: 'admin',
        roles: ['admin'],
        permissions: permissionsForRole('admin'),
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
}
