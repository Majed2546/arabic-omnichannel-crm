import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Edit3, Plus, Trash2, X } from 'lucide-react'
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
import { fetchCustomers, type Customer } from '../customers/customerData'
import {
  createTicket,
  deleteTicket,
  fetchTickets,
  updateTicket,
  updateTicketStatus,
  type Ticket,
  type TicketPayload,
  type TicketPriority,
  type TicketStatus,
} from './ticketData'

const statusLabels: Record<TicketStatus, string> = {
  OPEN: 'مفتوحة',
  IN_PROGRESS: 'قيد المعالجة',
  WAITING_CUSTOMER: 'بانتظار العميل',
  RESOLVED: 'تم الحل',
  CLOSED: 'مغلقة',
}

const priorityLabels: Record<TicketPriority, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
}

type TicketFormState = {
  customerId: string
  conversationId: string
  assignedUserId: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string
  tags: string
  dueAt: string
}

const emptyForm: TicketFormState = {
  customerId: '',
  conversationId: '',
  assignedUserId: '',
  title: '',
  description: '',
  status: 'OPEN',
  priority: 'MEDIUM',
  category: '',
  tags: '',
  dueAt: '',
}

function statusTone(status: TicketStatus) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success'
  if (status === 'WAITING_CUSTOMER') return 'warning'
  if (status === 'IN_PROGRESS') return 'info'
  return 'muted'
}

function priorityTone(priority: TicketPriority) {
  if (priority === 'URGENT') return 'danger'
  if (priority === 'HIGH') return 'warning'
  if (priority === 'MEDIUM') return 'info'
  return 'muted'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير محدد'
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return offsetDate.toISOString().slice(0, 16)
}

function toPayload(form: TicketFormState): TicketPayload {
  return {
    customerId: form.customerId || undefined,
    conversationId: form.conversationId.trim() || undefined,
    assignedUserId: form.assignedUserId.trim() || undefined,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    priority: form.priority,
    category: form.category.trim() || undefined,
    tags: form.tags.split(/[،,]/).map((tag) => tag.trim()).filter(Boolean),
    dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
  }
}

function toForm(ticket: Ticket): TicketFormState {
  return {
    customerId: ticket.customerId ?? '',
    conversationId: ticket.conversationId ?? '',
    assignedUserId: ticket.assignedUserId ?? '',
    title: ticket.title,
    description: ticket.description ?? '',
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category ?? '',
    tags: ticket.tags.join('، '),
    dueAt: toDateTimeLocal(ticket.dueAt),
  }
}

