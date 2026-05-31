import { PermissionCategory } from '@prisma/client'
import type { CrmPermission } from '../auth/permissions'
import { CRM_PERMISSIONS } from '../auth/permissions'

export type DefaultRoleKey = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SUPERVISOR' | 'AGENT' | 'VIEWER'

export const PERMISSION_CATEGORY_BY_PREFIX: Record<string, PermissionCategory> = {
  dashboard: PermissionCategory.DASHBOARD,
  inbox: PermissionCategory.INBOX,
  customers: PermissionCategory.USERS,
  tickets: PermissionCategory.SYSTEM,
  appointments: PermissionCategory.SYSTEM,
  meetings: PermissionCategory.SYSTEM,
  channels: PermissionCategory.CHANNELS,
  templates: PermissionCategory.WHATSAPP,
  agents: PermissionCategory.USERS,
  users: PermissionCategory.USERS,
  automation: PermissionCategory.AUTOMATION,
  reports: PermissionCategory.REPORTS,
  billing: PermissionCategory.SYSTEM,
  roles: PermissionCategory.SYSTEM,
  settings: PermissionCategory.SYSTEM,
}

const allPermissions = [...CRM_PERMISSIONS]

export const DEFAULT_ROLE_PERMISSIONS: Record<DefaultRoleKey, CrmPermission[]> = {
  SUPER_ADMIN: allPermissions,
  COMPANY_ADMIN: allPermissions,
  SUPERVISOR: [
    'dashboard.view',
    'inbox.view',
    'inbox.reply',
    'inbox.assign',
    'customers.view',
    'customers.manage',
    'tickets.view',
    'tickets.manage',
    'appointments.view',
    'appointments.manage',
    'meetings.view',
    'meetings.manage',
    'channels.view',
    'templates.view',
    'templates.manage',
    'agents.view',
    'users.view',
    'automation.view',
    'reports.view',
    'billing.view',
  ],
  AGENT: [
    'dashboard.view',
    'inbox.view',
    'inbox.reply',
    'customers.view',
    'tickets.view',
    'tickets.manage',
    'appointments.view',
    'appointments.manage',
    'meetings.view',
    'templates.view',
  ],
  VIEWER: [
    'dashboard.view',
    'inbox.view',
    'customers.view',
    'tickets.view',
    'appointments.view',
    'meetings.view',
    'channels.view',
    'templates.view',
    'automation.view',
    'reports.view',
    'billing.view',
    'settings.view',
    'users.view',
    'roles.view',
  ],
}

export const DEFAULT_TENANT_ROLE_NAMES: DefaultRoleKey[] = ['COMPANY_ADMIN', 'SUPERVISOR', 'AGENT', 'VIEWER']

export function categoryForPermission(key: string) {
  const prefix = key.split('.')[0] ?? 'settings'
  return PERMISSION_CATEGORY_BY_PREFIX[prefix] ?? PermissionCategory.SYSTEM
}
