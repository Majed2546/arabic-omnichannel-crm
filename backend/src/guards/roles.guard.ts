import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from '../modules/auth/auth.decorators'
import type { AuthenticatedUser } from '../modules/auth/auth.types'
import type { CrmRole } from '../modules/auth/permissions'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const requiredRoles = this.reflector.getAllAndOverride<CrmRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!requiredRoles?.length) return true

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>()
    if (request.user && requiredRoles.includes(request.user.role)) return true

    throw new ForbiddenException('Insufficient role')
  }
}
