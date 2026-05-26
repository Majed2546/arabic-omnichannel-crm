import { apiFetch, apiUrl } from '../../lib/apiClient'

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export type AppointmentMeetingType = 'IN_PERSON' | 'PHONE' | 'ONLINE'

export type Appointment = {
  id: string
  tenantId: string
  customerId: string
  conversationId?: string | null
  assignedUserId?: string | null
  title: string
  description?: string | null
  startAt: string
  endAt: string
  status: AppointmentStatus
  meetingType: AppointmentMeetingType
  meetingLink?: string | null
  visualMeetingId?: string | null
  meetingProvider?: string | null
  visualMeetingLink?: string | null
  meetingStatus?: string | null
  location?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  assignedUserName?: string | null
}

export type AppointmentPayload = {
  customerId: string
  conversationId?: string
  assignedUserId?: string
  title: string
  description?: string
  startAt: string
  endAt: string
  status?: AppointmentStatus
  meetingType: AppointmentMeetingType
  meetingLink?: string
  location?: string
  notes?: string
}

export type AppointmentFilters = {
  date?: string
  status?: string
  customerId?: string
  assignedUserId?: string
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

function buildQuery(filters: AppointmentFilters) {
  const params = new URLSearchParams()
  if (filters.date) params.set('date', filters.date)
  if (filters.status) params.set('status', filters.status)
  if (filters.customerId) params.set('customerId', filters.customerId)
  if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId)
  return params.toString()
}

export async function fetchAppointments(filters: AppointmentFilters = {}) {
  const query = buildQuery(filters)
  return parseResponse<Appointment[]>(await apiFetch(apiUrl(`/appointments${query ? `?${query}` : ''}`)), 'تعذر تحميل المواعيد')
}

export async function createAppointment(payload: AppointmentPayload) {
  return parseResponse<Appointment>(await apiFetch(apiUrl('/appointments'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر إنشاء الموعد')
}

export async function updateAppointment(id: string, payload: AppointmentPayload) {
  return parseResponse<Appointment>(await apiFetch(apiUrl(`/appointments/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر تحديث الموعد')
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  return parseResponse<Appointment>(await apiFetch(apiUrl(`/appointments/${id}/status`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  }), 'تعذر تحديث حالة الموعد')
}

export async function deleteAppointment(id: string) {
  return parseResponse<{ deleted: boolean; id: string }>(await apiFetch(apiUrl(`/appointments/${id}`), {
    method: 'DELETE',
  }), 'تعذر حذف الموعد')
}
