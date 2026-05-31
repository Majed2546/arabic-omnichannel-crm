import { apiFetch, apiUrl } from '../../lib/apiClient'

export type ApiNotificationType =
  | 'NEW_MESSAGE'
  | 'CONVERSATION_ASSIGNED'
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'APPOINTMENT_UPCOMING'
  | 'SLA_WARNING'
  | 'SLA_BREACHED'
  | 'MESSAGE_SEND_FAILED'
  | 'SUBSCRIPTION_WARNING'
  | 'AUTOMATION_EXECUTED'

export type ApiNotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'INFO' | 'WARNING' | 'CRITICAL'
export type ApiNotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED'

export type ApiNotification = {
  id: string
  tenantId: string
  userId?: string | null
  teamId?: string | null
  type: ApiNotificationType
  title: string
  message: string
  targetType?: string | null
  targetId?: string | null
  conversationId?: string | null
  status: ApiNotificationStatus
  priority: ApiNotificationPriority
  metadata?: Record<string, unknown> | null
  createdAt: string
  readAt?: string | null
}

export type NotificationFilters = {
  status?: string
  priority?: string
  type?: string
  limit?: number
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

function buildQuery(filters: NotificationFilters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.type) params.set('type', filters.type)
  if (filters.limit) params.set('limit', String(filters.limit))
  return params.toString()
}

export async function fetchNotifications(filters: NotificationFilters = {}) {
  const query = buildQuery(filters)
  return parseResponse<ApiNotification[]>(await apiFetch(apiUrl(`/notifications${query ? `?${query}` : ''}`)), 'تعذر تحميل الإشعارات')
}

export async function fetchUnreadNotificationsCount() {
  return parseResponse<{ count: number }>(await apiFetch(apiUrl('/notifications/unread-count')), 'تعذر تحميل عدد الإشعارات')
}

export async function markNotificationRead(id: string) {
  return parseResponse<ApiNotification>(await apiFetch(apiUrl(`/notifications/${id}/read`), { method: 'PATCH' }), 'تعذر تعليم الإشعار كمقروء')
}

export async function markAllNotificationsRead() {
  return parseResponse<{ updated: number }>(await apiFetch(apiUrl('/notifications/read-all'), { method: 'PATCH' }), 'تعذر تعليم الإشعارات كمقروءة')
}

export async function archiveNotification(id: string) {
  return parseResponse<ApiNotification>(await apiFetch(apiUrl(`/notifications/${id}/archive`), { method: 'PATCH' }), 'تعذر أرشفة الإشعار')
}

export async function createTestNotification() {
  return parseResponse<ApiNotification>(await apiFetch(apiUrl('/notifications/test'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priority: 'MEDIUM' }),
  }), 'تعذر إنشاء إشعار تجريبي')
}
