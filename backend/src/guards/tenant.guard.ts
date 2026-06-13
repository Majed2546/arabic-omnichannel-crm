import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>()
    return Boolean(request.headers['x-tenant-id'])
  }
}
