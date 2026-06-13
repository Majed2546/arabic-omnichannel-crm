import { ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AuthMode, AuthenticatedUser } from '../modules/auth/auth.types'

export const DEFAULT_TENANT_ID = 'default-tenant'

@Injectable()
export class TenantAccessService {
  constructor(private readonly config: ConfigService) {}

  isSuperAdmin(user?: AuthenticatedUser) {
    return user?.platformRole === 'SUPER_ADMIN'
  }

  getCurrentTenantId(input: { requestedTenantId?: string; user?: AuthenticatedUser }) {
    const authMode = this.config.get<AuthMode>('auth.mode') ?? 'local'
    if (this.isSuperAdmin(input.user)) {
      return input.requestedTenantId || input.user?.tenantId || DEFAULT_TENANT_ID
    }

    if (authMode !== 'keycloak') {
      return input.requestedTenantId || input.user?.tenantId || DEFAULT_TENANT_ID
    }

    return input.user?.tenantId || input.requestedTenantId || DEFAULT_TENANT_ID
  }

  requireTenantAccess(input: { requestedTenantId?: string; user?: AuthenticatedUser }) {
    const tenantId = this.getCurrentTenantId(input)
    if (this.isSuperAdmin(input.user)) return tenantId

    if (!input.user?.tenantId || input.user.tenantId !== tenantId) {
      throw new ForbiddenException('Tenant access denied')
    }

    return tenantId
  }
}
