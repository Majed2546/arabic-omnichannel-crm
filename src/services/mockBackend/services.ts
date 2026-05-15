import { findOrThrow, mockRequest } from './client'
import {
  mockAnalytics,
  mockChannels,
  mockConversations,
  mockRoles,
  mockTenants,
  mockUsers,
  mockWhatsAppOnboarding,
} from './data'
import type {
  AnalyticsService,
  ChannelsService,
  ConversationsService,
  CrmBackendServices,
  MockAnalytics,
  MockRequestOptions,
  TenantScopedRequest,
  TenantsService,
  UsersService,
  RolesService,
  WhatsAppService,
} from './types'

function resolveTenantId(request?: TenantScopedRequest) {
  return request?.tenantId ?? mockTenants[0]?.id ?? 'tenant-riyadh'
}

function requestOptions(request?: MockRequestOptions) {
  return {
    delayMs: request?.delayMs,
    shouldFail: request?.shouldFail,
  }
}

export const tenantsService: TenantsService = {
  list: (options) => mockRequest(mockTenants, requestOptions(options)),
  getById: (tenantId, options) =>
    mockRequest(
      findOrThrow(mockTenants, (tenant) => tenant.id === tenantId, 'لم يتم العثور على المستأجر المطلوب.'),
      requestOptions(options),
    ),
}

export const usersService: UsersService = {
  list: (request) => {
    const tenantId = resolveTenantId(request)
    return mockRequest(
      mockUsers.filter((user) => user.tenantId === tenantId),
      requestOptions(request),
    )
  },
}

export const rolesService: RolesService = {
  list: (options) => mockRequest(mockRoles, requestOptions(options)),
}

export const conversationsService: ConversationsService = {
  list: (request) => {
    const tenantId = resolveTenantId(request)
    return mockRequest(
      mockConversations.filter((conversation) => conversation.tenantId === tenantId),
      requestOptions(request),
    )
  },
}

export const channelsService: ChannelsService = {
  list: (request) => {
    const tenantId = resolveTenantId(request)
    return mockRequest(
      mockChannels.filter((channel) => channel.tenantId === tenantId),
      requestOptions(request),
    )
  },
}

export const whatsappService: WhatsAppService = {
  getOnboarding: (request) => {
    const tenantId = resolveTenantId(request)
    return mockRequest(
      findOrThrow(
        mockWhatsAppOnboarding,
        (onboarding) => onboarding.tenantId === tenantId,
        'لا توجد بيانات إعداد واتساب لهذا المستأجر.',
      ),
      requestOptions(request),
    )
  },
}

function buildEmptyAnalytics(tenantId: string): MockAnalytics {
  return {
    tenantId,
    totalConversations: 0,
    openConversations: 0,
    connectedChannels: 0,
    activeUsers: 0,
    averageResponseMinutes: 0,
    satisfactionScore: 0,
  }
}

export const analyticsService: AnalyticsService = {
  getOverview: (request) => {
    const tenantId = resolveTenantId(request)
    const overview = mockAnalytics.find((analytics) => analytics.tenantId === tenantId) ?? buildEmptyAnalytics(tenantId)
    return mockRequest(overview, requestOptions(request))
  },
}

export const mockCrmBackend: CrmBackendServices = {
  tenants: tenantsService,
  users: usersService,
  roles: rolesService,
  conversations: conversationsService,
  channels: channelsService,
  whatsapp: whatsappService,
  analytics: analyticsService,
}

