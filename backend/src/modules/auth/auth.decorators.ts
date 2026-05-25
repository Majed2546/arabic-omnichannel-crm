import { SetMetadata } from '@nestjs/common'
import type { CrmPermission, CrmRole } from './permissions'

export const IS_PUBLIC_KEY = 'isPublic'
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions'
export const REQUIRED_ROLES_KEY = 'requiredRoles'
export const REQUIRE_PLATFORM_ADMIN_KEY = 'requirePlatformAdmin'

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
export const RequirePermissions = (...permissions: CrmPermission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions)
export const RequireRoles = (...roles: CrmRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles)
export const RequirePlatformAdmin = () => SetMetadata(REQUIRE_PLATFORM_ADMIN_KEY, true)
