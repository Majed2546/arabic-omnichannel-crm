import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { useUiStore } from '../../stores/uiStore'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { realtimeEventBus } from '../../modules/realtime/eventBus'
import { ConversationCard } from './ConversationCard'
import { useInboxStore } from './inboxStore'
import { fetchInboxConversations } from './inboxRest'
import { sendConversationWhatsAppMessage } from './inboxSend'
import {
  inboxRealtimeConfig,
  type AgentPresence,
  type Conversation,
  type ConversationPriority,
  type SupportQueue,
} from './inboxMock'

type InboxFilter = 'all' | 'unread' | 'pending' | 'resolved' | 'unclassified'

const priorityLabels: Record<ConversationPriority, string> = {
  VIP: 'VIP',
  urgent: 'عاجل',
  normal: 'عادي',
}

const presenceLabels: Record<AgentPresence, string> = {
  online: 'متصل',
  away: 'بعيد',
  offline: 'غير متصل',
}

const deliveryLabels = {
  pending: 'جار الإرسال',
  failed: 'فشل الإرسال',
  sent: 'أرسلت',
  delivered: 'وصلت',
  read: 'مقروءة',
} as const

const filterLabels: Record<InboxFilter, string> = {
  all: 'الكل',
  unread: 'غير مقروء',
  pending: 'بانتظار',
  resolved: 'تم الحل',
  unclassified: 'غير مصنف',
}

function priorityTone(priority: ConversationPriority) {
  if (priority === 'VIP') return 'vip'
  if (priority === 'urgent') return 'danger'
  return 'muted'
}

function conversationMatchesFilter(conversation: Conversation, filter: InboxFilter) {
  if (filter === 'all') return true
  if (filter === 'unread') return conversation.unreadCount > 0 || conversation.status === 'unread'
  if (filter === 'unclassified') return conversation.assignmentState === 'غير مسند'
  return conversation.status === filter
}

function conversationMatchesSearch(conversation: Conversation, search: string) {
  const term = search.trim().toLowerCase()
  if (!term) return true

  return [
    conversation.customerName,
    conversation.customerEmail,
    conversation.customerPhone,
    conversation.channel,
  ].some((value) => value.toLowerCase().includes(term))
}

function getSlaState(conversation: Conversation, now: number) {
  if (conversation.assignmentState === 'مغلق') return 'ok'
  const remainingMs = conversation.slaDeadlineMs - now
  if (remainingMs <= 0) return 'breached'
  if (remainingMs <= 15 * 60 * 1000 || conversation.status === 'sla_warning') return 'warning'
  return 'ok'
}

function formatSlaCountdown(conversation: Conversation, now: number) {
  if (conversation.assignmentState === 'مغلق') return 'مغلق'
  const remainingMs = conversation.slaDeadlineMs - now
  const absoluteMinutes = Math.ceil(Math.abs(remainingMs) / 60_000)
  const hours = Math.floor(absoluteMinutes / 60)
  const minutes = absoluteMinutes % 60
  const label = hours > 0 ? `${hours}س ${minutes}د` : `${minutes}د`
  return remainingMs <= 0 ? `متأخر ${label}` : label
}

