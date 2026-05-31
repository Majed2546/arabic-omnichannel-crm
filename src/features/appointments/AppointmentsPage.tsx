import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Edit3, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { fetchCustomers, type Customer } from '../customers/customerData'
import { meetingProviderLabels, meetingStatusLabels, type MeetingProvider, type MeetingStatus } from '../meetings/meetingData'
import {
  createAppointment,
  deleteAppointment,
  fetchAppointments,
  updateAppointment,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentMeetingType,
  type AppointmentPayload,
  type AppointmentStatus,
} from './appointmentData'

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: 'مجدول',
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغي',
  COMPLETED: 'مكتمل',
  NO_SHOW: 'لم يحضر',
}

const meetingTypeLabels: Record<AppointmentMeetingType, string> = {
  IN_PERSON: 'حضوري',
  PHONE: 'اتصال هاتفي',
  ONLINE: 'اجتماع أونلاين',
}

type AssignmentUser = {
  id: string
  name: string
  email?: string
  userType?: string
}

type AssignmentTeam = {
  id: string
  name: string
  isActive?: boolean
}

type AppointmentFormState = {
  customerId: string
  conversationId: string
  assignedUserId: string
  assignedTeamId: string
  title: string
  description: string
  startAt: string
  endAt: string
  status: AppointmentStatus
  meetingType: AppointmentMeetingType
  meetingLink: string
  location: string
  notes: string
}

function dateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function dateTimeLocalValue(date = new Date()) {
  const copy = new Date(date)
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset())
  return copy.toISOString().slice(0, 16)
}

function defaultForm(searchParams: URLSearchParams): AppointmentFormState {
  const start = new Date()
  start.setHours(start.getHours() + 1, 0, 0, 0)
  const end = new Date(start)
  end.setMinutes(end.getMinutes() + 30)

  return {
    customerId: searchParams.get('customerId') ?? '',
    conversationId: searchParams.get('conversationId') ?? '',
    assignedUserId: '',
    assignedTeamId: '',
    title: searchParams.get('customerName') ? `موعد مع ${searchParams.get('customerName')}` : 'موعد عميل',
    description: '',
    startAt: dateTimeLocalValue(start),
    endAt: dateTimeLocalValue(end),
    status: 'SCHEDULED',
    meetingType: 'PHONE',
    meetingLink: '',
    location: '',
    notes: '',
  }
}

function toForm(appointment: Appointment): AppointmentFormState {
  return {
    customerId: appointment.customerId,
    conversationId: appointment.conversationId ?? '',
    assignedUserId: appointment.assignedUserId ?? '',
    assignedTeamId: appointment.assignedTeamId ?? '',
    title: appointment.title,
    description: appointment.description ?? '',
    startAt: dateTimeLocalValue(new Date(appointment.startAt)),
    endAt: dateTimeLocalValue(new Date(appointment.endAt)),
    status: appointment.status,
    meetingType: appointment.meetingType,
    meetingLink: appointment.meetingLink ?? '',
    location: appointment.location ?? '',
    notes: appointment.notes ?? '',
  }
}

function toPayload(form: AppointmentFormState): AppointmentPayload {
  return {
    customerId: form.customerId,
    conversationId: form.conversationId || undefined,
    assignedUserId: form.assignedUserId || undefined,
    assignedTeamId: form.assignedTeamId || undefined,
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    startAt: new Date(form.startAt).toISOString(),
    endAt: new Date(form.endAt).toISOString(),
    status: form.status,
    meetingType: form.meetingType,
    meetingLink: form.meetingLink.trim() || undefined,
    location: form.location.trim() || undefined,
    notes: form.notes.trim() || undefined,
  }
}

function statusTone(status: AppointmentStatus) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'success'
  if (status === 'CANCELLED' || status === 'NO_SHOW') return 'danger'
  return 'info'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
}

