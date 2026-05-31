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
  'users.view',
  'users.manage',
  'automation.view',
  'automation.manage',
  'reports.view',
  'reports.export',
  'billing.view',
  'billing.manage',
  'roles.view',
  'roles.manage',
  'settings.view',
  'settings.manage',
  'notifications.view',
  'notifications.manage',
  'bot.view',
  'bot.manage',
] as const

export type CrmPermission = (typeof CRM_PERMISSIONS)[number]
export type CrmRole = 'admin' | 'support' | 'analyst'

const allPermissions = [...CRM_PERMISSIONS]

export const CRM_ROLE_PERMISSIONS: Record<CrmRole, CrmPermission[]> = {
  admin: allPermissions,
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
    'users.view',
    'notifications.view',
    'bot.view',
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
    'users.view',
    'automation.view',
    'reports.view',
    'reports.export',
    'billing.view',
    'settings.view',
    'notifications.view',
  ],
}

export const KEYCLOAK_ROLE_TO_CRM_ROLE: Record<string, CrmRole> = {
  admin: 'admin',
  crm_admin: 'admin',
  'crm-admin': 'admin',
  support: 'support',
  crm_support: 'support',
  'crm-support': 'support',
  agent: 'support',
  analyst: 'analyst',
  crm_analyst: 'analyst',
  'crm-analyst': 'analyst',
  reports: 'analyst',
}

export function mapExternalRolesToCrmRole(externalRoles: string[]): CrmRole {
  for (const role of externalRoles) {
    const mappedRole = KEYCLOAK_ROLE_TO_CRM_ROLE[role.toLowerCase()]
    if (mappedRole) return mappedRole
  }

  return 'support'
}

export function permissionsForRole(role: CrmRole) {
  return CRM_ROLE_PERMISSIONS[role]
}
