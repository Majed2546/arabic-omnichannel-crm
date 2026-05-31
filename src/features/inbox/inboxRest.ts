import { apiFetch, apiUrl } from '../../lib/apiClient'
import { getChannelLabel } from '../../shared/utils'
import type {
  AgentPresence,
  AssignmentState,
  Conversation,
  ConversationChannel,
  ConversationMessage,
  ConversationPriority,
  ConversationStatus,
  MessageDeliveryStatus,
  SupportQueue,
} from './inboxMock'

type RestChannel = {
  type?: string
  name?: string
}

type RestCustomer = {
  id?: string
  name?: string
  phone?: string | null
  email?: string | null
  metadata?: Record<string, unknown> | null
}

type RestConversation = {
  id: string
  status?: string
  priority?: string
  unreadCount?: number
  lastMessagePreview?: string | null
  lastMessageAt?: string | null
  updatedAt?: string
  createdAt?: string
  slaDeadline?: string | null
  firstResponseDueAt?: string | null
  resolutionDueAt?: string | null
  slaStatus?: 'ON_TRACK' | 'WARNING' | 'BREACHED' | 'PAUSED' | 'MET'
  customer?: RestCustomer | null
  channel?: RestChannel | null
  assignedUser?: { id: string; name: string } | null
  assignedTeam?: { id: string; name: string } | null
  queue?: { name: string } | null
}

type RestMessage = {
  id: string
  senderType?: string
  content?: string
  messageType?: string
  status?: string
  createdAt?: string
  metadata?: Record<string, unknown> | null
}

const channelMap: Record<string, ConversationChannel> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'Email',
  WEBCHAT: 'Web Chat',
  TELEGRAM: 'Telegram',
}

const statusMap: Record<string, ConversationStatus> = {
  OPEN: 'unread',
  ASSIGNED: 'assigned',
  PENDING_CUSTOMER: 'pending',
  PENDING_AGENT: 'pending',
  SLA_WARNING: 'sla_warning',
  SLA_BREACHED: 'sla_warning',
  RESOLVED: 'resolved',
  CLOSED: 'resolved',
}

const priorityMap: Record<string, ConversationPriority> = {
  NORMAL: 'normal',
  HIGH: 'urgent',
  URGENT: 'urgent',
  VIP: 'VIP',
}

const deliveryMap: Record<string, MessageDeliveryStatus> = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
}

function formatDate(value?: string | null) {
  if (!value) return 'الآن'
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function resolveQueue(name?: string | null): SupportQueue {
  return name?.trim() || 'غير مصنف'
}

function resolveAssignment(conversation: RestConversation): AssignmentState {
  if (conversation.status === 'CLOSED' || conversation.status === 'RESOLVED') return 'مغلق'
  if (conversation.status === 'SLA_WARNING' || conversation.status === 'SLA_BREACHED') return 'مصعد'
  if (conversation.status === 'PENDING_CUSTOMER') return 'بانتظار العميل'
  return conversation.assignedUser ? 'مسند' : 'غير مسند'
}

function mapMessage(message: RestMessage, customerName: string): ConversationMessage {
  const isCustomer = message.senderType === 'CUSTOMER'
  const isInternalNote = message.messageType === 'INTERNAL_NOTE'
  const whatsappMetadata = message.metadata?.whatsapp
  const whatsapp = whatsappMetadata && typeof whatsappMetadata === 'object' ? whatsappMetadata as Record<string, unknown> : null
  const isBotMessage = whatsapp?.bot === true
  const botFailed = !isCustomer && isBotMessage && message.status === 'FAILED'

  return {
    id: message.id,
    direction: isCustomer ? 'incoming' : 'outgoing',
    kind: isInternalNote ? 'internal_note' : 'message',
    body: message.content ?? '',
    author: isCustomer ? customerName : isBotMessage ? 'وكيل واتساب' : 'الفريق',
    sentAt: formatDate(message.createdAt),
    deliveryStatus: deliveryMap[message.status ?? ''] ?? undefined,
    botFailed,
  }
}

function mapConversation(conversation: RestConversation, messages: RestMessage[]): Conversation {
  const customerName = conversation.customer?.name || conversation.customer?.phone || 'عميل'
  const updatedAt = formatDate(conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt)
  const mappedMessages = messages.map((message) => mapMessage(message, customerName))

  return {
    id: conversation.id,
    customerId: conversation.customer?.id,
    customerName,
    customerCompany: conversation.customer?.email ?? '-',
    customerEmail: conversation.customer?.email ?? '-',
    customerPhone: conversation.customer?.phone ?? '-',
    customerLocation: 'غير محدد',
    channel: channelMap[conversation.channel?.type ?? ''] ?? 'WhatsApp',
    queue: resolveQueue(conversation.queue?.name),
    assignmentState: resolveAssignment(conversation),
    status: statusMap[conversation.status ?? ''] ?? 'unread',
    priority: priorityMap[conversation.priority ?? ''] ?? 'normal',
    unreadCount: conversation.unreadCount ?? 0,
    tags: [conversation.channel?.name ? getChannelLabel(conversation.channel.name) : undefined].filter((tag): tag is string => Boolean(tag)),
    lastMessage: conversation.lastMessagePreview ?? mappedMessages.at(-1)?.body ?? '',
    messages: mappedMessages,
    timeline: [],
    assignee: {
      id: conversation.assignedUser?.id ?? 'unassigned',
      name: conversation.assignedUser?.name ?? 'غير مسند',
      team: conversation.assignedTeam?.name ?? resolveQueue(conversation.queue?.name),
      presence: (conversation.assignedUser ? 'online' : 'offline') as AgentPresence,
    },
    updatedAt,
    slaDueAt: conversation.slaDeadline ? formatDate(conversation.slaDeadline) : 'غير محدد',
    slaDeadlineMs: (conversation.firstResponseDueAt ?? conversation.slaDeadline) ? new Date(conversation.firstResponseDueAt ?? conversation.slaDeadline ?? '').getTime() : Date.now() + 60 * 60 * 1000,
    slaStatus: conversation.slaStatus,
    firstResponseDueAt: conversation.firstResponseDueAt ? formatDate(conversation.firstResponseDueAt) : undefined,
  }
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(apiUrl(path), init)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`REST request failed: ${response.status}${detail ? ` ${detail}` : ''}`)
  }
  return response.json() as Promise<T>
}

export async function fetchInboxConversations(): Promise<Conversation[]> {
  const conversations = await fetchJson<RestConversation[]>('/conversations?limit=50')
  const conversationsWithMessages = await Promise.all(
    conversations.map(async (conversation) => {
      const messages = await fetchJson<RestMessage[]>(`/messages/${conversation.id}?limit=50`)
      return mapConversation(conversation, messages)
    }),
  )

  return conversationsWithMessages
}

export async function assignInboxConversation(conversationId: string, payload: { assignedUserId?: string; assignedTeamId?: string }) {
  await fetchJson<RestConversation>(`/conversations/${conversationId}/assign`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