function providerLabel(value?: string | null) {
  if (!value) return 'رابط مخصص'
  return meetingProviderLabels[value as MeetingProvider] ?? value
}

function visualMeetingStatusLabel(value?: string | null) {
  if (!value) return 'لم ينشأ'
  return meetingStatusLabels[value as MeetingStatus] ?? value
}

export default function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('appointments.manage')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [assignmentUsers, setAssignmentUsers] = useState<AssignmentUser[]>([])
  const [teams, setTeams] = useState<AssignmentTeam[]>([])
  const [date, setDate] = useState(searchParams.get('date') ?? dateInputValue())
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [customerId, setCustomerId] = useState(searchParams.get('customerId') ?? '')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [assignedTeamId, setAssignedTeamId] = useState('')
  const [modalOpen, setModalOpen] = useState(searchParams.get('new') === '1')
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [form, setForm] = useState<AppointmentFormState>(() => defaultForm(searchParams))

  function refreshAppointments() {
    fetchAppointments({ date, status, customerId, assignedUserId, assignedTeamId })
      .then(setAppointments)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل المواعيد', 'warning'))
  }

  useEffect(() => {
    if (!currentTenantId) return
    refreshAppointments()
  }, [currentTenantId, date, status, customerId, assignedUserId, assignedTeamId])

  useEffect(() => {
    if (!currentTenantId) return
    fetchCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]))
    apiFetch(apiUrl('/users?userType=AGENT,CONSULTANT,SUPERVISOR&status=ACTIVE'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setAssignmentUsers(Array.isArray(payload) ? payload : []))
      .catch(() => setAssignmentUsers([]))
    apiFetch(apiUrl('/teams'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setTeams(Array.isArray(payload) ? payload.filter((team: AssignmentTeam) => team.isActive !== false) : []))
      .catch(() => setTeams([]))
  }, [currentTenantId])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingAppointment(null)
      setForm(defaultForm(searchParams))
      setModalOpen(true)
    }
  }, [searchParams])

  const timelineAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [appointments],
  )

  function openCreate() {
    setEditingAppointment(null)
    setForm(defaultForm(new URLSearchParams()))
    setModalOpen(true)
  }

  function openEdit(appointment: Appointment) {
    setEditingAppointment(appointment)
    setForm(toForm(appointment))
    setModalOpen(true)
  }

  async function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const saved = editingAppointment
        ? await updateAppointment(editingAppointment.id, toPayload(form))
        : await createAppointment(toPayload(form))
      setModalOpen(false)
      setEditingAppointment(null)
      setSearchParams({})
      refreshAppointments()
      showToast(editingAppointment ? 'تم تحديث الموعد' : 'تم إنشاء الموعد', 'success')
      if (!customerId) setCustomerId(saved.customerId)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الموعد', 'warning')
    }
  }

  async function changeStatus(appointment: Appointment, nextStatus: AppointmentStatus) {
    try {
      await updateAppointmentStatus(appointment.id, nextStatus)
      refreshAppointments()
      showToast('تم تحديث حالة الموعد', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث الحالة', 'warning')
    }
  }

  async function removeAppointment(appointment: Appointment) {
    if (!window.confirm('هل تريد حذف هذا الموعد؟')) return
    try {
      await deleteAppointment(appointment.id)
      refreshAppointments()
      showToast('تم حذف الموعد', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حذف الموعد', 'warning')
    }
  }

  async function copyMeetingLink(link?: string | null) {
    if (!link) {
      showToast('لا يوجد رابط اجتماع لنسخه', 'warning')
      return
    }
    await navigator.clipboard.writeText(link)
    showToast('تم نسخ رابط الاجتماع', 'success')
  }

  return (
    <div className="page-layout appointments-page">
      <PageHeader
        title="المواعيد والتقويم"
        description="جدولة مواعيد العملاء وربطها بالمحادثات والمستشارين داخل سياق الشركة الحالية."
        actions={canManage ? <AppButton variant="primary" onClick={openCreate}><Plus size={16} /> حجز موعد</AppButton> : null}
      />

      <AppCard className="appointments-filters">
        <AppInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <AppSelect value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
          <option value="">كل العملاء</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </AppSelect>
        <AppSelect value={assignedUserId} onChange={(event) => setAssignedUserId(event.target.value)}>
          <option value="">كل المسؤولين</option>
          {assignmentUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}
        </AppSelect>
        <AppSelect value={assignedTeamId} onChange={(event) => setAssignedTeamId(event.target.value)}>
          <option value="">كل الفرق</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
        </AppSelect>
      </AppCard>

      <div className="appointments-layout">
        <section className="panel-panel appointments-list-panel">
          <div className="panel-header split-header">
            <div>
              <h2>قائمة المواعيد</h2>
              <p>{appointments.length.toLocaleString('ar-SA')} موعد ضمن الفلاتر الحالية</p>
            </div>
          </div>
          <div className="appointment-card-list">
            {appointments.map((appointment) => (
              <article key={appointment.id} className="appointment-card">
                <header>
                  <div>
                    <h3>{appointment.title}</h3>
                    <p>{appointment.customerName ?? 'عميل'} · {formatDateTime(appointment.startAt)}</p>
                  </div>
                  <StatusBadge label={statusLabels[appointment.status]} tone={statusTone(appointment.status)} />
                </header>
                <dl>
                  <div><dt>النوع</dt><dd>{meetingTypeLabels[appointment.meetingType]}</dd></div>
                  <div><dt>النهاية</dt><dd>{formatDateTime(appointment.endAt)}</dd></div>
                  <div><dt>المستشار</dt><dd>{appointment.assignedUserName || appointment.assignedUserId || 'غير محدد'}</dd></div>
                  <div><dt>الفريق</dt><dd>{appointment.assignedTeamName || appointment.assignedTeamId || 'غير مسند'}</dd></div>
                  <div><dt>الموقع/الرابط</dt><dd>{appointment.meetingLink || appointment.location || 'غير محدد'}</dd></div>
                  <div><dt>مزود الاجتماع</dt><dd>{appointment.visualMeetingLink || appointment.meetingLink ? providerLabel(appointment.meetingProvider) : 'غير محدد'}</dd></div>
                  <div><dt>حالة الاجتماع</dt><dd>{visualMeetingStatusLabel(appointment.meetingStatus)}</dd></div>
                </dl>
                {appointment.notes ? <p className="appointment-notes">{appointment.notes}</p> : null}
                <div className="appointment-actions">
                  {appointment.conversationId ? <Link className="app-button app-button-secondary control-safe text-safe" to={`/inbox?conversationId=${appointment.conversationId}`}>فتح المحادثة</Link> : null}
                  {appointment.visualMeetingId ? <Link className="app-button app-button-secondary control-safe text-safe" to="/meetings">فتح الاجتماع</Link> : null}
                  {appointment.visualMeetingLink || appointment.meetingLink ? <AppButton variant="ghost" onClick={() => copyMeetingLink(appointment.visualMeetingLink ?? appointment.meetingLink)}>نسخ الرابط</AppButton> : null}
                  {canManage ? <AppButton variant="ghost" onClick={() => openEdit(appointment)}><Edit3 size={15} /> تعديل</AppButton> : null}
                  {canManage ? <AppButton variant="ghost" onClick={() => changeStatus(appointment, 'CONFIRMED')}><CheckCircle2 size={15} /> تأكيد</AppButton> : null}
                  {canManage ? <AppButton variant="ghost" onClick={() => showToast('سيتم إرسال الرابط عبر واتساب أو القالب في إصدار لاحق', 'info')}><MessageCircle size={15} /> إرسال رابط الاجتماع</AppButton> : null}
                  {canManage ? <AppButton variant="ghost" onClick={() => removeAppointment(appointment)}><Trash2 size={15} /> حذف</AppButton> : null}
                </div>
              </article>
            ))}
            {!appointments.length ? <EmptyState title="لا توجد مواعيد" message="غيّر الفلاتر أو احجز موعدًا جديدًا للعميل." /> : null}
          </div>
        </section>

        <aside className="panel-panel appointments-timeline-panel">
          <div className="panel-header">
            <h2>تقويم اليوم</h2>
            <p>عرض زمني مبسط للمواعيد المحددة.</p>
          </div>
          <div className="appointment-timeline">
            {timelineAppointments.map((appointment) => (
              <article key={appointment.id}>
                <time>{new Date(appointment.startAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</time>
                <div>
                  <strong>{appointment.title}</strong>
                  <small>{appointment.customerName ?? 'عميل'} · {statusLabels[appointment.status]}</small>
                </div>
              </article>
            ))}
            {!timelineAppointments.length ? <EmptyState title="لا توجد مواعيد اليوم" message="سيظهر جدول اليوم هنا عند إضافة مواعيد." /> : null}
          </div>
          <div className="inactive-tenant-banner soft-warning">
            <strong>تذكيرات واتساب</strong>
            <p>سيتم ربط تذكيرات واتساب في إصدار لاحق.</p>
          </div>
        </aside>
      </div>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="customer-modal panel-panel appointment-modal" onSubmit={saveAppointment}>
            <div className="panel-header split-header">
              <div>
                <h2>{editingAppointment ? 'تعديل موعد' : 'حجز موعد'}</h2>
                <p>اربط الموعد بعميل ومحادثة عند توفرها.</p>
              </div>
              <AppButton variant="ghost" onClick={() => { setModalOpen(false); setSearchParams({}) }}>إغلاق</AppButton>
            </div>
            <div className="customer-form-grid">
              <label><span>العميل</span><AppSelect required value={form.customerId} onChange={(event) => setForm({ ...form, customerId: event.target.value })}><option value="">اختر العميل</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</AppSelect></label>
              <label><span>معرف المحادثة</span><AppInput value={form.conversationId} onChange={(event) => setForm({ ...form, conversationId: event.target.value })} /></label>
              <label><span>العنوان</span><AppInput autoFocus required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
              <label><span>المستشار/الموظف</span><AppSelect value={form.assignedUserId} onChange={(event) => setForm({ ...form, assignedUserId: event.target.value })}><option value="">غير مسند لموظف</option>{assignmentUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>)}</AppSelect></label>
              <label><span>الفريق</span><AppSelect value={form.assignedTeamId} onChange={(event) => setForm({ ...form, assignedTeamId: event.target.value })}><option value="">غير مسند لفريق</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</AppSelect></label>
              <label><span>البداية</span><AppInput type="datetime-local" required value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label>
              <label><span>النهاية</span><AppInput type="datetime-local" required value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
              <label><span>الحالة</span><AppSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AppointmentStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></label>
              <label><span>نوع الموعد</span><AppSelect value={form.meetingType} onChange={(event) => setForm({ ...form, meetingType: event.target.value as AppointmentMeetingType })}>{Object.entries(meetingTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></label>
              <label><span>رابط الاجتماع</span><AppInput value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} /></label>
              <label><span>الموقع</span><AppInput value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} /></label>
              <label className="customer-form-wide"><span>الوصف</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
              <label className="customer-form-wide"><span>ملاحظات</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            </div>
            <div className="inactive-tenant-banner soft-warning">
              <strong>ملاحظة</strong>
              <p>سيتم ربط تذكيرات واتساب في إصدار لاحق.</p>
            </div>
            <div className="form-actions">
              <AppButton variant="ghost" onClick={() => { setModalOpen(false); setSearchParams({}) }}>إلغاء</AppButton>
              <AppButton type="submit" variant="primary">حفظ الموعد</AppButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
