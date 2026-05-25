import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY, REQUIRE_PLATFORM_ADMIN_KEY } from '../modules/auth/auth.decorators'
import type { AuthMode, AuthenticatedUser } from '../modules/auth/auth.types'

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const requiresPlatformAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiresPlatformAdmin) return true

    const authMode = this.config.get<AuthMode>('auth.mode') ?? 'local'
    if (authMode !== 'keycloak') return true

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    if (request.user?.platformRole === 'SUPER_ADMIN') return true

    throw new ForbiddenException('Super Admin access required')
  }
}
