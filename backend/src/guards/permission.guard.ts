import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from '../modules/auth/auth.decorators'
import type { AuthMode, AuthenticatedUser } from '../modules/auth/auth.types'
import type { CrmPermission } from '../modules/auth/permissions'

@Injectable()
export class PermissionGuard implements CanActivate {
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

    const authMode = this.config.get<AuthMode>('auth.mode') ?? 'local'
    if (authMode !== 'keycloak') return true

    const requiredPermissions = this.reflector.getAllAndOverride<CrmPermission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredPermissions?.length) return true

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    const userPermissions = new Set(request.user?.permissions ?? [])

    if (requiredPermissions.every((permission) => userPermissions.has(permission))) {
      return true
    }

    throw new ForbiddenException('Insufficient permissions')
  }
}
