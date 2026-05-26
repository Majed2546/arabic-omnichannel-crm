import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Edit3, Link as LinkIcon, Plus, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { fetchAppointments, type Appointment } from '../appointments/appointmentData'
import {
  createMeeting,
  fetchMeetings,
  meetingProviderLabels,
  meetingStatusLabels,
  updateMeeting,
  updateMeetingStatus,
  type Meeting,
  type MeetingPayload,
  type MeetingProvider,
  type MeetingStatus,
} from './meetingData'

type MeetingFormState = {
  appointmentId: string
  provider: MeetingProvider
  meetingLink: string
  meetingId: string
  status: MeetingStatus
  notes: string
}

const initialForm: MeetingFormState = {
  appointmentId: '',
  provider: 'CUSTOM',
  meetingLink: '',
  meetingId: '',
  status: 'LINK_ADDED',
  notes: '',
}

function statusTone(status: MeetingStatus) {
  if (status === 'COMPLETED' || status === 'SENT') return 'success'
  if (status === 'CANCELLED') return 'danger'
  if (status === 'NOT_CREATED') return 'muted'
  return 'info'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }) : 'غير محدد'
}

function toForm(meeting: Meeting): MeetingFormState {
  return {
    appointmentId: meeting.appointmentId,
    provider: meeting.provider,
    meetingLink: meeting.meetingLink,
    meetingId: meeting.meetingId ?? '',
    status: meeting.status,
    notes: meeting.notes ?? '',
  }
}

function toPayload(form: MeetingFormState): MeetingPayload {
  return {
    appointmentId: form.appointmentId,
    provider: form.provider,
    meetingLink: form.meetingLink.trim(),
    meetingId: form.meetingId.trim() || undefined,
    status: form.status,
    notes: form.notes.trim() || undefined,
  }
}

