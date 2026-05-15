export type ConversationStatus = 'unread' | 'assigned' | 'pending' | 'resolved' | 'sla_warning'
export type ConversationPriority = 'VIP' | 'urgent' | 'normal'
export type AgentPresence = 'online' | 'away' | 'offline'
export type ConversationChannel = 'WhatsApp' | 'Email' | 'Web Chat' | 'Telegram'
export type SupportQueue = 'الدعم' | 'المبيعات' | 'التقنية' | 'الفواتير' | 'VIP'
export type AssignmentState = 'غير مسند' | 'مسند' | 'قيد المعالجة' | 'بانتظار العميل' | 'مصعد' | 'مغلق'
export type MessageDirection = 'incoming' | 'outgoing'
export type MessageDeliveryStatus = 'pending' | 'failed' | 'sent' | 'delivered' | 'read'
export type ConversationTimelineType = 'assigned' | 'sla_warning' | 'resolved' | 'reopened'

export type InboxAssignee = {
  id: string
  name: string
  team: string
  presence: AgentPresence
}

export type ConversationMessage = {
  id: string
  direction: MessageDirection
  body: string
  author: string
  sentAt: string
  deliveryStatus?: MessageDeliveryStatus
  kind?: 'message' | 'internal_note'
}

export type Conversation = {
  id: string
  customerName: string
  customerCompany: string
  customerEmail: string
  customerPhone: string
  customerLocation: string
  channel: ConversationChannel
  queue: SupportQueue
  assignmentState: AssignmentState
  status: ConversationStatus
  priority: ConversationPriority
  unreadCount: number
  tags: string[]
  lastMessage: string
  messages: ConversationMessage[]
  timeline: ConversationTimelineEvent[]
  assignee: InboxAssignee
  updatedAt: string
  slaDueAt: string
  slaDeadlineMs: number
  archived?: boolean
}

export type ConversationTimelineEvent = {
  id: string
  type: ConversationTimelineType
  label: string
  actor: string
  occurredAt: string
}

export type QueueAgent = {
  id: string
  name: string
  queue: SupportQueue
  presence: AgentPresence
  activeChats: number
  slaWarnings: number
}

const now = Date.now()

export const supportQueues: SupportQueue[] = ['الدعم', 'المبيعات', 'التقنية', 'الفواتير', 'VIP']

export const mockQueueAgents: QueueAgent[] = [
  { id: 'agent-layla', name: 'ليلى الحسن', queue: 'VIP', presence: 'online', activeChats: 4, slaWarnings: 1 },
  { id: 'agent-saud', name: 'سعود السالم', queue: 'الدعم', presence: 'away', activeChats: 3, slaWarnings: 0 },
  { id: 'agent-reem', name: 'ريم فهد', queue: 'التقنية', presence: 'offline', activeChats: 1, slaWarnings: 0 },
  { id: 'agent-nasser', name: 'ناصر القحطاني', queue: 'الفواتير', presence: 'online', activeChats: 2, slaWarnings: 1 },
]

