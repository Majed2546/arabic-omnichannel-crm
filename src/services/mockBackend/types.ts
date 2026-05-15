export type RequestStatus = 'idle' | 'loading' | 'success' | 'error'

export type AsyncResource<T> = {
  status: RequestStatus
  data: T | null
  error: string | null
}

export type MockRequestOptions = {
  delayMs?: number
  shouldFail?: boolean
}

export type TenantStatus = 'active' | 'suspended' | 'trial'

export type MockTenant = {
  id: string
  name: string
  domain: string
  plan: 'Starter' | 'Growth' | 'Enterprise'
  status: TenantStatus
  contacts: number
  createdAt: string
}

export type UserStatus = 'active' | 'invited' | 'disabled'

export type MockUser = {
  id: string
  tenantId: string
  name: string
  email: string
  roleId: string
  team: string
  status: UserStatus
  lastSeenAt: string
}

export type PermissionKey = 'dashboard' | 'tenants' | 'users' | 'roles' | 'channels' | 'inbox' | 'whatsapp' | 'reports'

export type MockRole = {
  id: string
  name: string
  description: string
  usersCount: number
  permissions: Record<PermissionKey, boolean>
}

export type ConversationStatus = 'جديد' | 'قيد المعالجة' | 'مغلق'
export type ConversationPriority = 'عاجل' | 'مرتفع' | 'عادي'

export type MockConversation = {
  id: string
  tenantId: string
  customerName: string
  customerCompany: string
  customerEmail: string
  channel: 'WhatsApp' | 'Email' | 'Web Chat' | 'SMS'
  status: ConversationStatus
  priority: ConversationPriority
  lastMessage: string
  preview: string[]
  owner: string
  updatedAt: string
}

export type ChannelStatus = 'connected' | 'needs_setup' | 'paused'

export type MockChannel = {
  id: string
  tenantId: string
  type: 'WhatsApp' | 'Email' | 'Web Chat' | 'SMS'
  label: string
  status: ChannelStatus
  lastSyncAt: string
  assignedTeam: string
}

export type WhatsAppStepStatus = 'complete' | 'in_progress' | 'pending'

export type MockWhatsAppStep = {
  id: string
  title: string
  description: string
  status: WhatsAppStepStatus
}

export type MockWhatsAppOnboarding = {
  tenantId: string
  businessNumber: string
  metaVerificationStatus: string
  webhookStatus: string
  qrReference: string
  steps: MockWhatsAppStep[]
}

export type MockAnalytics = {
  tenantId: string
  totalConversations: number
  openConversations: number
  connectedChannels: number
  activeUsers: number
  averageResponseMinutes: number
  satisfactionScore: number
}

export type TenantScopedRequest = {
  tenantId?: string
}

export type TenantsService = {
  list: (options?: MockRequestOptions) => Promise<MockTenant[]>
  getById: (tenantId: string, options?: MockRequestOptions) => Promise<MockTenant>
}

export type UsersService = {
  list: (request?: TenantScopedRequest & MockRequestOptions) => Promise<MockUser[]>
}

export type RolesService = {
  list: (options?: MockRequestOptions) => Promise<MockRole[]>
}

export type ConversationsService = {
  list: (request?: TenantScopedRequest & MockRequestOptions) => Promise<MockConversation[]>
}

export type ChannelsService = {
  list: (request?: TenantScopedRequest & MockRequestOptions) => Promise<MockChannel[]>
}

export type WhatsAppService = {
  getOnboarding: (request?: TenantScopedRequest & MockRequestOptions) => Promise<MockWhatsAppOnboarding>
}

export type AnalyticsService = {
  getOverview: (request?: TenantScopedRequest & MockRequestOptions) => Promise<MockAnalytics>
}

export type CrmBackendServices = {
  tenants: TenantsService
  users: UsersService
  roles: RolesService
  conversations: ConversationsService
  channels: ChannelsService
  whatsapp: WhatsAppService
  analytics: AnalyticsService
}

