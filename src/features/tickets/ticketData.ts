import { apiFetch, apiUrl } from '../../lib/apiClient'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type Ticket = {
  id: string
  tenantId: string
  customerId?: string | null
  conversationId?: string | null
  assignedUserId?: string | null
  title: string
  description?: string | null
  status: TicketStatus
  priority: TicketPriority
  category?: string | null
  tags: string[]
  dueAt?: string | null
  createdAt: string
  updatedAt: string
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  conversationPreview?: string | null
  conversationStatus?: string | null
  assignedUserName?: string | null
}

export type TicketPayload = {
  customerId?: string
  conversationId?: string
  assignedUserId?: string
  title: string
  description?: string
  status?: TicketStatus
  priority?: TicketPriority
  category?: string
  tags?: string[]
  dueAt?: string
}

export async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchTickets(filters: { status?: string; priority?: string; category?: string; customerId?: string; assignedUserId?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.category) params.set('category', filters.category)
  if (filters.customerId) params.set('customerId', filters.customerId)
  if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId)
  const query = params.toString()
  return parseResponse<Ticket[]>(await apiFetch(apiUrl(`/tickets${query ? `?${query}` : ''}`)), 'تعذر تحميل التذاكر')
}

export async function createTicket(payload: TicketPayload) {
  return parseResponse<Ticket>(await apiFetch(apiUrl('/tickets'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر إنشاء التذكرة')
}

export async function updateTicket(id: string, payload: TicketPayload) {
  return parseResponse<Ticket>(await apiFetch(apiUrl(`/tickets/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر تحديث التذكرة')
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  return parseResponse<Ticket>(await apiFetch(apiUrl(`/tickets/${id}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }), 'تعذر تحديث حالة التذكرة')
}

export async function deleteTicket(id: string) {
  return parseResponse<{ deleted: boolean; id: string }>(await apiFetch(apiUrl(`/tickets/${id}`), {
    method: 'DELETE',
  }), 'تعذر حذف التذكرة')
}
