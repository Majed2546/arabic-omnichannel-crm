import { apiFetch, apiUrl } from '../../lib/apiClient'

export type SlaStatus = 'ON_TRACK' | 'WARNING' | 'BREACHED' | 'PAUSED' | 'MET'
export type SlaItemType = 'conversation' | 'ticket'

export type SlaOverview = {
  onTrack: number
  warning: number
  breached: number
  met: number
  paused: number
  averageFirstResponseMinutes: number
  averageResolutionMinutes: number
}

export type SlaItem = {
  type: SlaItemType
  id: string
  customer: string
  dueAt?: string | null
  status: SlaStatus
  assignedUser?: string | null
  assignedTeam?: string | null
  assignedUserId?: string | null
  assignedTeamId?: string | null
  priority?: string | null
}

export type SlaFilters = {
  type?: string
  status?: string
  assignedUserId?: string
  assignedTeamId?: string
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

function buildQuery(filters: SlaFilters = {}) {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.status) params.set('status', filters.status)
  if (filters.assignedUserId) params.set('assignedUserId', filters.assignedUserId)
  if (filters.assignedTeamId) params.set('assignedTeamId', filters.assignedTeamId)
  return params.toString()
}

export async function fetchSlaOverview() {
  return parseResponse<SlaOverview>(await apiFetch(apiUrl('/sla/overview')), 'تعذر تحميل ملخص SLA')
}

export async function fetchSlaItems(filters: SlaFilters = {}) {
  const query = buildQuery(filters)
  return parseResponse<SlaItem[]>(await apiFetch(apiUrl(`/sla/items${query ? `?${query}` : ''}`)), 'تعذر تحميل عناصر SLA')
}

export async function checkSlaEscalations() {
  return parseResponse<{ checked: number; escalations: number; notificationsAttempted: number }>(
    await apiFetch(apiUrl('/sla/check-escalations'), { method: 'POST' }),
    'تعذر فحص التصعيد',
  )
}
