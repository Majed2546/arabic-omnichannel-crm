import { apiFetch, apiUrl } from '../../lib/apiClient'

export type AutomationTriggerType =
  | 'NEW_MESSAGE'
  | 'CONVERSATION_UNASSIGNED'
  | 'SLA_BREACHED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_DUE_SOON'
  | 'TICKET_CREATED'
  | 'TICKET_STATUS_CHANGED'

export type AutomationLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED'

export type AutomationActionType =
  | 'assign_conversation'
  | 'add_tag'
  | 'create_ticket'
  | 'send_quick_reply'
  | 'send_template'
  | 'notify_agent'

export type AutomationAction = {
  type: AutomationActionType
  label?: string
  value?: string
}

export type AutomationRule = {
  id: string
  tenantId: string
  name: string
  description?: string | null
  triggerType: AutomationTriggerType
  conditions?: Record<string, unknown> | null
  actions: AutomationAction[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastRunStatus?: AutomationLogStatus | null
  lastRunMessage?: string | null
  lastRunAt?: string | null
}

export type AutomationLog = {
  id: string
  tenantId: string
  ruleId?: string | null
  ruleName?: string | null
  triggerType: AutomationTriggerType
  targetType: string
  targetId: string
  status: AutomationLogStatus
  message?: string | null
  createdAt: string
}

export type AutomationRulePayload = {
  name: string
  description?: string
  triggerType: AutomationTriggerType
  conditions?: Record<string, unknown>
  actions: AutomationAction[]
  isActive?: boolean
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchAutomationRules(filters: { triggerType?: string; isActive?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.triggerType) params.set('triggerType', filters.triggerType)
  if (filters.isActive) params.set('isActive', filters.isActive)
  const query = params.toString()
  return parseResponse<AutomationRule[]>(await apiFetch(apiUrl(`/automation/rules${query ? `?${query}` : ''}`)), 'تعذر تحميل قواعد الأتمتة')
}

export async function fetchAutomationLogs(filters: { triggerType?: string; status?: string; ruleId?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.triggerType) params.set('triggerType', filters.triggerType)
  if (filters.status) params.set('status', filters.status)
  if (filters.ruleId) params.set('ruleId', filters.ruleId)
  const query = params.toString()
  return parseResponse<AutomationLog[]>(await apiFetch(apiUrl(`/automation/logs${query ? `?${query}` : ''}`)), 'تعذر تحميل سجل الأتمتة')
}

export async function createAutomationRule(payload: AutomationRulePayload) {
  return parseResponse<AutomationRule>(await apiFetch(apiUrl('/automation/rules'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر إنشاء قاعدة الأتمتة')
}

export async function updateAutomationRule(id: string, payload: AutomationRulePayload) {
  return parseResponse<AutomationRule>(await apiFetch(apiUrl(`/automation/rules/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر تحديث قاعدة الأتمتة')
}

export async function toggleAutomationRule(id: string, isActive?: boolean) {
  return parseResponse<AutomationRule>(await apiFetch(apiUrl(`/automation/rules/${id}/toggle`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(typeof isActive === 'boolean' ? { isActive } : {}),
  }), 'تعذر تغيير حالة القاعدة')
}

export async function testAutomationRule(id: string) {
  return parseResponse<AutomationLog>(await apiFetch(apiUrl(`/automation/rules/${id}/test`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType: 'manual_test', targetId: 'manual' }),
  }), 'تعذر اختبار القاعدة')
}

export async function deleteAutomationRule(id: string) {
  return parseResponse<{ deleted: boolean; id: string }>(await apiFetch(apiUrl(`/automation/rules/${id}`), {
    method: 'DELETE',
  }), 'تعذر حذف قاعدة الأتمتة')
}