export default function MeetingsPage() {
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('meetings.manage')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [provider, setProvider] = useState('')
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [form, setForm] = useState<MeetingFormState>(initialForm)

  function refreshMeetings() {
    fetchMeetings({ provider, status })
      .then(setMeetings)
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل الاجتماعات', 'warning'))
  }

  useEffect(() => {
    if (!currentTenantId) return
    refreshMeetings()
  }, [currentTenantId, provider, status])

  useEffect(() => {
    if (!currentTenantId) return
    fetchAppointments({})
      .then(setAppointments)
      .catch(() => setAppointments([]))
  }, [currentTenantId])

  function openCreate() {
    setEditingMeeting(null)
    setForm({ ...initialForm, appointmentId: appointments[0]?.id ?? '' })
    setModalOpen(true)
  }

  function openEdit(meeting: Meeting) {
    setEditingMeeting(meeting)
    setForm(toForm(meeting))
    setModalOpen(true)
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    showToast('تم نسخ رابط الاجتماع', 'success')
  }

  async function saveMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      if (editingMeeting) await updateMeeting(editingMeeting.id, toPayload(form))
      else await createMeeting(toPayload(form))
      setModalOpen(false)
      setEditingMeeting(null)
      refreshMeetings()
      showToast('تم حفظ الاجتماع المرئي', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الاجتماع', 'warning')
    }
  }

  async function markSent(meeting: Meeting) {
    try {
      await updateMeetingStatus(meeting.id, 'SENT')
      refreshMeetings()
      showToast('سيتم إرسال الرابط عبر واتساب أو القالب في إصدار لاحق', 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث حالة الاجتماع', 'warning')
    }
  }

  return (
    <div className="page-layout meetings-page">
      <PageHeader
        title="الاجتماعات المرئية"
        description="إدارة روابط الاجتماعات المرتبطة بالمواعيد بدون تكامل مباشر مع مزودي الاجتماعات حاليًا."
        actions={canManage ? <AppButton variant="primary" onClick={openCreate}><Plus size={16} /> إضافة اجتماع</AppButton> : null}
      />

      <AppCard className="meetings-filters">
        <AppSelect value={provider} onChange={(event) => setProvider(event.target.value)}>
          <option value="">كل المزودين</option>
          {Object.entries(meetingProviderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">كل الحالات</option>
          {Object.entries(meetingStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
      </AppCard>

      <div className="meeting-card-grid">
        {meetings.map((meeting) => (
          <article key={meeting.id} className="meeting-card">
            <header>
              <div>
                <h3>{meeting.appointmentTitle ?? 'اجتماع مرئي'}</h3>
                <p>{meeting.customerName ?? 'عميل'} · {formatDate(meeting.appointmentStartAt)}</p>
              </div>
              <StatusBadge label={meetingStatusLabels[meeting.status]} tone={statusTone(meeting.status)} />
            </header>
            <dl>
              <div><dt>المزود</dt><dd>{meetingProviderLabels[meeting.provider]}</dd></div>
              <div><dt>رابط الاجتماع</dt><dd><a href={meeting.meetingLink} target="_blank" rel="noreferrer">{meeting.meetingLink}</a></dd></div>
              <div><dt>معرف الاجتماع</dt><dd>{meeting.meetingId || 'غير محدد'}</dd></div>
              <div><dt>العميل</dt><dd>{meeting.customerPhone || meeting.customerEmail || 'غير محدد'}</dd></div>
            </dl>
            {meeting.notes ? <p className="meeting-notes">{meeting.notes}</p> : null}
            <div className="meeting-actions">
              <AppButton variant="ghost" onClick={() => copyLink(meeting.meetingLink)}><Copy size={15} /> نسخ الرابط</AppButton>
              {meeting.conversationId ? <Link className="app-button app-button-secondary control-safe text-safe" to={`/inbox?conversationId=${meeting.conversationId}`}><LinkIcon size={15} /> المحادثة</Link> : null}
              {canManage ? <AppButton variant="ghost" onClick={() => openEdit(meeting)}><Edit3 size={15} /> تعديل</AppButton> : null}
              {canManage ? <AppButton variant="ghost" onClick={() => markSent(meeting)}><Send size={15} /> إرسال رابط الاجتماع</AppButton> : null}
            </div>
          </article>
        ))}
        {!meetings.length ? <EmptyState title="لا توجد اجتماعات مرئية" message="أضف رابط اجتماع مرتبط بموعد لظهوره هنا." /> : null}
      </div>

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="customer-modal panel-panel meeting-modal" onSubmit={saveMeeting}>
            <div className="panel-header split-header">
              <div>
                <h2>{editingMeeting ? 'تعديل اجتماع مرئي' : 'إضافة اجتماع مرئي'}</h2>
                <p>اختر الموعد والصق رابط الاجتماع. لا يوجد تكامل API مباشر بعد.</p>
              </div>
              <AppButton variant="ghost" onClick={() => setModalOpen(false)}>إغلاق</AppButton>
            </div>
            <div className="customer-form-grid">
              <label>
                <span>الموعد</span>
                <AppSelect required value={form.appointmentId} onChange={(event) => setForm({ ...form, appointmentId: event.target.value })}>
                  <option value="">اختر الموعد</option>
                  {appointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      {appointment.title} - {appointment.customerName ?? 'عميل'} - {formatDate(appointment.startAt)}
                    </option>
                  ))}
                </AppSelect>
              </label>
              <label>
                <span>المزود</span>
                <AppSelect value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value as MeetingProvider })}>
                  {Object.entries(meetingProviderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </AppSelect>
              </label>
              <label className="customer-form-wide">
                <span>رابط الاجتماع</span>
                <AppInput required dir="ltr" value={form.meetingLink} onChange={(event) => setForm({ ...form, meetingLink: event.target.value })} />
              </label>
              <label><span>معرف الاجتماع</span><AppInput value={form.meetingId} onChange={(event) => setForm({ ...form, meetingId: event.target.value })} /></label>
              <label><span>الحالة</span><AppSelect value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as MeetingStatus })}>{Object.entries(meetingStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></label>
              <label className="customer-form-wide"><span>ملاحظات</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
            </div>
            <div className="form-actions">
              <AppButton variant="ghost" onClick={() => setModalOpen(false)}>إلغاء</AppButton>
              <AppButton type="submit" variant="primary">حفظ الاجتماع</AppButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
