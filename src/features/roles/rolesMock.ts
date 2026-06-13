import { CRM_PERMISSIONS, ROLE_PERMISSIONS, type AuthUserRole, type CrmPermission } from '../../auth/permissions'

export type PermissionKey = CrmPermission

export type PermissionDefinition = {
  key: PermissionKey
  label: string
  group: string
}

export type CrmRole = {
  id: AuthUserRole
  name: string
  description: string
  usersCount: number
  permissions: Record<PermissionKey, boolean>
  keycloakRoles: string[]
}

const permissionLabels: Record<PermissionKey, { label: string; group: string }> = {
  'dashboard.view': { label: 'عرض الملخص التنفيذي', group: 'الملخص التنفيذي' },
  'inbox.view': { label: 'عرض الوارد', group: 'الوارد' },
  'inbox.reply': { label: 'الرد على المحادثات', group: 'الوارد' },
  'inbox.assign': { label: 'إسناد المحادثات', group: 'الوارد' },
  'customers.view': { label: 'عرض العملاء', group: 'العملاء' },
  'customers.manage': { label: 'إدارة العملاء', group: 'العملاء' },
  'appointments.view': { label: 'عرض المواعيد', group: 'المواعيد' },
  'appointments.manage': { label: 'إدارة المواعيد', group: 'المواعيد' },
  'meetings.view': { label: 'عرض الاجتماعات', group: 'الاجتماعات' },
  'meetings.manage': { label: 'إدارة الاجتماعات', group: 'الاجتماعات' },
  'tickets.view': { label: 'عرض التذاكر', group: 'التذاكر' },
  'tickets.manage': { label: 'إدارة التذاكر', group: 'التذاكر' },
  'channels.view': { label: 'عرض القنوات', group: 'القنوات' },
  'channels.manage': { label: 'إدارة القنوات', group: 'القنوات' },
  'templates.view': { label: 'عرض القوالب', group: 'القوالب' },
  'templates.manage': { label: 'إدارة القوالب', group: 'القوالب' },
  'agents.view': { label: 'عرض الوكلاء', group: 'الفريق' },
  'agents.manage': { label: 'إدارة الوكلاء', group: 'الفريق' },
  'users.view': { label: 'عرض المستخدمين', group: 'المستخدمون' },
  'users.manage': { label: 'إدارة المستخدمين', group: 'المستخدمون' },
  'automation.view': { label: 'عرض الأتمتة', group: 'الأتمتة' },
  'automation.manage': { label: 'إدارة الأتمتة', group: 'الأتمتة' },
  'reports.view': { label: 'عرض التقارير', group: 'التقارير' },
  'reports.export': { label: 'تصدير التقارير', group: 'التقارير' },
  'billing.view': { label: 'عرض الاشتراكات', group: 'الاشتراكات' },
  'billing.manage': { label: 'إدارة الاشتراكات', group: 'الاشتراكات' },
  'roles.view': { label: 'عرض الأدوار', group: 'الصلاحيات' },
  'roles.manage': { label: 'إدارة الأدوار', group: 'الصلاحيات' },
  'settings.view': { label: 'عرض الإعدادات', group: 'الإعدادات' },
  'settings.manage': { label: 'إدارة الإعدادات', group: 'الإعدادات' },
  'notifications.view': { label: 'عرض الإشعارات', group: 'الإشعارات' },
  'notifications.manage': { label: 'إدارة الإشعارات', group: 'الإشعارات' },
  'bot.view': { label: 'عرض وكيل واتساب', group: 'وكيل واتساب' },
  'bot.manage': { label: 'إدارة وكيل واتساب', group: 'وكيل واتساب' },
}

export const permissionDefinitions: PermissionDefinition[] = CRM_PERMISSIONS.map((key) => ({
  key,
  ...permissionLabels[key],
}))

function permissionsRecord(role: AuthUserRole) {
  const enabled = new Set(ROLE_PERMISSIONS[role])
  return CRM_PERMISSIONS.reduce<Record<PermissionKey, boolean>>((record, permission) => {
    record[permission] = enabled.has(permission)
    return record
  }, {} as Record<PermissionKey, boolean>)
}

export const crmRoles: CrmRole[] = [
  {
    id: 'admin',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة لإدارة الهوية والقنوات والأدوار والإعدادات.',
    usersCount: 0,
    permissions: permissionsRecord('admin'),
    keycloakRoles: ['admin', 'crm-admin', 'crm_admin'],
  },
  {
    id: 'support',
    name: 'مشرف الدعم',
    description: 'تشغيل صندوق الوارد وخدمة العملاء وإسناد المحادثات اليومية.',
    usersCount: 0,
    permissions: permissionsRecord('support'),
    keycloakRoles: ['support', 'crm-support', 'agent'],
  },
  {
    id: 'analyst',
    name: 'محلل البيانات',
    description: 'قراءة تشغيلية وتحليلية دون صلاحيات تغيير الإعدادات الحساسة.',
    usersCount: 0,
    permissions: permissionsRecord('analyst'),
    keycloakRoles: ['analyst', 'crm-analyst', 'reports'],
  },
]
