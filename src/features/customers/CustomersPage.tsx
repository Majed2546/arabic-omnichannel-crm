import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Edit3, Eye, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useUiStore } from '../../stores/uiStore'
import { useTenant } from '../../tenants/useTenant'
import { getChannelLabel } from '../../shared/utils'
import { fetchAppointments, type Appointment } from '../appointments/appointmentData'
import { fetchTickets, type Ticket } from '../tickets/ticketData'
import {
  createCustomer,
  deleteCustomer,
  fetchCustomer,
  fetchCustomerConversations,
  fetchCustomers,
  updateCustomer,
  type Customer,
  type CustomerConversation,
  type CustomerSourceChannel,
  type CustomerStatus,
  type SaveCustomerPayload,
} from './customerData'

const statusLabels: Record<CustomerStatus, string> = {
  ACTIVE: 'نشط',
  NEW: 'جديد',
  VIP: 'VIP',
  INACTIVE: 'غير نشط',
  BLOCKED: 'محظور',
}

const appointmentStatusLabels: Record<string, string> = {
  SCHEDULED: 'مجدول',
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغي',
  COMPLETED: 'مكتمل',
  NO_SHOW: 'لم يحضر',
}

const ticketStatusLabels: Record<string, string> = {
  OPEN: 'مفتوحة',
  IN_PROGRESS: 'قيد المعالجة',
  WAITING_CUSTOMER: 'بانتظار العميل',
  RESOLVED: 'تم الحل',
  CLOSED: 'مغلقة',
}

const sourceChannelOptions: CustomerSourceChannel[] = ['WHATSAPP', 'EMAIL', 'WEBCHAT', 'INSTAGRAM', 'TELEGRAM', 'SMS', 'VOICE', 'X']

type CustomerFormState = {
  name: string
  phone: string
  email: string
  status: CustomerStatus
  tags: string
  sourceChannel: CustomerSourceChannel
  notes: string
}

const emptyForm: CustomerFormState = {
  name: '',
  phone: '',
  email: '',
  status: 'ACTIVE',
  tags: '',
  sourceChannel: 'WHATSAPP',
  notes: '',
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ar-SA') : 'غير محدد'
}

function customerStatusTone(status: CustomerStatus) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'NEW') return 'info'
  if (status === 'VIP') return 'vip'
  if (status === 'BLOCKED') return 'danger'
  return 'muted'
}

function toForm(customer?: Customer | null): CustomerFormState {
  if (!customer) return emptyForm
  return {
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    status: customer.status,
    tags: customer.tags.join('، '),
    sourceChannel: customer.sourceChannel ?? 'WHATSAPP',
    notes: customer.notes ?? '',
  }
}

function toPayload(form: CustomerFormState): SaveCustomerPayload {
  return {
    name: form.name.trim(),
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    status: form.status,
    tags: form.tags.split(/[،,]/).map((tag) => tag.trim()).filter(Boolean),
    sourceChannel: form.sourceChannel,
    notes: form.notes.trim(),
  }
}

function CustomerModal({
  mode,
  initialCustomer,
  initialForm,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit'
  initialCustomer?: Customer | null
  initialForm?: CustomerFormState
  onClose: () => void
  onSave: (payload: SaveCustomerPayload) => Promise<void>
}) {
  const [form, setForm] = useState<CustomerFormState>(() => initialForm ?? toForm(initialCustomer))
  const [isSaving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      await onSave(toPayload(form))
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'تعذر حفظ بيانات العميل. حاول مرة أخرى.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <form
        className="customer-modal panel-panel"
        onSubmit={handleSubmit}
        aria-label={mode === 'create' ? 'إنشاء عميل' : 'تعديل بيانات العميل'}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-header split-header">
          <div>
            <h2>{mode === 'create' ? 'إضافة عميل' : 'تعديل بيانات العميل'}</h2>
            <p>المعلومات محفوظة داخل سياق الشركة الحالية فقط.</p>
          </div>
          <AppButton type="button" variant="ghost" className="customer-modal-close" aria-label="إغلاق" onClick={onClose}>
            <X size={18} />
          </AppButton>
        </div>

        {formError ? <div className="customer-form-error" role="alert">{formError}</div> : null}

        <div className="customer-form-grid">
          <label>
            <span>الاسم</span>
            <AppInput autoFocus value={form.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>الجوال</span>
            <AppInput value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
          <label>
            <span>البريد الإلكتروني</span>
            <AppInput type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            <span>الحالة</span>
            <AppSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CustomerStatus })}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>القناة المصدر</span>
            <AppSelect value={form.sourceChannel} onChange={(event) => setForm({ ...form, sourceChannel: event.target.value as CustomerSourceChannel })}>
              {sourceChannelOptions.map((channel) => <option key={channel} value={channel}>{getChannelLabel(channel)}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>الوسوم</span>
            <AppInput value={form.tags} placeholder="VIP، محتمل، دعم" onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          </label>
          <label className="customer-form-wide">
            <span>ملاحظات</span>
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>

        <div className="form-actions">
          <AppButton type="button" variant="ghost" onClick={onClose}>إلغاء</AppButton>
          <AppButton type="submit" variant="primary" disabled={isSaving || !form.name.trim()}>
            {isSaving ? 'جار الحفظ' : mode === 'edit' ? 'حفظ التعديلات' : 'حفظ العميل'}
          </AppButton>
        </div>
      </form>
    </div>
  )
}

