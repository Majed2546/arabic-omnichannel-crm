import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppCard } from '../../components/ui/AppCard'
import { AppButton } from '../../components/ui/AppButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useUiStore } from '../../stores/uiStore'
import type { TenantPlan, TenantStatus } from '../../tenants/tenantTypes'
import { TenantPlanBadge, TenantStatusBadge } from './PlatformBadges'
import {
  createPlatformCompany,
  fetchPlatformCompanies,
  updatePlatformCompany,
  updatePlatformCompanyStatus,
  type PlatformCompany,
  type SaveCompanyPayload,
} from './platformData'

function formatDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString('ar-SA') : 'غير محدد'
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
  companyAdmin: {
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
        companyAdmin: mode === 'create' && form.companyAdmin?.name && form.companyAdmin.email ? form.companyAdmin : undefined,
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
              <label>اسم مدير الشركة<input value={form.companyAdmin?.name ?? ''} onChange={(event) => setForm((current) => ({ ...current, companyAdmin: { name: event.target.value, email: current.companyAdmin?.email ?? '' } }))} /></label>
              <label>بريد مدير الشركة<input type="email" value={form.companyAdmin?.email ?? ''} onChange={(event) => setForm((current) => ({ ...current, companyAdmin: { name: current.companyAdmin?.name ?? '', email: event.target.value } }))} /></label>
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