function TicketModal({
  customers,
  form,
  editingTicket,
  onChange,
  onClose,
  onSubmit,
}: {
  customers: Customer[]
  form: TicketFormState
  editingTicket: Ticket | null
  onChange: (form: TicketFormState) => void
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <form
        className="customer-modal ticket-modal panel-panel"
        role="dialog"
        aria-modal="true"
        aria-label={editingTicket ? 'تعديل التذكرة' : 'إنشاء تذكرة'}
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-header split-header">
          <div>
            <h2>{editingTicket ? 'تعديل التذكرة' : 'إنشاء تذكرة'}</h2>
            <p>التذكرة تحفظ داخل سياق الشركة الحالية وتبقى مرتبطة بالعميل أو المحادثة عند توفرهما.</p>
          </div>
          <AppButton type="button" variant="ghost" className="customer-modal-close" aria-label="إغلاق" onClick={onClose}>
            <X size={18} />
          </AppButton>
        </div>

        <div className="ticket-form-grid">
          <label className="ticket-form-wide">
            <span>عنوان التذكرة</span>
            <AppInput autoFocus required value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
          </label>
          <label>
            <span>العميل</span>
            <AppSelect value={form.customerId} onChange={(event) => onChange({ ...form, customerId: event.target.value })}>
              <option value="">بدون عميل محدد</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>المحادثة</span>
            <AppInput value={form.conversationId} placeholder="معرّف المحادثة" onChange={(event) => onChange({ ...form, conversationId: event.target.value })} />
          </label>
          <label>
            <span>الحالة</span>
            <AppSelect value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as TicketStatus })}>
              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>الأولوية</span>
            <AppSelect value={form.priority} onChange={(event) => onChange({ ...form, priority: event.target.value as TicketPriority })}>
              {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </AppSelect>
          </label>
          <label>
            <span>التصنيف</span>
            <AppInput value={form.category} placeholder="دعم، متابعة، شكوى" onChange={(event) => onChange({ ...form, category: event.target.value })} />
          </label>
          <label>
            <span>الموظف المسند</span>
            <AppInput value={form.assignedUserId} placeholder="اختياري" onChange={(event) => onChange({ ...form, assignedUserId: event.target.value })} />
          </label>
          <label>
            <span>تاريخ الاستحقاق</span>
            <AppInput type="datetime-local" value={form.dueAt} onChange={(event) => onChange({ ...form, dueAt: event.target.value })} />
          </label>
          <label>
            <span>الوسوم</span>
            <AppInput value={form.tags} placeholder="عاجل، متابعة" onChange={(event) => onChange({ ...form, tags: event.target.value })} />
          </label>
          <label className="ticket-form-wide">
            <span>الوصف</span>
            <textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
          </label>
        </div>

        <div className="form-actions">
          <AppButton type="button" variant="ghost" onClick={onClose}>إلغاء</AppButton>
          <AppButton type="submit" variant="primary" disabled={!form.title.trim()}>
            {editingTicket ? 'حفظ التعديلات' : 'إنشاء التذكرة'}
          </AppButton>
        </div>
      </form>
    </div>
  )
}

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('tickets.manage')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') ?? '')
  const [modalOpen, setModalOpen] = useState(searchParams.get('new') === '1')
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [form, setForm] = useState<TicketFormState>(emptyForm)
  const [isLoading, setLoading] = useState(true)

  const categories = useMemo(
    () => Array.from(new Set(tickets.map((ticket) => ticket.category).filter(Boolean))) as string[],
    [tickets],
  )

  function buildInitialForm() {
    const queryCustomerId = searchParams.get('customerId') ?? ''
    const customerName = searchParams.get('customerName') ?? ''
    const conversationId = searchParams.get('conversationId') ?? ''
    return {
      ...emptyForm,
      customerId: queryCustomerId,
      conversationId,
      title: customerName ? `متابعة مع ${customerName}` : 'تذكرة متابعة',
    }
  }

  function refreshTickets() {
    if (!currentTenantId) return
    setLoading(true)
    fetchTickets({ status, priority, category, customerId })
      .then(setTickets)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل التذاكر', 'warning'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!currentTenantId) return
    refreshTickets()
  }, [currentTenantId, status, priority, category, customerId])

  useEffect(() => {
    if (!currentTenantId) return
    fetchCustomers({})
      .then(setCustomers)
      .catch(() => setCustomers([]))
  }, [currentTenantId])

  useEffect(() => {
    const nextCustomerId = searchParams.get('customerId') ?? ''
    if (nextCustomerId !== customerId) setCustomerId(nextCustomerId)
    if (searchParams.get('new') === '1') {
      setEditingTicket(null)
      setForm(buildInitialForm())
      setModalOpen(true)
    }
  }, [searchParams])

  function openCreate() {
    setEditingTicket(null)
    setForm(emptyForm)
    setModalOpen(true)
    setSearchParams({})
  }

  function openEdit(ticket: Ticket) {
    setEditingTicket(ticket)
    setForm(toForm(ticket))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingTicket(null)
    if (searchParams.get('new') === '1') setSearchParams({})
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (editingTicket) await updateTicket(editingTicket.id, toPayload(form))
      else await createTicket(toPayload(form))
      closeModal()
      refreshTickets()
      showToast(editingTicket ? 'تم تحديث التذكرة' : 'تم إنشاء التذكرة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ التذكرة', 'warning')
    }
  }

  async function handleStatus(ticket: Ticket, nextStatus: TicketStatus) {
    try {
      await updateTicketStatus(ticket.id, nextStatus)
      refreshTickets()
      showToast('تم تحديث حالة التذكرة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث حالة التذكرة', 'warning')
    }
  }

  async function handleDelete(ticket: Ticket) {
    if (!window.confirm('هل تريد حذف هذه التذكرة؟')) return
    try {
      await deleteTicket(ticket.id)
      refreshTickets()
      showToast('تم حذف التذكرة', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف التذكرة', 'warning')
    }
  }

  return (
    <div className="page-layout tickets-page">
      <PageHeader
        title="التذاكر"
        description="متابعة طلبات الدعم والتصعيد المرتبطة بالعملاء والمحادثات داخل الشركة الحالية."
        actions={canManage ? (
          <AppButton variant="primary" onClick={openCreate}>
            <Plus size={16} /> إنشاء تذكرة
          </AppButton>
        ) : null}
      />

      <AppCard className="tickets-filters">
        <AppSelect value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">كل الأولويات</option>
          {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">كل التصنيفات</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </AppSelect>
        <AppSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">كل العملاء</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </AppSelect>
      </AppCard>

      {isLoading ? <EmptyState title="جار تحميل التذاكر" message="نرتب قائمة المتابعة الحالية." /> : null}
      {!isLoading && !tickets.length ? <EmptyState title="لا توجد تذاكر" message="أنشئ تذكرة من هنا أو من ملف العميل أو من صندوق الوارد." /> : null}

      <section className="ticket-card-grid">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="ticket-card panel-panel">
            <header className="ticket-card-header">
              <div>
                <h2>{ticket.title}</h2>
                <p>{ticket.customerName || ticket.customerPhone || 'بدون عميل محدد'}</p>
              </div>
              <div className="ticket-badges">
                <StatusBadge label={statusLabels[ticket.status]} tone={statusTone(ticket.status)} />
                <StatusBadge label={priorityLabels[ticket.priority]} tone={priorityTone(ticket.priority)} />
              </div>
            </header>

            <p className="ticket-description">{ticket.description || 'لا يوجد وصف مسجل لهذه التذكرة.'}</p>

            <dl className="meta-list ticket-meta">
              <div><dt>التصنيف</dt><dd>{ticket.category || 'غير محدد'}</dd></div>
              <div><dt>الموظف المسند</dt><dd>{ticket.assignedUserName || ticket.assignedUserId || 'غير مسند'}</dd></div>
              <div><dt>تاريخ الاستحقاق</dt><dd>{formatDate(ticket.dueAt)}</dd></div>
              <div><dt>آخر تحديث</dt><dd>{formatDate(ticket.updatedAt)}</dd></div>
            </dl>

            {ticket.conversationId ? (
              <div className="ticket-conversation-link">
                <strong>المحادثة</strong>
                <span>{ticket.conversationPreview || ticket.conversationStatus || 'محادثة مرتبطة'}</span>
                <Link className="app-button app-button-secondary control-safe text-safe" to={`/inbox?conversationId=${ticket.conversationId}`}>فتح المحادثة</Link>
              </div>
            ) : null}

            <div className="tag-list compact">
              {ticket.tags.length ? ticket.tags.map((tag) => <span key={tag}>{tag}</span>) : <small>لا توجد وسوم</small>}
            </div>

            <footer className="ticket-actions">
              {canManage ? <AppButton variant="ghost" onClick={() => openEdit(ticket)}><Edit3 size={15} /> تعديل</AppButton> : null}
              {canManage && ticket.status !== 'RESOLVED' ? <AppButton variant="ghost" onClick={() => handleStatus(ticket, 'RESOLVED')}>تم الحل</AppButton> : null}
              {canManage ? <AppButton variant="ghost" onClick={() => handleDelete(ticket)}><Trash2 size={15} /> حذف</AppButton> : null}
            </footer>
          </article>
        ))}
      </section>

      {modalOpen ? (
        <TicketModal
          customers={customers}
          form={form}
          editingTicket={editingTicket}
          onChange={setForm}
          onClose={closeModal}
          onSubmit={handleSave}
        />
      ) : null}
    </div>
  )
}
