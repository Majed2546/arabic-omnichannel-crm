import { apiFetch, apiUrl } from '../../lib/apiClient'

export type QuickReply = {
  id: string
  tenantId: string
  title: string
  content: string
  category?: string | null
  channelType?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type WhatsAppTemplateStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

export type WhatsAppTemplate = {
  id: string
  tenantId: string
  name: string
  language: string
  category: string
  status: WhatsAppTemplateStatus
  body: string
  variables: string[]
  channelType: 'WHATSAPP'
  metaTemplateId?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

export type QuickReplyPayload = {
  title: string
  content: string
  category?: string
  channelType?: string
  isActive?: boolean
}

export type WhatsAppTemplatePayload = {
  name: string
  language: string
  category: string
  body: string
  variables: string[]
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchQuickReplies(filters: { search?: string; isActive?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.isActive) params.set('isActive', filters.isActive)
  const query = params.toString()
  return parseResponse<QuickReply[]>(await apiFetch(apiUrl(`/quick-replies${query ? `?${query}` : ''}`)), 'تعذر تحميل الردود الجاهزة')
}

export async function createQuickReply(payload: QuickReplyPayload) {
  return parseResponse<QuickReply>(await apiFetch(apiUrl('/quick-replies'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر إنشاء الرد الجاهز')
}

export async function updateQuickReply(id: string, payload: QuickReplyPayload) {
  return parseResponse<QuickReply>(await apiFetch(apiUrl(`/quick-replies/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر تحديث الرد الجاهز')
}

export async function setQuickReplyActive(id: string, isActive: boolean) {
  return parseResponse<QuickReply>(await apiFetch(apiUrl(`/quick-replies/${id}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  }), 'تعذر تحديث حالة الرد الجاهز')
}

export async function fetchWhatsAppTemplates(filters: { search?: string; status?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.search?.trim()) params.set('search', filters.search.trim())
  if (filters.status) params.set('status', filters.status)
  const query = params.toString()
  return parseResponse<WhatsAppTemplate[]>(await apiFetch(apiUrl(`/whatsapp-templates${query ? `?${query}` : ''}`)), 'تعذر تحميل قوالب واتساب')
}

export async function createWhatsAppTemplate(payload: WhatsAppTemplatePayload) {
  return parseResponse<WhatsAppTemplate>(await apiFetch(apiUrl('/whatsapp-templates'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر إنشاء قالب واتساب')
}

export async function updateWhatsAppTemplate(id: string, payload: WhatsAppTemplatePayload) {
  return parseResponse<WhatsAppTemplate>(await apiFetch(apiUrl(`/whatsapp-templates/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر تحديث قالب واتساب')
}

export async function submitWhatsAppTemplate(id: string) {
  return parseResponse<WhatsAppTemplate & { placeholder?: boolean; message?: string }>(await apiFetch(apiUrl(`/whatsapp-templates/${id}/submit`), {
    method: 'POST',
  }), 'تعذر إرسال القالب للمراجعة')
}
