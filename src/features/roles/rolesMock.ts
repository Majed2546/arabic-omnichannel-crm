export type PermissionKey = 'dashboard' | 'tenants' | 'users' | 'roles' | 'channels' | 'inbox' | 'whatsapp' | 'reports'

export type PermissionDefinition = {
  key: PermissionKey
  label: string
}

export type CrmRole = {
  id: string
  name: string
  description: string
  usersCount: number
  permissions: Record<PermissionKey, boolean>
}

export const permissionDefinitions: PermissionDefinition[] = [
  { key: 'dashboard', label: 'لوحة القيادة' },
  { key: 'tenants', label: 'إدارة المستأجرين' },
  { key: 'users', label: 'إدارة المستخدمين' },
  { key: 'roles', label: 'الأدوار والصلاحيات' },
  { key: 'channels', label: 'القنوات' },
  { key: 'inbox', label: 'صندوق الوارد' },
  { key: 'whatsapp', label: 'واتساب' },
  { key: 'reports', label: 'التقارير' },
]