export default function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const showToast = useUiStore((state) => state.showToast)
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const canManageCustomers = can('customers.manage')
  const canManageAppointments = can('appointments.manage')
  const canManageTickets = can('tickets.manage')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sourceChannel, setSourceChannel] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(searchParams.get('new') === '1' ? 'create' : null)
  const [relatedConversations, setRelatedConversations] = useState<CustomerConversation[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [linkedTickets, setLinkedTickets] = useState<Ticket[]>([])
  const previousTenantIdRef = useRef<string | null>(null)

  const selectedId = searchParams.get('customerId')
  const createInitialForm = useMemo<CustomerFormState | undefined>(() => {
    if (modalMode !== 'create') return undefined
    return {
      ...emptyForm,
      name: searchParams.get('name') ?? '',
      phone: searchParams.get('phone') ?? '',
    }
  }, [modalMode, searchParams])

  function refreshCustomers() {
    setLoading(true)
    const tenantChanged = previousTenantIdRef.current !== currentTenantId
    previousTenantIdRef.current = currentTenantId ?? null

    if (tenantChanged) {
      setCustomers([])
      setSelectedCustomer(null)
    }

    if (!currentTenantId) {
      setLoading(false)
      return
    }
    fetchCustomers({ search, status, sourceChannel })
      .then((items) => {
        setCustomers(items)
        const selectedFromList = selectedId ? items.find((item) => item.id === selectedId) : null

        if (selectedFromList) {
          setSelectedCustomer(selectedFromList)
          return
        }

        if (selectedId && !selectedFromList) {
          setSelectedCustomer(null)
          setSearchParams({})
          return
        }

        setSelectedCustomer((current) => items.find((item) => item.id === current?.id) ?? items[0] ?? null)
      })
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل العملاء', 'warning'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refreshCustomers()
  }, [search, status, sourceChannel, currentTenantId])

  useEffect(() => {
    if (!selectedId || !currentTenantId) return
    let disposed = false

    fetchCustomer(selectedId)
      .then((customer) => {
        if (!disposed) setSelectedCustomer(customer)
      })
      .catch(() => {
        if (!disposed) {
          setSelectedCustomer(null)
          showToast('تعذر فتح ملف العميل', 'warning')
        }
      })

    return () => {
      disposed = true
    }
  }, [selectedId, currentTenantId])

  useEffect(() => {
    if (!selectedCustomer?.id || !currentTenantId) {
      setRelatedConversations([])
      setUpcomingAppointments([])
      setLinkedTickets([])
      return
    }

    let disposed = false
    setRelatedConversations(selectedCustomer.conversations ?? [])

    fetchCustomerConversations(selectedCustomer.id)
      .then((conversations) => {
        if (!disposed) setRelatedConversations(conversations)
      })
      .catch((error) => {
        if (!disposed) {
          showToast(error instanceof Error ? error.message : 'تعذر تحميل محادثات العميل', 'warning')
        }
      })

    fetchAppointments({ customerId: selectedCustomer.id })
      .then((appointments) => {
        if (!disposed) setUpcomingAppointments(appointments.slice(0, 4))
      })
      .catch(() => {
        if (!disposed) setUpcomingAppointments([])
      })

    fetchTickets({ customerId: selectedCustomer.id })
      .then((tickets) => {
        if (!disposed) setLinkedTickets(tickets.slice(0, 4))
      })
      .catch(() => {
        if (!disposed) setLinkedTickets([])
      })

    return () => {
      disposed = true
    }
  }, [selectedCustomer?.id, currentTenantId, showToast])

  const visibleCustomers = useMemo(() => customers, [customers])

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer)
    setSearchParams({ customerId: customer.id })
  }

  function openConversations() {
    const firstConversation = relatedConversations[0] ?? selectedCustomer?.conversations?.[0]
    navigate(firstConversation ? `/inbox?conversationId=${firstConversation.id}` : '/inbox')
  }

  function openTicketCreation() {
    if (!selectedCustomer) return
    const firstConversation = relatedConversations[0] ?? selectedCustomer.conversations?.[0]
    const params = new URLSearchParams({
      new: '1',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
    })
    if (firstConversation?.id) params.set('conversationId', firstConversation.id)
    navigate(`/tickets?${params.toString()}`)
  }

  function openAppointmentBooking() {
    if (!selectedCustomer) return
    const firstConversation = relatedConversations[0] ?? selectedCustomer.conversations?.[0]
    const params = new URLSearchParams({
      new: '1',
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
    })
    if (firstConversation?.id) params.set('conversationId', firstConversation.id)
    navigate(`/appointments?${params.toString()}`)
  }

  async function handleSave(payload: SaveCustomerPayload) {
    try {
      const isEditMode = modalMode === 'edit' && selectedCustomer
      const saved = modalMode === 'edit' && selectedCustomer
        ? await updateCustomer(selectedCustomer.id, payload)
        : await createCustomer(payload)
      setModalMode(null)
      setSelectedCustomer(saved)
      setSearchParams({ customerId: saved.id })
      refreshCustomers()
      showToast(isEditMode ? 'تم تحديث بيانات العميل' : 'تم حفظ ملف العميل', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ العميل'
      showToast(message, 'warning')
      throw new Error(message)
    }
  }

  async function handleDelete(customer: Customer) {
    if (!window.confirm('هل تريد حذف هذا العميل؟')) return
    try {
      await deleteCustomer(customer.id)
      setSelectedCustomer(null)
      setSearchParams({})
      refreshCustomers()
      showToast('تم حذف العميل', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف العميل', 'warning')
    }
  }

  return (
    <div className="page-layout customers-page">
      <PageHeader
        title="العملاء"
        description="ملفات العملاء مرتبطة بالمحادثات والقنوات داخل سياق الشركة الحالية."
        actions={canManageCustomers ? (
          <AppButton variant="primary" onClick={() => setModalMode('create')}>
            <Plus size={16} /> إضافة عميل
          </AppButton>
        ) : null}
      />

      <AppCard className="customers-filters">
        <AppInput value={search} type="search" placeholder="بحث بالاسم أو الجوال أو البريد" onChange={(event) => setSearch(event.target.value)} />
        <AppSelect value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={sourceChannel} onChange={(event) => setSourceChannel(event.target.value)}>
          <option value="">كل القنوات</option>
          {sourceChannelOptions.map((channel) => <option key={channel} value={channel}>{getChannelLabel(channel)}</option>)}
        </AppSelect>
      </AppCard>

      <div className="customers-grid">
        <section className="panel-panel customers-list-panel">
          <div className="panel-header split-header">
            <div>
              <h2>قائمة العملاء</h2>
              <p>{visibleCustomers.length.toLocaleString('ar-SA')} ملف ضمن المستأجر الحالي</p>
            </div>
          </div>

          <div className="customers-list-body">
            {isLoading ? <EmptyState title="جار تحميل العملاء" message="لحظات ونرتب الملفات." /> : null}
            {!isLoading && !visibleCustomers.length ? <EmptyState title="لا يوجد عملاء" message="أضف أول عميل أو غيّر الفلاتر الحالية." /> : null}

            <div className="customers-table-wrapper">
              <table className="platform-table customers-table">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>التواصل</th>
                    <th>الحالة</th>
                    <th>القناة</th>
                    <th>الوسوم</th>
                    <th>آخر نشاط</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className={customer.id === selectedCustomer?.id ? 'selected-row' : ''}
                      onClick={() => selectCustomer(customer)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') selectCustomer(customer)
                      }}
                    >
                      <td><strong>{customer.name}</strong><small>{customer.conversationsCount} محادثة</small></td>
                      <td><span>{customer.phone || 'لا يوجد جوال'}</span><small>{customer.email || 'لا يوجد بريد'}</small></td>
                      <td><StatusBadge label={statusLabels[customer.status]} tone={customerStatusTone(customer.status)} /></td>
                      <td>{getChannelLabel(customer.sourceChannel)}</td>
                      <td><div className="tag-list compact">{customer.tags.length ? customer.tags.map((tag) => <span key={tag}>{tag}</span>) : <small>لا توجد وسوم</small>}</div></td>
                      <td>{formatDate(customer.lastActivityAt)}</td>
                      <td>
                        <div className="platform-actions">
                          <AppButton variant="ghost" onClick={(event) => { event.stopPropagation(); selectCustomer(customer) }}><Eye size={15} /> عرض</AppButton>
                          {canManageCustomers ? <AppButton variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedCustomer(customer); setModalMode('edit') }}><Edit3 size={15} /> تعديل</AppButton> : null}
                          {canManageCustomers ? <AppButton variant="ghost" onClick={(event) => { event.stopPropagation(); handleDelete(customer) }}><Trash2 size={15} /> حذف</AppButton> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="customers-card-list">
              {visibleCustomers.map((customer) => (
                <article key={customer.id} className={`customer-list-card ${customer.id === selectedCustomer?.id ? 'selected' : ''}`} onClick={() => selectCustomer(customer)}>
                  <div className="customer-card-main">
                    <div>
                      <strong>{customer.name}</strong>
                      <small>{customer.conversationsCount} محادثة</small>
                    </div>
                    <StatusBadge label={statusLabels[customer.status]} tone={customerStatusTone(customer.status)} />
                  </div>

                  <dl>
                    <div><dt>الجوال</dt><dd>{customer.phone || 'لا يوجد جوال'}</dd></div>
                    <div><dt>البريد</dt><dd>{customer.email || 'لا يوجد بريد'}</dd></div>
                    <div><dt>القناة</dt><dd>{getChannelLabel(customer.sourceChannel)}</dd></div>
                    <div><dt>آخر نشاط</dt><dd>{formatDate(customer.lastActivityAt)}</dd></div>
                  </dl>

                  <div className="tag-list compact">
                    {customer.tags.length ? customer.tags.map((tag) => <span key={tag}>{tag}</span>) : <small>لا توجد وسوم</small>}
                  </div>

                  <div className="customer-card-actions">
                    <AppButton variant="ghost" onClick={(event) => { event.stopPropagation(); selectCustomer(customer) }}><Eye size={15} /> عرض</AppButton>
                    {canManageCustomers ? <AppButton variant="ghost" onClick={(event) => { event.stopPropagation(); setSelectedCustomer(customer); setModalMode('edit') }}><Edit3 size={15} /> تعديل</AppButton> : null}
                    {canManageCustomers ? <AppButton variant="ghost" onClick={(event) => { event.stopPropagation(); handleDelete(customer) }}><Trash2 size={15} /> حذف</AppButton> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="panel-panel customer-details-panel">
          {selectedCustomer ? (
            <>
              <div className="customer-profile-head">
                <span>{selectedCustomer.name.charAt(0)}</span>
                <div>
                  <h3>{selectedCustomer.name}</h3>
                  <p>{getChannelLabel(selectedCustomer.sourceChannel)} · {statusLabels[selectedCustomer.status]}</p>
                </div>
              </div>

              <div className="customer-detail-actions">
                {canManageCustomers ? <AppButton variant="primary" onClick={() => setModalMode('edit')}>تعديل العميل</AppButton> : null}
                <AppButton variant="secondary" onClick={openConversations}>فتح المحادثات</AppButton>
                {canManageAppointments ? <AppButton variant="secondary" onClick={openAppointmentBooking}>حجز موعد</AppButton> : null}
                {canManageTickets ? <AppButton variant="ghost" onClick={openTicketCreation}>إنشاء تذكرة</AppButton> : null}
              </div>

              <dl className="meta-list customer-detail-meta">
                <div><dt>الاسم</dt><dd>{selectedCustomer.name}</dd></div>
                <div><dt>الجوال</dt><dd>{selectedCustomer.phone || 'غير محدد'}</dd></div>
                <div><dt>البريد</dt><dd>{selectedCustomer.email || 'غير محدد'}</dd></div>
                <div><dt>الحالة</dt><dd><StatusBadge label={statusLabels[selectedCustomer.status]} tone={customerStatusTone(selectedCustomer.status)} /></dd></div>
                <div><dt>القناة المصدر</dt><dd>{getChannelLabel(selectedCustomer.sourceChannel)}</dd></div>
                <div><dt>عدد المحادثات</dt><dd>{selectedCustomer.conversationsCount.toLocaleString('ar-SA')}</dd></div>
                <div><dt>تاريخ الإنشاء</dt><dd>{formatDate(selectedCustomer.createdAt)}</dd></div>
                <div><dt>آخر نشاط</dt><dd>{formatDate(selectedCustomer.lastActivityAt)}</dd></div>
              </dl>

              <div className="profile-section">
                <h4>الوسوم</h4>
                <div className="tag-list">{selectedCustomer.tags.length ? selectedCustomer.tags.map((tag) => <span key={tag}>{tag}</span>) : <small>لا توجد وسوم</small>}</div>
              </div>

              <div className="profile-section">
                <h4>الملاحظات</h4>
                <p className="customer-notes">{selectedCustomer.notes || 'لا توجد ملاحظات مسجلة.'}</p>
              </div>

              <div className="profile-section">
                <h4>المحادثات المرتبطة</h4>
                <div className="context-activity-list">
                  {relatedConversations.length ? relatedConversations.map((conversation) => (
                    <article key={conversation.id} className="customer-conversation-link-card">
                      <strong>{getChannelLabel(conversation.channel ?? conversation.channelType)} · {conversation.status}</strong>
                      <small>
                        {conversation.lastMessagePreview || 'لا توجد معاينة'} · {formatDate(conversation.lastActivityDate ?? conversation.lastMessageAt ?? conversation.createdAt)}
                      </small>
                      {conversation.unreadCount > 0 ? <small>{conversation.unreadCount.toLocaleString('ar-SA')} غير مقروءة</small> : null}
                      <Link className="app-button app-button-secondary control-safe text-safe" to={`/inbox?conversationId=${conversation.id}`}>
                        فتح المحادثة
                      </Link>
                    </article>
                  )) : <EmptyState title="لا توجد محادثات مرتبطة بهذا العميل" message="سيظهر سجل المحادثات عند ارتباط العميل بقنوات التواصل." />}
                </div>
              </div>

              <div className="profile-section">
                <h4>المواعيد القادمة</h4>
                <div className="context-activity-list">
                  {upcomingAppointments.length ? upcomingAppointments.map((appointment) => (
                    <article key={appointment.id}>
                      <strong>{appointment.title}</strong>
                      <small>{formatDate(appointment.startAt)} · {appointmentStatusLabels[appointment.status]}</small>
                      <Link to={`/appointments?date=${appointment.startAt.slice(0, 10)}&customerId=${appointment.customerId}`}>فتح المواعيد</Link>
                    </article>
                  )) : <EmptyState title="لا توجد مواعيد قادمة" message="يمكنك حجز موعد جديد من ملف العميل." />}
                </div>
              </div>

              <div className="profile-section">
                <h4>التذاكر المرتبطة</h4>
                <div className="context-activity-list">
                  {linkedTickets.length ? linkedTickets.map((ticket) => (
                    <article key={ticket.id}>
                      <strong>{ticket.title}</strong>
                      <small>{ticketStatusLabels[ticket.status]} · {ticket.category || 'بدون تصنيف'} · {formatDate(ticket.dueAt)}</small>
                      <Link to={`/tickets?customerId=${selectedCustomer.id}`}>فتح التذاكر</Link>
                    </article>
                  )) : <EmptyState title="لا توجد تذاكر مرتبطة" message="يمكنك إنشاء تذكرة متابعة من ملف العميل." />}
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="اختر عميلًا لعرض التفاصيل." message="حدد عميلًا من القائمة لعرض بيانات التواصل والمحادثات والإجراءات." />
          )}
        </aside>
      </div>

      {modalMode ? (
        <CustomerModal
          mode={modalMode}
          initialCustomer={modalMode === 'edit' ? selectedCustomer : null}
          initialForm={createInitialForm}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
        />
      ) : null}
    </div>
  )
}
