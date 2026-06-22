import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppCard } from '../../components/ui/AppCard'
import { AppButton } from '../../components/ui/AppButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { getChannelLabel } from '../../shared/utils'
import { useUiStore } from '../../stores/uiStore'
import type { TenantPlan, TenantStatus } from '../../tenants/tenantTypes'
import { TenantPlanBadge, TenantStatusBadge } from './PlatformBadges'
import {
  createOnboardingRequest,
  createPlatformCompany,
  createTenantFromOnboardingRequest,
  fetchOnboardingRequests,
  fetchPlatformCompanies,
  updateOnboardingRequest,
  updateOnboardingRequestStatus,
  updatePlatformCompany,
  updatePlatformCompanyStatus,
  type OnboardingOperationMode,
  type OnboardingPlan,
  type OnboardingRequest,
  type OnboardingRequestStatus,
  type PlatformCompany,
  type SaveCompanyPayload,
  type SaveOnboardingRequestPayload,
} from './platformData'

function formatDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString('ar-SA') : 'غير محدد'
}

const requestStatusLabels: Record<OnboardingRequestStatus, string> = {
  new: 'جديد',
  waiting_for_info: 'بانتظار معلومات',
  under_review: 'قيد المراجعة',
  ready_to_create: 'جاهز للإنشاء',
  activated: 'تم التفعيل',
  rejected: 'مرفوض',
}

const requestPlanLabels: Record<OnboardingPlan, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const operationModeLabels: Record<OnboardingOperationMode, string> = {
  platform_only: 'المنصة فقط',
  app_and_platform: 'واتساب الجوال + المنصة',
}

const channelOptions = ['WHATSAPP', 'EMAIL', 'WEBCHAT', 'INSTAGRAM', 'TELEGRAM', 'SMS', 'VOICE', 'X']

function isFinalRequestStatus(status: OnboardingRequestStatus) {
  return status === 'activated' || status === 'rejected'
}

function RequestStatusBadge({ status }: { status: OnboardingRequestStatus }) {
  const tone = status === 'activated'
    ? 'success'
    : status === 'ready_to_create'
      ? 'info'
      : status === 'rejected'
        ? 'danger'
        : status === 'waiting_for_info'
          ? 'warning'
          : 'muted'
  return <StatusBadge label={requestStatusLabels[status]} tone={tone} />
}

function RequestPlanBadge({ plan }: { plan: OnboardingPlan }) {
  const tone = plan === 'enterprise' ? 'vip' : plan === 'professional' ? 'info' : 'muted'
  return <StatusBadge label={requestPlanLabels[plan]} tone={tone} />
}

function usePlatformCompanies() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([])

  const refresh = () => {
    let disposed = false
    fetchPlatformCompanies().then((items) => {
      if (!disposed) setCompanies(items)
    })
    return () => {
      disposed = true
    }
  }

  useEffect(() => {
    const dispose = refresh()
    return () => {
      dispose()
    }
  }, [])

  return { companies, refresh }
}

function useOnboardingRequests() {
  const [requests, setRequests] = useState<OnboardingRequest[]>([])
  const [isLoading, setLoading] = useState(true)
  const showToast = useUiStore((state) => state.showToast)

  const refresh = () => {
    let disposed = false
    setLoading(true)
    fetchOnboardingRequests()
      .then((items) => {
        if (!disposed) setRequests(items)
      })
      .catch((error) => {
        if (!disposed) showToast(error instanceof Error ? error.message : 'تعذر تحميل طلبات الاشتراك', 'warning')
      })
      .finally(() => {
        if (!disposed) setLoading(false)
      })
    return () => {
      disposed = true
    }
  }

  useEffect(() => {
    const dispose = refresh()
    return () => {
      dispose()
    }
  }, [])

  return { requests, isLoading, refresh }
}

