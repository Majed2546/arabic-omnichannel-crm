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

export const mockRoles: CrmRole[] = [
  {
    id: 'admin',
    name: 'مدير النظام',
    description: 'تحكم كامل في المنصة، الصلاحيات، التكاملات وإعدادات المستأجر.',
    usersCount: 2,
    permissions: {
      dashboard: true,
      tenants: true,
      users: true,
      roles: true,
      channels: true,
      inbox: true,
      whatsapp: true,
      reports: true,
    },
  },
  {
    id: 'operations-manager',
    name: 'مدير العمليات',
    description: 'إدارة الفرق التشغيلية والقنوات ومراجعة جودة الخدمة اليومية.',
    usersCount: 4,
    permissions: {
      dashboard: true,
      tenants: false,
      users: true,
      roles: false,
      channels: true,
      inbox: true,
      whatsapp: true,
      reports: true,
    },
  },
  {
    id: 'support-agent',
    name: 'موظف الدعم',
    description: 'متابعة المحادثات والرد على العملاء ضمن القنوات المصرح بها.',
    usersCount: 18,
    permissions: {
      dashboard: true,
      tenants: false,
      users: false,
      roles: false,
      channels: false,
      inbox: true,
      whatsapp: false,
      reports: false,
    },
  },
  {
    id: 'whatsapp-supervisor',
    name: 'مشرف واتساب',
    description: 'إشراف على إعداد واتساب، القوالب، الويب هوك وجودة المحادثات.',
    usersCount: 6,
    permissions: {
      dashboard: true,
      tenants: false,
      users: false,
      roles: false,
      channels: true,
      inbox: true,
      whatsapp: true,
      reports: true,
    },
  },
]
