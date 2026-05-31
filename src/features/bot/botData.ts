import { apiFetch, apiUrl } from '../../lib/apiClient'

export type BotSettings = {
  id?: string
  tenantId: string
  isEnabled: boolean
  welcomeMessage: string
  handoffMessage: string
  appointmentEnabled: boolean
  ticketEnabled: boolean
  workingHoursOnly: boolean
  defaultAppointmentDurationMinutes: number
  defaultAssignedTeamId?: string | null
  defaultAssignedUserId?: string | null
}

export type BotStateStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'HANDED_OFF'
export type BotFlowType = 'MAIN_MENU' | 'BOOK_APPOINTMENT' | 'CREATE_TICKET' | 'HANDOFF'

export type ConversationBotState = {
  isEnabled: boolean
  state?: {
    id: string
    flowType: BotFlowType
    step: string
    status: BotStateStatus
    updatedAt: string
  } | null
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`${fallback}${detail ? `: ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchBotSettings() {
  return parseResponse<BotSettings>(await apiFetch(apiUrl('/bot/settings')), 'تعذر تحميل إعدادات الوكيل')
}

export async function updateBotSettings(payload: Partial<BotSettings>) {
  return parseResponse<BotSettings>(await apiFetch(apiUrl('/bot/settings'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }), 'تعذر حفظ إعدادات الوكيل')
}

export async function testBotMessage(message: string) {
  return parseResponse<{ enabled: boolean; detected: string; reply: string }>(await apiFetch(apiUrl('/bot/test-message'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  }), 'تعذر تجربة الرسالة')
}

export async function fetchConversationBotState(conversationId: string) {
  return parseResponse<ConversationBotState>(await apiFetch(apiUrl(`/bot/conversations/${conversationId}/state`)), 'تعذر تحميل حالة الوكيل')
}

export async function resetConversationBot(conversationId: string) {
  return parseResponse<{ reset: boolean }>(await apiFetch(apiUrl(`/bot/conversations/${conversationId}/reset`), { method: 'POST' }), 'تعذر إعادة تشغيل الوكيل')
}

export async function stopConversationBot(conversationId: string) {
  return parseResponse<{ stopped: boolean }>(await apiFetch(apiUrl(`/bot/conversations/${conversationId}/stop`), { method: 'POST' }), 'تعذر إيقاف الوكيل')
}

export async function handoffConversationBot(conversationId: string) {
  return parseResponse<{ handedOff: boolean }>(await apiFetch(apiUrl(`/bot/conversations/${conversationId}/handoff`), { method: 'POST' }), 'تعذر تحويل المحادثة')
}
