export const CRM_PERMISSIONS = [
  'dashboard.view',
  'inbox.view',
  'inbox.reply',
  'inbox.assign',
  'customers.view',
  'customers.manage',
  'appointments.view',
  'appointments.manage',
  'meetings.view',
  'meetings.manage',
  'tickets.view',
  'tickets.manage',
  'channels.view',
  'channels.manage',
  'templates.view',
  'templates.manage',
  'agents.view',
  'agents.manage',
  'automation.view',
  'automation.manage',
  'reports.view',
  'reports.export',
  'roles.view',
  'roles.manage',
  'settings.view',
  'settings.manage',
] as const

export type CrmPermission = (typeof CRM_PERMISSIONS)[number]
export type AuthUserRole = 'admin' | 'support' | 'analyst'

export const ROLE_PERMISSIONS: Record<AuthUserRole, CrmPermission[]> = {
  admin: [...CRM_PERMISSIONS],
  support: [
    'dashboard.view',
    'inbox.view',
    'inbox.reply',
    'inbox.assign',
    'customers.view',
    'customers.manage',
    'appointments.view',
    'appointments.manage',
    'meetings.view',
    'meetings.manage',
    'tickets.view',
    'tickets.manage',
    'channels.view',
    'templates.view',
    'agents.view',
  ],
  analyst: [
    'dashboard.view',
    'inbox.view',
    'customers.view',
    'appointments.view',
    'meetings.view',
    'tickets.view',
    'channels.view',
    'templates.view',
    'agents.view',
    'automation.view',
    'reports.view',
    'reports.export',
  ],
}

export const ROLE_LABELS: Record<AuthUserRole, string> = {
  admin: 'مدير النظام',
  support: 'مشرف الدعم',
  analyst: 'محلل بيانات',
}

export function mapExternalRolesToLocalRole(roles: string[]): AuthUserRole {
  const normalizedRoles = roles.map((role) => role.toLowerCase())
  if (normalizedRoles.some((role) => ['admin', 'crm_admin', 'crm-admin'].includes(role))) return 'admin'
  if (normalizedRoles.some((role) => ['analyst', 'crm_analyst', 'crm-analyst', 'reports'].includes(role))) return 'analyst'
  return 'support'
}

export function hasPermission(userPermissions: string[] | undefined, permission: CrmPermission) {
  return Boolean(userPermissions?.includes(permission))
}
