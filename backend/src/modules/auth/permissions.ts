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