export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    customerName: 'سارة العلي',
    customerCompany: 'Notion',
    customerEmail: 'sara@notion.com',
    customerPhone: '+966 55 321 4400',
    customerLocation: 'الرياض',
    channel: 'WhatsApp',
    queue: 'VIP',
    assignmentState: 'مصعد',
    status: 'sla_warning',
    priority: 'VIP',
    unreadCount: 3,
    tags: ['تفعيل واتساب', 'Meta', 'عميل مهم'],
    lastMessage: 'نحتاج تفعيل رقم واتساب قبل نهاية اليوم.',
    messages: [
      { id: 'msg-1-1', direction: 'incoming', body: 'مرحباً، هل يمكن ربط الرقم الجديد؟', author: 'سارة العلي', sentAt: '09:18' },
      { id: 'msg-1-2', direction: 'outgoing', body: 'أهلاً سارة، أرسلي رقم الأعمال وسنتحقق من حالة الربط.', author: 'ليلى الحسن', sentAt: '09:20', deliveryStatus: 'read' },
      { id: 'note-1-1', direction: 'outgoing', body: 'ملاحظة داخلية: العميل VIP ويحتاج تصعيد Meta.', author: 'ليلى الحسن', sentAt: '09:21', kind: 'internal_note' },
      { id: 'msg-1-3', direction: 'incoming', body: 'وصلتني رسالة خطأ من Meta عند التحقق.', author: 'سارة العلي', sentAt: '09:23' },
      { id: 'msg-1-4', direction: 'incoming', body: 'نحتاج تفعيل رقم واتساب قبل نهاية اليوم.', author: 'سارة العلي', sentAt: '09:27' },
    ],
    timeline: [
      { id: 'tl-1-1', type: 'assigned', label: 'تم إسناد المحادثة إلى ليلى', actor: 'النظام', occurredAt: '09:18' },
      { id: 'tl-1-2', type: 'sla_warning', label: 'اقترب موعد SLA', actor: 'النظام', occurredAt: '09:28' },
    ],
    assignee: { id: 'agent-layla', name: 'ليلى الحسن', team: 'فريق واتساب', presence: 'online' },
    updatedAt: 'قبل 4 دقائق',
    slaDueAt: 'اليوم 12:00',
    slaDeadlineMs: now + 11 * 60 * 1000,
  },
  {
    id: 'conv-2',
    customerName: 'خالد منصور',
    customerCompany: 'Stripe',
    customerEmail: 'khaled@stripe.com',
    customerPhone: '+966 50 770 1188',
    customerLocation: 'جدة',
    channel: 'Email',
    queue: 'التقنية',
    assignmentState: 'قيد المعالجة',
    status: 'assigned',
    priority: 'urgent',
    unreadCount: 1,
    tags: ['بريد', 'تكامل', 'عمليات'],
    lastMessage: 'أرسلت لكم تفاصيل التكامل عبر البريد.',
    messages: [
      { id: 'msg-2-1', direction: 'incoming', body: 'أريد ربط البريد بصندوق الوارد.', author: 'خالد منصور', sentAt: '08:44' },
      { id: 'msg-2-2', direction: 'outgoing', body: 'تم، سنراجع إعدادات MX ونقترح مسار الربط.', author: 'سعود السالم', sentAt: '08:51', deliveryStatus: 'delivered' },
      { id: 'msg-2-3', direction: 'incoming', body: 'هل يمكن إضافة توقيع موحد؟', author: 'خالد منصور', sentAt: '09:02' },
      { id: 'msg-2-4', direction: 'incoming', body: 'أرسلت لكم تفاصيل التكامل عبر البريد.', author: 'خالد منصور', sentAt: '09:07' },
    ],
    timeline: [
      { id: 'tl-2-1', type: 'assigned', label: 'تم إسناد المحادثة إلى سعود', actor: 'النظام', occurredAt: '08:45' },
    ],
    assignee: { id: 'agent-saud', name: 'سعود السالم', team: 'فريق الدعم', presence: 'away' },
    updatedAt: 'قبل 18 دقيقة',
    slaDueAt: 'اليوم 14:30',
    slaDeadlineMs: now + 42 * 60 * 1000,
  },
  {
    id: 'conv-3',
    customerName: 'نورة فهد',
    customerCompany: 'Figma',
    customerEmail: 'noura@figma.com',
    customerPhone: '+966 54 810 9922',
    customerLocation: 'الدمام',
    channel: 'Web Chat',
    queue: 'الدعم',
    assignmentState: 'مغلق',
    status: 'resolved',
    priority: 'normal',
    unreadCount: 0,
    tags: ['صلاحيات', 'دردشة الموقع'],
    lastMessage: 'شكراً، تم حل المشكلة.',
    messages: [
      { id: 'msg-3-1', direction: 'incoming', body: 'لا تظهر المحادثات في لوحة الفريق.', author: 'نورة فهد', sentAt: 'أمس 16:12' },
      { id: 'msg-3-2', direction: 'outgoing', body: 'تم تحديث الصلاحيات الآن، هل تظهر لديك؟', author: 'ريم فهد', sentAt: 'أمس 16:18', deliveryStatus: 'read' },
      { id: 'msg-3-3', direction: 'incoming', body: 'شكراً، تم حل المشكلة.', author: 'نورة فهد', sentAt: 'أمس 16:20' },
    ],
    timeline: [
      { id: 'tl-3-1', type: 'resolved', label: 'تم حل المحادثة', actor: 'ريم فهد', occurredAt: 'أمس 16:21' },
    ],
    assignee: { id: 'agent-reem', name: 'ريم فهد', team: 'فريق العمليات', presence: 'offline' },
    updatedAt: 'أمس',
    slaDueAt: 'تم الحل',
    slaDeadlineMs: now - 2 * 60 * 60 * 1000,
  },
  {
    id: 'conv-4',
    customerName: 'ماجد الحربي',
    customerCompany: 'منصة مرسال',
    customerEmail: 'majed@mersal.example',
    customerPhone: '+966 56 402 1550',
    customerLocation: 'الخبر',
    channel: 'Telegram',
    queue: 'الفواتير',
    assignmentState: 'بانتظار العميل',
    status: 'pending',
    priority: 'normal',
    unreadCount: 0,
    tags: ['فوترة', 'انتظار العميل'],
    lastMessage: 'سأعود لكم بعد مراجعة الفريق المالي.',
    messages: [
      { id: 'msg-4-1', direction: 'incoming', body: 'وصلتني فاتورة مكررة لهذا الشهر.', author: 'ماجد الحربي', sentAt: 'أمس 11:10' },
      { id: 'msg-4-2', direction: 'outgoing', body: 'سنراجع السجل المالي ونحدثك خلال اليوم.', author: 'ليلى الحسن', sentAt: 'أمس 11:16', deliveryStatus: 'sent' },
      { id: 'msg-4-3', direction: 'incoming', body: 'سأعود لكم بعد مراجعة الفريق المالي.', author: 'ماجد الحربي', sentAt: 'أمس 11:22' },
    ],
    timeline: [
      { id: 'tl-4-1', type: 'reopened', label: 'أعيد فتح المحادثة للفوترة', actor: 'ليلى الحسن', occurredAt: 'أمس 11:09' },
    ],
    assignee: { id: 'agent-layla', name: 'ليلى الحسن', team: 'فريق الدعم', presence: 'online' },
    updatedAt: 'أمس',
    slaDueAt: 'غداً 10:00',
    slaDeadlineMs: now + 3 * 60 * 60 * 1000,
  },
]

export const inboxRealtimeConfig = {
  transport: 'mock-event-stream',
  channels: [
    'conversation.created',
    'message.created',
    'conversation.assigned',
    'conversation.status_changed',
    'conversation.sla_warning',
    'conversation.queue_changed',
    'agent.presence_changed',
  ],
  reconnectMs: 3000,
} as const
