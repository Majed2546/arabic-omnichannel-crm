import { apiFetch, apiUrl } from '../../lib/apiClient'

export type CustomerStatus = 'ACTIVE' | 'NEW' | 'VIP' | 'INACTIVE' | 'BLOCKED'
export type CustomerSourceChannel = 'WHATSAPP' | 'EMAIL' | 'WEBCHAT' | 'INSTAGRAM' | 'TELEGRAM' | 'SMS' | 'VOICE' | 'X'

export type CustomerConversation = {
  id: string
  status: string
  priority: string
  channel?: string | null
  channelType?: string | null
  channelName?: string | null
  queueName?: string | null
  lastMessagePreview?: string | null
  lastActivityDate?: string | null
  lastMessageAt?: string | null
  unreadCount: number
  createdAt: string
}

export type Customer = {
  id: string
  tenantId: string
  name: string
  phone?: string | null
  email?: string | null
  status: CustomerStatus
  tags: string[]
  sourceChannel?: CustomerSourceChannel | null
  notes?: string
  lastActivityAt?: string
  createdAt: string
  updatedAt: string
  conversationsCount: number
  conversations: CustomerConversation[]
}

export type CustomerFilters = {
  search?: string
  status?: string
  sourceChannel?: string
}

export type SaveCustomerPayload = {
  name: string
  phone?: string
  email?: string
  status?: CustomerStatus
  tags?: string[]
  sourceChannel?: CustomerSourceChannel
  notes?: string
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`تعذر تنفيذ طلب العملاء: ${response.status}${detail ? ` ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

function buildQuery(filters: CustomerFilters) {
  const params = new URLSearchParams()
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.status) params.set('status', filters.status)
  if (filters.sourceChannel) params.set('sourceChannel', filters.sourceChannel)
  params.set('limit', '100')
  return params.toString()
}

export async function fetchCustomers(filters: CustomerFilters = {}) {
  const query = buildQuery(filters)
  return parseResponse<Customer[]>(await apiFetch(apiUrl(`/customers${query ? `?${query}` : ''}`)))
}

export async function fetchCustomer(id: string) {
  return parseResponse<Customer>(await apiFetch(apiUrl(`/customers/${id}`)))
}

export async function fetchCustomerConversations(id: string) {
  return parseResponse<CustomerConversation[]>(await apiFetch(apiUrl(`/customers/${id}/conversations`)))
}

export async function createCustomer(payload: SaveCustomerPayload) {
  return parseResponse<Customer>(await apiFetch(apiUrl('/customers'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}

export async function updateCustomer(id: string, payload: SaveCustomerPayload) {
  return parseResponse<Customer>(await apiFetch(apiUrl(`/customers/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }))
}

export async function deleteCustomer(id: string) {
  return parseResponse<{ deleted: boolean; id: string }>(await apiFetch(apiUrl(`/customers/${id}`), {
    method: 'DELETE',
  }))
}
