import { apiFetch, apiUrl } from '../../lib/apiClient'

export type ReportPair = {
  key: string
  count: number
}

export type ReportsRange = {
  from: string
  to: string
}

export type ReportsOverview = {
  range: ReportsRange
  scope: { tenantId?: string; isPlatform: boolean }
  totals: {
    customers: number
    conversations: number
    messages: number
    tickets: number
    openTickets: number
    resolvedTickets: number
    appointments: number
    upcomingAppointments: number
    connectedChannels: number
  }
}

export type ConversationsReport = {
  range: ReportsRange
  byChannel: ReportPair[]
  byStatus: ReportPair[]
  unreadCount: number
  messagesCount: number
}

export type TicketsReport = {
  range: ReportsRange
  byStatus: ReportPair[]
  byPriority: ReportPair[]
  byCategory: ReportPair[]
}

export type AppointmentsReport = {
  range: ReportsRange
  byStatus: ReportPair[]
  upcomingAppointments: number
  noShowCount: number
}

export type ChannelsReport = {
  range: ReportsRange
  byStatus: ReportPair[]
  byType: ReportPair[]
  connectedChannels: number
  placeholderChannels: Array<{ type: string; status: string }>
  whatsappReady: boolean
}

export type UsageTenant = {
  tenantId: string
  tenantName: string
  plan: string
  maxUsers: number
  maxChannels: number
  monthlyConversationLimit: number
  usersCount: number
  channelsCount: number
  monthlyConversationsCount: number
  monthlyMessagesCount: number
}

export type UsageReport = {
  range: ReportsRange
  platform: boolean
  tenants?: UsageTenant[]
  tenant?: UsageTenant | null
}

export type ReportsBundle = {
  overview: ReportsOverview
  conversations: ConversationsReport
  tickets: TicketsReport
  appointments: AppointmentsReport
  channels: ChannelsReport
  usage: UsageReport
}

export type ReportFilters = {
  from?: string
  to?: string
  tenantId?: string
  channelType?: string
}

function buildQuery(filters: ReportFilters = {}) {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.tenantId) params.set('tenantId', filters.tenantId)
  if (filters.channelType) params.set('channelType', filters.channelType)
  return params.toString()
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchReport<T>(path: string, filters: ReportFilters = {}, fallback = 'تعذر تحميل التقرير') {
  const query = buildQuery(filters)
  return parseResponse<T>(await apiFetch(apiUrl(`/reports/${path}${query ? `?${query}` : ''}`)), fallback)
}

export async function fetchReportsBundle(filters: ReportFilters = {}): Promise<ReportsBundle> {
  const [overview, conversations, tickets, appointments, channels, usage] = await Promise.all([
    fetchReport<ReportsOverview>('overview', filters, 'تعذر تحميل ملخص التقارير'),
    fetchReport<ConversationsReport>('conversations', filters, 'تعذر تحميل تقرير المحادثات'),
    fetchReport<TicketsReport>('tickets', filters, 'تعذر تحميل تقرير التذاكر'),
    fetchReport<AppointmentsReport>('appointments', filters, 'تعذر تحميل تقرير المواعيد'),
    fetchReport<ChannelsReport>('channels', filters, 'تعذر تحميل تقرير القنوات'),
    fetchReport<UsageReport>('usage', filters, 'تعذر تحميل تقرير الاستخدام'),
  ])
  return { overview, conversations, tickets, appointments, channels, usage }
}