function CompanyActions({
  company,
  onEdit,
  onStatus,
}: {
  company: PlatformCompany
  onEdit: (company: PlatformCompany) => void
  onStatus: (company: PlatformCompany, status: TenantStatus) => void
}) {
  return (
    <div className="platform-actions">
      <AppButton variant="ghost" disabled>عرض الشركة</AppButton>
      <AppButton variant="ghost" onClick={() => onEdit(company)}>تعديل الباقة</AppButton>
      <AppButton variant="ghost" onClick={() => onStatus(company, 'active')}>تفعيل</AppButton>
      <AppButton variant="ghost" onClick={() => onStatus(company, 'suspended')}>تعليق</AppButton>
      <AppButton variant="ghost" onClick={() => onStatus(company, 'cancelled')}>إلغاء</AppButton>
      <AppButton variant="ghost" onClick={() => onStatus(company, 'active')}>تجديد الاشتراك</AppButton>
    </div>
  )
}

function CompaniesTable({
  companies,
  onEdit,
  onStatus,
}: {
  companies: PlatformCompany[]
  onEdit: (company: PlatformCompany) => void
  onStatus: (company: PlatformCompany, status: TenantStatus) => void
}) {
  if (!companies.length) {
    return <EmptyState title="لا توجد شركات" message="سيتم عرض الشركات المشتركة عند ربط واجهات إدارة المنصة." />
  }

  return (
    <div className="platform-table-wrapper">
      <table className="platform-table">
        <thead>
          <tr>
            <th>الشركة</th>
            <th>المعرف</th>
            <th>الحالة</th>
            <th>الباقة</th>
            <th>بداية الاشتراك</th>
            <th>نهاية الاشتراك</th>
            <th>الحدود</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.id}>
              <td>
                <div className="platform-company-cell">
                  <span>{company.logoUrl ? <img src={company.logoUrl} alt="" /> : company.name.charAt(0)}</span>
                  <strong>{company.name}</strong>
                </div>
              </td>
              <td>{company.slug}</td>
              <td><TenantStatusBadge status={company.status} /></td>
              <td><TenantPlanBadge plan={company.plan} /></td>
              <td>{formatDate(company.subscriptionStart)}</td>
              <td>{formatDate(company.subscriptionEnd)}</td>
              <td>
                <small>{company.maxUsers} مستخدم</small>
                <small>{company.maxChannels} قناة</small>
                <small>{company.monthlyConversationLimit.toLocaleString('ar-SA')} محادثة/شهر</small>
              </td>
              <td><CompanyActions company={company} onEdit={onEdit} onStatus={onStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const emptyForm: SaveCompanyPayload = {
  name: '',
  slug: '',
  logoUrl: '',
  status: 'trial',
  plan: 'starter',
  subscriptionStart: '',
  subscriptionEnd: '',
  maxUsers: 10,
  maxChannels: 2,
  monthlyConversationLimit: 1000,
  admin: {
    name: '',
    email: '',
  },
}

function CompanyFormModal({
  mode,
  initialCompany,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialCompany?: PlatformCompany
  onClose: () => void
  onSaved: () => void
}) {
  const showToast = useUiStore((state) => state.showToast)
  const [form, setForm] = useState<SaveCompanyPayload>(() => initialCompany ? { ...initialCompany } : emptyForm)
  const [isSaving, setSaving] = useState(false)

  function updateField<K extends keyof SaveCompanyPayload>(key: K, value: SaveCompanyPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      const payload = {
        ...form,
        logoUrl: form.logoUrl || undefined,
        subscriptionStart: form.subscriptionStart || undefined,
        subscriptionEnd: form.subscriptionEnd || undefined,
        admin: mode === 'create' && form.admin?.name && form.admin.email ? form.admin : undefined,
      }

      if (mode === 'create') {
        await createPlatformCompany(payload)
        showToast('تم إنشاء الشركة بنجاح', 'success')
      } else if (initialCompany) {
        await updatePlatformCompany(initialCompany.id, payload)
        showToast('تم تحديث بيانات الشركة', 'success')
      }
      onSaved()
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الشركة', 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="platform-modal-backdrop" role="dialog" aria-modal="true">
      <form className="platform-modal" onSubmit={handleSubmit}>
        <PageHeader title={mode === 'create' ? 'إنشاء شركة مشتركة' : 'تعديل الشركة'} description="بيانات الاشتراك وحدود الاستخدام الأولية." />
        <div className="platform-form-grid">
          <label>اسم الشركة<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
          <label>المعرف slug<input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
          <label>رابط الشعار<input value={form.logoUrl ?? ''} onChange={(event) => updateField('logoUrl', event.target.value)} /></label>
          <label>الحالة<select value={form.status} onChange={(event) => updateField('status', event.target.value as TenantStatus)}><option value="trial">trial</option><option value="active">active</option><option value="suspended">suspended</option><option value="cancelled">cancelled</option></select></label>
          <label>الباقة<select value={form.plan} onChange={(event) => updateField('plan', event.target.value as TenantPlan)}><option value="starter">starter</option><option value="professional">professional</option><option value="enterprise">enterprise</option></select></label>
          <label>بداية الاشتراك<input type="date" value={form.subscriptionStart ?? ''} onChange={(event) => updateField('subscriptionStart', event.target.value)} /></label>
          <label>نهاية الاشتراك<input type="date" value={form.subscriptionEnd ?? ''} onChange={(event) => updateField('subscriptionEnd', event.target.value)} /></label>
          <label>عدد المستخدمين<input type="number" min={1} value={form.maxUsers} onChange={(event) => updateField('maxUsers', Number(event.target.value))} /></label>
          <label>عدد القنوات<input type="number" min={1} value={form.maxChannels} onChange={(event) => updateField('maxChannels', Number(event.target.value))} /></label>
          <label>حد المحادثات الشهري<input type="number" min={1} value={form.monthlyConversationLimit} onChange={(event) => updateField('monthlyConversationLimit', Number(event.target.value))} /></label>
          {mode === 'create' ? (
            <>
              <label>اسم مدير الشركة<input value={form.admin?.name ?? ''} onChange={(event) => setForm((current) => ({ ...current, admin: { name: event.target.value, email: current.admin?.email ?? '' } }))} /></label>
              <label>بريد مدير الشركة<input type="email" value={form.admin?.email ?? ''} onChange={(event) => setForm((current) => ({ ...current, admin: { name: current.admin?.name ?? '', email: event.target.value } }))} /></label>
            </>
          ) : null}
        </div>
        <div className="platform-modal-actions">
          <AppButton type="button" variant="ghost" onClick={onClose}>إلغاء</AppButton>
          <AppButton type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'جار الحفظ' : 'حفظ'}</AppButton>
        </div>
      </form>
    </div>
  )
}

const emptyRequestForm: SaveOnboardingRequestPayload = {
  organizationName: '',
  website: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  requestedPlan: 'starter',
  requestedUsers: 5,
  requestedChannels: ['WHATSAPP'],
  whatsappNumber: '',
  hasMetaBusiness: false,
  hasWhatsAppBusinessApp: false,
  operationMode: 'platform_only',
  notes: '',
}

function OnboardingRequestFormModal({
  mode,
  initialRequest,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit'
  initialRequest?: OnboardingRequest
  onClose: () => void
  onSaved: () => void
}) {
  const showToast = useUiStore((state) => state.showToast)
  const [form, setForm] = useState<SaveOnboardingRequestPayload>(() => initialRequest ? {
    organizationName: initialRequest.organizationName,
    website: initialRequest.website ?? '',
    contactName: initialRequest.contactName,
    contactEmail: initialRequest.contactEmail,
    contactPhone: initialRequest.contactPhone,
    requestedPlan: initialRequest.requestedPlan,
    requestedUsers: initialRequest.requestedUsers,
    requestedChannels: initialRequest.requestedChannels,
    whatsappNumber: initialRequest.whatsappNumber ?? '',
    hasMetaBusiness: initialRequest.hasMetaBusiness,
    hasWhatsAppBusinessApp: initialRequest.hasWhatsAppBusinessApp,
    operationMode: initialRequest.operationMode,
    notes: initialRequest.notes ?? '',
  } : emptyRequestForm)
  const [isSaving, setSaving] = useState(false)

  function updateField<K extends keyof SaveOnboardingRequestPayload>(key: K, value: SaveOnboardingRequestPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleChannel(channel: string) {
    setForm((current) => {
      const hasChannel = current.requestedChannels.includes(channel)
      return {
        ...current,
        requestedChannels: hasChannel
          ? current.requestedChannels.filter((item) => item !== channel)
          : [...current.requestedChannels, channel],
      }
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      if (mode === 'create') {
        await createOnboardingRequest(form)
        showToast('تم إنشاء طلب الاشتراك', 'success')
      } else if (initialRequest) {
        await updateOnboardingRequest(initialRequest.id, form)
        showToast('تم تحديث طلب الاشتراك', 'success')
      }
      onSaved()
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ طلب الاشتراك', 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="platform-modal-backdrop" role="dialog" aria-modal="true">
      <form className="platform-modal platform-modal-wide" onSubmit={handleSubmit}>
        <PageHeader title={mode === 'create' ? 'إنشاء طلب اشتراك' : 'تعديل طلب الاشتراك'} description="بيانات مبيعات وتشغيل قبل إنشاء الشركة المستأجرة." />
        <div className="platform-form-grid">
          <label>اسم المؤسسة<input value={form.organizationName} onChange={(event) => updateField('organizationName', event.target.value)} required /></label>
          <label>الموقع الإلكتروني<input value={form.website ?? ''} onChange={(event) => updateField('website', event.target.value)} /></label>
          <label>اسم المسؤول<input value={form.contactName} onChange={(event) => updateField('contactName', event.target.value)} required /></label>
          <label>البريد الإلكتروني<input type="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} required /></label>
          <label>رقم جوال المسؤول<input value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} required /></label>
          <label>الرقم المراد ربطه<input value={form.whatsappNumber ?? ''} onChange={(event) => updateField('whatsappNumber', event.target.value)} /></label>
          <label>الباقة المطلوبة<select value={form.requestedPlan} onChange={(event) => updateField('requestedPlan', event.target.value as OnboardingPlan)}><option value="starter">Starter</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
          <label>عدد المستخدمين<input type="number" min={1} value={form.requestedUsers} onChange={(event) => updateField('requestedUsers', Number(event.target.value))} /></label>
          <label>هل يوجد Meta Business؟<select value={form.hasMetaBusiness ? 'yes' : 'no'} onChange={(event) => updateField('hasMetaBusiness', event.target.value === 'yes')}><option value="no">لا</option><option value="yes">نعم</option></select></label>
          <label>هل الرقم مستخدم في WhatsApp Business App؟<select value={form.hasWhatsAppBusinessApp ? 'yes' : 'no'} onChange={(event) => updateField('hasWhatsAppBusinessApp', event.target.value === 'yes')}><option value="no">لا</option><option value="yes">نعم</option></select></label>
          <label>نوع التشغيل<select value={form.operationMode} onChange={(event) => updateField('operationMode', event.target.value as OnboardingOperationMode)}><option value="platform_only">المنصة فقط</option><option value="app_and_platform">واتساب الجوال + المنصة</option></select></label>
          <fieldset className="platform-fieldset">
            <legend>القنوات المطلوبة</legend>
            <div className="platform-chip-options">
              {channelOptions.map((channel) => (
                <label key={channel}>
                  <input type="checkbox" checked={form.requestedChannels.includes(channel)} onChange={() => toggleChannel(channel)} />
                  <span>{getChannelLabel(channel)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="platform-form-wide">ملاحظات<textarea rows={4} value={form.notes ?? ''} onChange={(event) => updateField('notes', event.target.value)} /></label>
        </div>
        <div className="platform-modal-actions">
          <AppButton type="button" variant="ghost" onClick={onClose}>إلغاء</AppButton>
          <AppButton type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'جار الحفظ' : 'حفظ الطلب'}</AppButton>
        </div>
      </form>
    </div>
  )
}

function OnboardingRequestsTable({
  requests,
  onSelect,
  onEdit,
  onStatus,
  onCreateTenant,
}: {
  requests: OnboardingRequest[]
  onSelect: (request: OnboardingRequest) => void
  onEdit: (request: OnboardingRequest) => void
  onStatus: (request: OnboardingRequest, status: OnboardingRequestStatus) => void
  onCreateTenant: (request: OnboardingRequest) => void
}) {
  if (!requests.length) {
    return <EmptyState title="لا توجد طلبات اشتراك" message="أنشئ طلباً جديداً لجمع بيانات الشركة قبل تفعيل الاشتراك." />
  }

  return (
    <div className="platform-table-wrapper">
      <table className="platform-table">
        <thead>
          <tr>
            <th>المؤسسة</th>
            <th>المسؤول</th>
            <th>الباقة</th>
            <th>القنوات</th>
            <th>الحالة</th>
            <th>تاريخ الطلب</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className={isFinalRequestStatus(request.status) ? 'readonly-row' : ''}>
              <td>
                <div className="platform-company-cell">
                  <span>{request.organizationName.charAt(0)}</span>
                  <strong>{request.organizationName}</strong>
                </div>
              </td>
              <td>
                <strong>{request.contactName}</strong>
                <small>{request.contactEmail}</small>
              </td>
              <td><RequestPlanBadge plan={request.requestedPlan} /></td>
              <td>{request.requestedChannels.map(getChannelLabel).join('، ') || 'غير محدد'}</td>
              <td><RequestStatusBadge status={request.status} /></td>
              <td>{formatDate(request.createdAt)}</td>
              <td>
                <div className="platform-actions">
                  <AppButton variant="ghost" onClick={() => onSelect(request)}>عرض</AppButton>
                  {!isFinalRequestStatus(request.status) ? <AppButton variant="ghost" onClick={() => onEdit(request)}>تعديل</AppButton> : null}
                  <select disabled={isFinalRequestStatus(request.status)} value={request.status} onChange={(event) => onStatus(request, event.target.value as OnboardingRequestStatus)} aria-label="تغيير حالة الطلب">
                    {Object.keys(requestStatusLabels).map((status) => (
                      <option key={status} value={status}>{requestStatusLabels[status as OnboardingRequestStatus]}</option>
                    ))}
                  </select>
                  {request.status === 'new' || request.status === 'waiting_for_info' ? <AppButton variant="ghost" onClick={() => onStatus(request, 'under_review')}>بدء المراجعة</AppButton> : null}
                  {request.status === 'under_review' ? <AppButton variant="ghost" onClick={() => onStatus(request, 'ready_to_create')}>قبول مبدئي</AppButton> : null}
                  {!isFinalRequestStatus(request.status) ? <AppButton variant="ghost" onClick={() => onStatus(request, 'rejected')}>رفض</AppButton> : null}
                  {isFinalRequestStatus(request.status) ? <AppButton variant="ghost" onClick={() => onStatus(request, 'under_review')}>إعادة فتح</AppButton> : null}
                  <AppButton
                    variant="primary"
                    disabled={request.status !== 'ready_to_create'}
                    onClick={() => onCreateTenant(request)}
                  >
                    إنشاء شركة من الطلب
                  </AppButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OnboardingRequestDetails({
  request,
  onClose,
}: {
  request: OnboardingRequest
  onClose: () => void
}) {
  return (
    <div className="platform-modal-backdrop" role="dialog" aria-modal="true">
      <section className="platform-modal platform-modal-wide">
        <PageHeader title={request.organizationName} description="تفاصيل طلب الاشتراك قبل إنشاء الشركة." />
        <div className="platform-detail-grid">
          <article><span>الحالة</span><strong><RequestStatusBadge status={request.status} /></strong></article>
          <article><span>الباقة</span><strong><RequestPlanBadge plan={request.requestedPlan} /></strong></article>
          <article><span>المسؤول</span><strong>{request.contactName}</strong><small>{request.contactEmail}</small></article>
          <article><span>الجوال</span><strong>{request.contactPhone}</strong></article>
          <article><span>الموقع</span><strong>{request.website || 'غير محدد'}</strong></article>
          <article><span>المستخدمون</span><strong>{request.requestedUsers.toLocaleString('ar-SA')}</strong></article>
          <article><span>القنوات</span><strong>{request.requestedChannels.map(getChannelLabel).join('، ') || 'غير محدد'}</strong></article>
          <article><span>رقم واتساب</span><strong>{request.whatsappNumber || 'غير محدد'}</strong></article>
          <article><span>Meta Business</span><strong>{request.hasMetaBusiness ? 'نعم' : 'لا'}</strong></article>
          <article><span>WhatsApp Business App</span><strong>{request.hasWhatsAppBusinessApp ? 'نعم' : 'لا'}</strong></article>
          <article><span>نوع التشغيل</span><strong>{operationModeLabels[request.operationMode]}</strong></article>
          <article><span>الشركة المنشأة</span><strong>{request.activatedTenant?.name ?? 'لم تنشأ بعد'}</strong></article>
        </div>
        <div className="platform-notes-panel">
          <span>ملاحظات</span>
          <p>{request.notes || 'لا توجد ملاحظات.'}</p>
        </div>
        <div className="platform-modal-actions">
          <AppButton type="button" variant="primary" onClick={onClose}>إغلاق</AppButton>
        </div>
      </section>
    </div>
  )
}

export function PlatformDashboardPage() {
  const { companies } = usePlatformCompanies()
  const stats = useMemo(() => ({
    companies: companies.length,
    active: companies.filter((company) => company.status === 'active').length,
    trial: companies.filter((company) => company.status === 'trial').length,
    conversationLimit: companies.reduce((total, company) => total + company.monthlyConversationLimit, 0),
  }), [companies])

  return (
    <div className="page-layout platform-page-layout">
      <AppCard>
        <PageHeader title="لوحة تحكم المنصة" description="نظرة عامة للمالك على الشركات المشتركة وحدود الاشتراك." />
        <div className="platform-metrics">
          <article><span>{stats.companies}</span><small>شركة مشتركة</small></article>
          <article><span>{stats.active}</span><small>اشتراك نشط</small></article>
          <article><span>{stats.trial}</span><small>فترة تجريبية</small></article>
          <article><span>{stats.conversationLimit.toLocaleString('ar-SA')}</span><small>حد المحادثات الشهري</small></article>
        </div>
      </AppCard>
      <AppCard>
        <PageHeader title="أحدث الشركات" description="بيانات تأسيسية من سجل المستأجرين الحالي أو واجهة REST عند توفرها." />
        <CompaniesTable companies={companies} onEdit={() => undefined} onStatus={() => undefined} />
      </AppCard>
    </div>
  )
}

export function PlatformCompaniesPage() {
  const { companies, refresh } = usePlatformCompanies()
  const showToast = useUiStore((state) => state.showToast)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; company?: PlatformCompany } | null>(null)

  async function handleStatus(company: PlatformCompany, status: TenantStatus) {
    try {
      await updatePlatformCompanyStatus(company.id, status)
      showToast('تم تحديث حالة الاشتراك', 'success')
      refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث الحالة', 'warning')
    }
  }

  return (
    <div className="page-layout platform-page-layout">
      <AppCard>
        <PageHeader
          title="الشركات المشتركة"
          description="إدارة الشركات المستأجرة وحالة الاشتراك وحدود الاستخدام."
          actions={<AppButton variant="primary" onClick={() => setModal({ mode: 'create' })}>إنشاء شركة</AppButton>}
        />
        <CompaniesTable companies={companies} onEdit={(company) => setModal({ mode: 'edit', company })} onStatus={handleStatus} />
      </AppCard>
      {modal ? (
        <CompanyFormModal
          mode={modal.mode}
          initialCompany={modal.company}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  )
}

export function PlatformOnboardingRequestsPage() {
  const { requests, isLoading, refresh } = useOnboardingRequests()
  const showToast = useUiStore((state) => state.showToast)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; request?: OnboardingRequest } | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null)

  async function handleStatus(request: OnboardingRequest, status: OnboardingRequestStatus) {
    try {
      await updateOnboardingRequestStatus(request.id, status)
      showToast('تم تحديث حالة طلب الاشتراك', 'success')
      refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث حالة الطلب', 'warning')
    }
  }

  async function handleCreateTenant(request: OnboardingRequest) {
    try {
      await createTenantFromOnboardingRequest(request.id)
      showToast('تم إنشاء الشركة ومديرها من طلب الاشتراك', 'success')
      refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إنشاء الشركة من الطلب', 'warning')
    }
  }

  return (
    <div className="page-layout platform-page-layout">
      <AppCard>
        <PageHeader
          title="طلبات الاشتراك"
          description="إدارة طلبات تأهيل الشركات قبل إنشاء المستأجر وتفعيل الاشتراك."
          actions={<AppButton variant="primary" onClick={() => setModal({ mode: 'create' })}>إنشاء طلب اشتراك</AppButton>}
        />
        {isLoading ? (
          <EmptyState title="جار تحميل الطلبات" message="يتم الآن جلب طلبات الاشتراك من واجهة المنصة." />
        ) : (
          <OnboardingRequestsTable
            requests={requests}
            onSelect={setSelectedRequest}
            onEdit={(request) => setModal({ mode: 'edit', request })}
            onStatus={handleStatus}
            onCreateTenant={handleCreateTenant}
          />
        )}
      </AppCard>
      {modal ? (
        <OnboardingRequestFormModal
          mode={modal.mode}
          initialRequest={modal.request}
          onClose={() => setModal(null)}
          onSaved={refresh}
        />
      ) : null}
      {selectedRequest ? <OnboardingRequestDetails request={selectedRequest} onClose={() => setSelectedRequest(null)} /> : null}
    </div>
  )
}

export function PlatformSubscriptionsPage() {
  const { companies } = usePlatformCompanies()
  const plans = ['starter', 'professional', 'enterprise'] as const
  return (
    <div className="page-layout platform-page-layout">
      <AppCard>
        <PageHeader title="الاشتراكات والباقات" description="باقات SaaS الأولية وحدودها التشغيلية." />
        <div className="platform-plan-grid">
          {plans.map((plan) => {
            const planCompanies = companies.filter((company) => company.plan === plan)
            const sample = planCompanies[0]
            return (
              <article key={plan} className="platform-plan-card">
                <TenantPlanBadge plan={plan} />
                <strong>{planCompanies.length.toLocaleString('ar-SA')} شركة</strong>
                <p>حدود مرجعية: {sample?.maxUsers ?? 10} مستخدم، {sample?.maxChannels ?? 2} قناة، {(sample?.monthlyConversationLimit ?? 1000).toLocaleString('ar-SA')} محادثة شهرياً.</p>
                <AppButton variant="ghost" disabled>تعديل الباقة</AppButton>
              </article>
            )
          })}
        </div>
      </AppCard>
    </div>
  )
}

export function PlatformUsagePage() {
  const { companies } = usePlatformCompanies()
  return (
    <div className="page-layout platform-page-layout">
      <AppCard>
        <PageHeader title="استخدام المنصة" description="مؤشرات تأسيسية لحدود الاستخدام قبل ربط القياسات الفعلية." />
        <div className="platform-usage-list">
          {companies.map((company) => (
            <article key={company.id}>
              <div>
                <strong>{company.name}</strong>
                <small>{company.slug}</small>
              </div>
              <TenantPlanBadge plan={company.plan} />
              <span>{company.maxUsers} مستخدم</span>
              <span>{company.maxChannels} قناة</span>
              <span>{company.monthlyConversationLimit.toLocaleString('ar-SA')} محادثة/شهر</span>
            </article>
          ))}
        </div>
      </AppCard>
    </div>
  )
}