export default function UnifiedInboxPage() {
  const conversations = useInboxStore((state) => state.conversations)
  const agents = useInboxStore((state) => state.agents)
  const selectedId = useInboxStore((state) => state.selectedId)
  const selectConversation = useInboxStore((state) => state.selectConversation)
  const clearSelection = useInboxStore((state) => state.clearSelection)
  const addOutgoingReply = useInboxStore((state) => state.addOutgoingReply)
  const addInternalNote = useInboxStore((state) => state.addInternalNote)
  const retryMessage = useInboxStore((state) => state.retryMessage)
  const assignConversation = useInboxStore((state) => state.assignConversation)
  const assignConversationToAgent = useInboxStore((state) => state.assignConversationToAgent)
  const moveConversationQueue = useInboxStore((state) => state.moveConversationQueue)
  const escalateConversation = useInboxStore((state) => state.escalateConversation)
  const resolveConversation = useInboxStore((state) => state.resolveConversation)
  const markUnread = useInboxStore((state) => state.markUnread)
  const cyclePriority = useInboxStore((state) => state.cyclePriority)
  const archiveConversation = useInboxStore((state) => state.archiveConversation)
  const applyRealtimeEvent = useInboxStore((state) => state.applyRealtimeEvent)
  const replaceConversations = useInboxStore((state) => state.replaceConversations)
  const [activeFilter, setActiveFilter] = useState<InboxFilter>('all')
  const [now, setNow] = useState(Date.now())
  const [search, setSearch] = useState('')
  const [reply, setReply] = useState('')
  const [composerMode, setComposerMode] = useState<'reply' | 'internal'>('reply')
  const [profilePopupOpen, setProfilePopupOpen] = useState(false)
  const [typingConversationId, setTypingConversationId] = useState<string | null>(null)
  const [inboxLoadError, setInboxLoadError] = useState<string | null>(null)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [isSendingReply, setSendingReply] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const threadWasNearBottomRef = useRef(true)
  const showToast = useUiStore((state) => state.showToast)
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const canReply = can('inbox.reply')
  const canAssign = can('inbox.assign')
  const canManageInbox = canAssign || canReply

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId),
    [conversations, selectedId],
  )

  const filteredConversations = useMemo(
    () => conversations.filter((conversation) =>
      !conversation.archived &&
      conversationMatchesFilter(conversation, activeFilter) &&
      conversationMatchesSearch(conversation, search),
    ),
    [activeFilter, conversations, search],
  )

  const queueNames = useMemo(
    () => Array.from(new Set(conversations.map((conversation) => conversation.queue).filter(Boolean))),
    [conversations],
  )

  const unreadTotal = useMemo(
    () => filteredConversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [filteredConversations],
  )

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let disposed = false
    let hasShownFallbackToast = false
    replaceConversations([])
    clearSelection()
    setInboxLoadError(null)

    if (!currentTenantId) return

    const refreshInbox = () => {
      fetchInboxConversations().then((items) => {
        if (disposed) return
        setInboxLoadError(null)
        replaceConversations(items)
      })
        .catch((error: unknown) => {
          if (!disposed && !hasShownFallbackToast) {
            hasShownFallbackToast = true
            showToast('تعذر تحميل المحادثات من REST، سنعيد المحاولة تلقائياً', 'info')
          }
          if (!disposed) {
            setInboxLoadError(error instanceof Error ? error.message : 'تعذر تحميل المحادثات')
          }
        })
    }

    refreshInbox()
    const interval = window.setInterval(refreshInbox, 5_000)

    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [currentTenantId, replaceConversations, clearSelection, showToast])

  useEffect(() => {
    const unsubscribe = realtimeEventBus.subscribe((event) => {
      if (event.type === 'message.created') {
        setTypingConversationId(event.conversationId)
        window.setTimeout(() => setTypingConversationId(null), 1400)

        const conversation = useInboxStore.getState().conversations.find((item) => item.id === event.conversationId)
        showToast(`رسالة جديدة من ${conversation?.customerName ?? 'عميل جديد'}`, 'info')
        console.info('unread sound placeholder: incoming-message')
      }

      if (event.type === 'conversation.created') {
        showToast(`محادثة جديدة من ${event.conversation.customerName}`, 'info')
      }

      applyRealtimeEvent(event)
    })
    return () => {
      unsubscribe()
    }
  }, [applyRealtimeEvent, showToast])

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }

      if (event.key === 'Escape') {
        clearSelection()
        setProfilePopupOpen(false)
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [clearSelection])

  function scrollThreadToBottom(behavior: ScrollBehavior = 'auto') {
    window.requestAnimationFrame(() => {
      threadEndRef.current?.scrollIntoView({ block: 'end', behavior })
    })
  }

  function handleThreadScroll() {
    const thread = threadRef.current
    if (!thread) return

    const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight
    threadWasNearBottomRef.current = distanceFromBottom < 96
  }

  useLayoutEffect(() => {
    threadWasNearBottomRef.current = true
    scrollThreadToBottom('auto')
  }, [selectedConversation?.id])

  useEffect(() => {
    if (threadWasNearBottomRef.current) {
      scrollThreadToBottom('smooth')
    }
  }, [selectedConversation?.messages.length, selectedConversation?.timeline.length, typingConversationId])

  function handleSelectConversation(conversationId: string) {
    selectConversation(conversationId)
  }

  function handleReplyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setReply(event.target.value)
    event.target.style.height = 'auto'
    const nextHeight = Math.min(event.target.scrollHeight, 120)
    event.target.style.height = `${nextHeight}px`
    event.target.style.overflowY = event.target.scrollHeight > 120 ? 'auto' : 'hidden'
  }

  function resetComposerHeight() {
    if (!composerRef.current) return

    composerRef.current.style.height = '52px'
    composerRef.current.style.overflowY = 'hidden'
  }

  async function submitComposer() {
    const body = reply.trim()
    if (!body || !selectedConversation || isSendingReply) return

    setComposerError(null)

    if (composerMode === 'internal') {
      addInternalNote(selectedConversation.id, body, 'المستخدم الحالي')
      showToast('تمت إضافة الملاحظة الداخلية', 'success')
      setReply('')
      resetComposerHeight()
      return
    }

    try {
      setSendingReply(true)
      const result = await sendConversationWhatsAppMessage({
        conversationId: selectedConversation.id,
        recipient: selectedConversation.customerPhone,
        message: body,
      })

      addOutgoingReply(
        selectedConversation.id,
        body,
        'المستخدم الحالي',
        result.messageId,
        result.status === 'SENT' ? 'sent' : 'pending',
      )
      showToast('تم إرسال الرد عبر واتساب', 'success')
      setReply('')
      resetComposerHeight()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إرسال الرسالة'
      setComposerError(message)
      showToast(message, 'warning')
    } finally {
      setSendingReply(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void submitComposer()
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitComposer()
    }
  }

  return (
    <>
    <div className="page-layout inbox-layout queue-inbox-layout">
      <section className="panel-panel conversation-list-panel">
        <div className="panel-header inbox-panel-header">
          <div>
            <h2>صندوق الوارد الموحد</h2>
            <p>مساحة عمل فورية لمحادثات العملاء عبر كل القنوات.</p>
          </div>
          <span className="realtime-indicator">
            <i />
            مباشر · {inboxRealtimeConfig.transport}
          </span>
        </div>

        <label className="inbox-search-control">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            className="app-input control-safe text-safe"
            ref={searchRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث بالعميل، البريد، الجوال، القناة"
            aria-label="بحث في المحادثات"
          />
          {search ? (
            <button type="button" className="search-clear-button" onClick={() => setSearch('')} aria-label="مسح البحث">
              ×
            </button>
          ) : null}
        </label>

        <div className="inbox-status-tabs compact">
          {(Object.keys(filterLabels) as InboxFilter[]).map((filter) => (
            <AppButton
              key={filter}
              variant="ghost"
              className={activeFilter === filter ? 'active' : ''}
              onClick={() => setActiveFilter(filter)}
            >
              {filterLabels[filter]}
            </AppButton>
          ))}
        </div>

        <div className="conversation-list">
          {inboxLoadError ? (
            <div className="inactive-tenant-banner soft-warning">
              <strong>تعذر تحميل صندوق الوارد</strong>
              <p>سيتم إعادة المحاولة تلقائياً. تحقق من اتصال REST إذا استمر الخطأ.</p>
            </div>
          ) : null}
          {unreadTotal > 0 ? (
            <div className="unread-divider">
              <span>غير مقروءة</span>
              <b>{unreadTotal}</b>
            </div>
          ) : null}
          {filteredConversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              id={conversation.id}
              customerName={conversation.customerName}
              preview={conversation.lastMessage}
              channel={conversation.channel}
              queue={conversation.queue}
              assignmentState={conversation.assignmentState}
              priority={conversation.priority}
              status={conversation.status}
              slaLabel={formatSlaCountdown(conversation, now)}
              slaState={getSlaState(conversation, now)}
              unreadCount={conversation.unreadCount}
              timestamp={conversation.updatedAt}
              selected={conversation.id === selectedId}
              assignedAgent={conversation.assignee}
              canAssign={canAssign}
              canManage={canManageInbox}
              onClick={() => handleSelectConversation(conversation.id)}
              onAssign={assignConversation}
              onResolve={resolveConversation}
              onMarkUnread={markUnread}
              onPriority={cyclePriority}
              onEscalate={escalateConversation}
              onArchive={archiveConversation}
            />
          ))}
          {!filteredConversations.length ? (
            <div className="inbox-list-empty">
              <EmptyState title="لا توجد نتائج" message="جرّب تغيير الفلتر أو عبارة البحث." />
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel-panel conversation-detail-panel">
        {selectedConversation ? (
          <>
            <div className="panel-header split-header chat-window-header">
              <div>
                <p className="panel-label">{selectedConversation.channel}</p>
                <h2>
                  <button
                    type="button"
                    className="customer-profile-trigger"
                    onClick={() => setProfilePopupOpen((open) => !open)}
                  >
                    {selectedConversation.customerName}
                  </button>
                </h2>
                <p>{selectedConversation.customerCompany} · {selectedConversation.updatedAt}</p>
                {profilePopupOpen ? (
                  <div className="customer-profile-popup" role="dialog" aria-label="ملف العميل السريع">
                    <strong>{selectedConversation.customerName}</strong>
                    <span>{selectedConversation.customerCompany}</span>
                    <span>{selectedConversation.customerPhone}</span>
                    <span>{selectedConversation.customerEmail}</span>
                  </div>
                ) : null}
              </div>
              <div className="chat-header-actions">
                <StatusBadge label={selectedConversation.queue} tone={selectedConversation.queue === 'VIP' ? 'vip' : 'info'} />
                <StatusBadge
                  label={`SLA ${formatSlaCountdown(selectedConversation, now)}`}
                  tone={getSlaState(selectedConversation, now) === 'breached' ? 'danger' : getSlaState(selectedConversation, now) === 'warning' ? 'warning' : 'success'}
                />
                {canAssign ? (
                  <>
                    <select
                      className="ops-select"
                      value={selectedConversation.assignee.id}
                      onChange={(event) => assignConversationToAgent(selectedConversation.id, event.target.value)}
                      aria-label="إسناد إلى وكيل"
                    >
                      {agents.length ? agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>{agent.name}</option>
                      )) : <option value="unassigned">غير مسند</option>}
                    </select>
                    <select
                      className="ops-select"
                      value={selectedConversation.queue}
                      onChange={(event) => moveConversationQueue(selectedConversation.id, event.target.value as SupportQueue)}
                      aria-label="نقل القائمة"
                    >
                      {queueNames.map((queue) => (
                        <option key={queue} value={queue}>{queue}</option>
                      ))}
                    </select>
                    <AppButton
                      onClick={() => assignConversation(selectedConversation.id)}
                    >
                      إسناد لي
                    </AppButton>
                    <AppButton
                      variant="ghost"
                      onClick={() => escalateConversation(selectedConversation.id)}
                    >
                      تصعيد
                    </AppButton>
                  </>
                ) : null}
              </div>
            </div>

            <div ref={threadRef} className="chat-thread" aria-live="polite" onScroll={handleThreadScroll}>
              {selectedConversation.timeline.map((event) => (
                <article key={event.id} className={`timeline-event ${event.type}`}>
                  <span>{event.label}</span>
                  <small>{event.actor} · {event.occurredAt}</small>
                </article>
              ))}
              {selectedConversation.messages.map((message, index) => {
                const previous = selectedConversation.messages[index - 1]
                const grouped = previous?.author === message.author && previous?.direction === message.direction && previous?.kind === message.kind

                return (
                <article
                  key={message.id}
                  className={`message-bubble ${message.direction} ${message.kind === 'internal_note' ? 'internal-note' : ''} ${grouped ? 'grouped' : ''} ${message.deliveryStatus ?? ''}`}
                >
                  {message.kind === 'internal_note' ? <b className="internal-note-badge">ملاحظة داخلية</b> : null}
                  <p>{message.body}</p>
                  <footer>
                    {!grouped ? <span>{message.author}</span> : null}
                    <span>{message.sentAt}</span>
                    {message.deliveryStatus ? <span>{deliveryLabels[message.deliveryStatus]}</span> : null}
                    {message.deliveryStatus === 'pending' ? <i className="sending-dots" aria-label="جار الإرسال" /> : null}
                    {message.deliveryStatus === 'failed' ? (
                      <button type="button" onClick={() => retryMessage(selectedConversation.id, message.id)}>
                        إعادة المحاولة
                      </button>
                    ) : null}
                  </footer>
                </article>
                )
              })}
              {typingConversationId === selectedConversation.id ? (
                <article className="typing-indicator">
                  <span />
                  <span />
                  <span />
                  {selectedConversation.customerName} تكتب الآن...
                </article>
              ) : null}
              <div ref={threadEndRef} className="thread-scroll-anchor" aria-hidden="true" />
            </div>

            {canReply ? (
              <form className={`chat-composer ${composerMode === 'internal' ? 'internal-mode' : ''}`} onSubmit={handleSubmit}>
                <AppButton variant="ghost" className="composer-tool-button" onClick={() => showToast('اختيار الرموز جاهز للربط', 'success')}>
                  🙂
                </AppButton>
                <AppButton variant="ghost" className="composer-tool-button" onClick={() => showToast('إرفاق الملفات جاهز للربط', 'success')}>
                  📎
                </AppButton>
                <div className="composer-mode-toggle" role="group" aria-label="نوع الرسالة">
                  <button
                    type="button"
                    className={composerMode === 'reply' ? 'active' : ''}
                    onClick={() => setComposerMode('reply')}
                  >
                    رد للعميل
                  </button>
                  <button
                    type="button"
                    className={composerMode === 'internal' ? 'active' : ''}
                    onClick={() => setComposerMode('internal')}
                  >
                    ملاحظة داخلية
                  </button>
                </div>
                <textarea
                  ref={composerRef}
                  value={reply}
                  disabled={isSendingReply}
                  rows={1}
                  onChange={handleReplyChange}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={composerMode === 'internal' ? 'اكتب ملاحظة داخلية للفريق...' : 'اكتب رداً واضغط Enter للإرسال...'}
                  aria-label={composerMode === 'internal' ? 'نص الملاحظة الداخلية' : 'نص الرد'}
                />
                <AppButton type="submit" variant="primary" className="composer-send-button">
                  {isSendingReply ? 'جار الإرسال' : composerMode === 'internal' ? 'حفظ' : 'إرسال'}
                </AppButton>
              </form>
            ) : null}
            {composerError ? (
              <div className="inactive-tenant-banner soft-warning">
                <strong>تعذر إرسال الرسالة</strong>
                <p>{composerError}</p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="conversation-empty-panel">
            <EmptyState title="اختر محادثة" message="حدد محادثة لعرض تفاصيل العميل والمعاينة." />
          </div>
        )}
      </section>

      <aside className="customer-profile-panel">
        {selectedConversation ? (
          <>
            <div className="customer-profile-head">
              <span>{selectedConversation.customerName.charAt(0)}</span>
              <div>
                <h3>{selectedConversation.customerName}</h3>
                <p>{selectedConversation.customerCompany}</p>
              </div>
            </div>

            <dl className="meta-list">
              <div>
                <dt>الأولوية</dt>
                <dd><StatusBadge label={priorityLabels[selectedConversation.priority]} tone={priorityTone(selectedConversation.priority)} /></dd>
              </div>
              <div>
                <dt>القائمة</dt>
                <dd><StatusBadge label={selectedConversation.queue} tone={selectedConversation.queue === 'VIP' ? 'vip' : 'info'} /></dd>
              </div>
              <div>
                <dt>الإسناد</dt>
                <dd>{selectedConversation.assignmentState}</dd>
              </div>
              <div>
                <dt>SLA</dt>
                <dd className={`sla-text ${getSlaState(selectedConversation, now)}`}>{formatSlaCountdown(selectedConversation, now)}</dd>
              </div>
              <div>
                <dt>البريد</dt>
                <dd>{selectedConversation.customerEmail}</dd>
              </div>
              <div>
                <dt>الجوال</dt>
                <dd>{selectedConversation.customerPhone}</dd>
              </div>
              <div>
                <dt>المسؤول</dt>
                <dd className="presence-row">
                  <span className={`presence-dot ${selectedConversation.assignee.presence}`} />
                  {selectedConversation.assignee.name}
                  <small>{presenceLabels[selectedConversation.assignee.presence]}</small>
                </dd>
              </div>
              <div>
                <dt>الفريق</dt>
                <dd>{selectedConversation.assignee.team}</dd>
              </div>
            </dl>

            <div className="profile-section profile-actions">
              {selectedConversation.customerId ? (
                <Link className="app-button app-button-secondary control-safe text-safe" to={`/customers?customerId=${selectedConversation.customerId}`}>
                  فتح ملف العميل
                </Link>
              ) : (
                <Link className="app-button app-button-secondary control-safe text-safe" to={`/customers?new=1&phone=${encodeURIComponent(selectedConversation.customerPhone)}&name=${encodeURIComponent(selectedConversation.customerName)}`}>
                  إنشاء عميل من المحادثة
                </Link>
              )}
            </div>

            <div className="profile-section">
              <h4>الوسوم</h4>
              <div className="tag-list">
                {selectedConversation.tags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>

            <div className="profile-section">
              <h4>النشاط الأخير</h4>
              <div className="context-activity-list">
                {selectedConversation.timeline.slice(-4).map((event) => (
                  <article key={event.id}>
                    <strong>{event.label}</strong>
                    <small>{event.actor} · {event.occurredAt}</small>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="customer-empty-card">
            <EmptyState title="لا توجد بطاقة" message="اختر محادثة لعرض ملف العميل." />
          </div>
        )}
      </aside>
    </div>
    </>
  )
}
