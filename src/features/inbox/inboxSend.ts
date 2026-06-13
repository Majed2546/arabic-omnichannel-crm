import { apiFetch, apiUrl } from '../../lib/apiClient'
import { requireTenantId } from '../../tenants/tenantUtils'

type SendWhatsAppResponse = {
  queued?: boolean
  messageId?: string
  status?: string
}

type DirectWhatsAppResponse = Record<string, unknown>

async function parseResponseBody(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) return payload
  if (typeof payload !== 'object' || payload === null) return fallback

  const record = payload as Record<string, unknown>
  if (typeof record.message === 'string') return record.message
  if (Array.isArray(record.message)) return record.message.join('، ')
  if (typeof record.error === 'string') return record.error

  return fallback
}

async function postJson<TResponse>(path: string, body: Record<string, unknown>): Promise<TResponse> {
  const response = await apiFetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await parseResponseBody(response)

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `فشل الطلب (${response.status})`))
  }

  return payload as TResponse
}

function normalizeWhatsAppRecipient(value: string) {
  return value.replace(/[^\d]/g, '')
}

export function sendConversationWhatsAppMessage(input: {
  conversationId: string
  recipient: string
  message: string
}) {
  const recipient = normalizeWhatsAppRecipient(input.recipient)

  if (!recipient) {
    throw new Error('لا يوجد رقم واتساب صالح لهذه المحادثة')
  }

  return postJson<SendWhatsAppResponse>('/whatsapp/send', {
    tenantId: requireTenantId(),
    conversationId: input.conversationId,
    recipient,
    message: input.message,
    messageType: 'text',
  })
}

export function sendDirectWhatsAppTest(input: {
  to: string
  message: string
}) {
  const to = normalizeWhatsAppRecipient(input.to)

  if (!to) {
    throw new Error('رقم واتساب غير صالح')
  }

  return postJson<DirectWhatsAppResponse>('/whatsapp/send/direct-test', {
    to,
    message: input.message,
  })
}
