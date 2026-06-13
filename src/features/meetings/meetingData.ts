import { apiFetch, apiUrl } from '../../lib/apiClient'

export type MeetingProvider = 'ZOOM' | 'WEBEX' | 'TEAMS' | 'GOOGLE_MEET' | 'CUSTOM'
export type MeetingStatus = 'NOT_CREATED' | 'LINK_ADDED' | 'SENT' | 'COMPLETED' | 'CANCELLED'

export type Meeting = {
  id: string
  tenantId: string
  appointmentId: string
  customerId: string
  conversationId?: string | null
  provider: MeetingProvider
  meetingLink: string
  meetingId?: string | null
  status: MeetingStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
  appointmentTitle?: string | null
  appointmentStartAt?: string | null
  appointmentEndAt?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
}

export type MeetingPayload = {
  appointmentId: string
  provider: MeetingProvider
  meetingLink: string
  meetingId?: string
  status?: MeetingStatus
  notes?: string
}

export const meetingProviderLabels: Record<MeetingProvider, string> = {
  ZOOM: 'زووم',
  WEBEX: 'ويبكس',
  TEAMS: 'تيمز',
  GOOGLE_MEET: 'Google Meet',
  CUSTOM: 'رابط مخصص',
}

export const meetingStatusLabels: Record<MeetingStatus, string> = {
  NOT_CREATED: 'لم ينشأ',
  LINK_ADDED: 'تمت إضافة الرابط',
  SENT: 'تم الإرسال',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchMeetings(filters: { provider?: string; status?: string; customerId?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.provider) params.set('provider', filters.provider)
  if (filters.status) params.set('status', filters.status)
  if (filters.customerId) params.set('customerId', filters.customerId)
  const query = params.toString()
  return parseResponse<Meeting[]>(await apiFetch(apiUrl(`/meetings${query ? `?${query}` : ''}`)), 'تعذر تحميل الاجتماعات المرئية')
}

export async function createMeeting(payload: MeetingPayload) {
  return parseResponse<Meeting>(await apiFetch(apiUrl('/meetings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر إنشاء الاجتماع')
}

export async function updateMeeting(id: string, payload: MeetingPayload) {
  return parseResponse<Meeting>(await apiFetch(apiUrl(`/meetings/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر تحديث الاجتماع')
}

export async function updateMeetingStatus(id: string, status: MeetingStatus) {
  return parseResponse<Meeting>(await apiFetch(apiUrl(`/meetings/${id}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }), 'تعذر تحديث حالة الاجتماع')
}
