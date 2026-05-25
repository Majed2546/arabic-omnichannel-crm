import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppCard } from '../../components/ui/AppCard'
import { AppButton } from '../../components/ui/AppButton'
import { EmptyState } from '../../components/ui/EmptyState'
import { TenantPlanBadge, TenantStatusBadge } from './PlatformBadges'
import { fetchPlatformCompanies, type PlatformCompany } from './platformData'

function formatDate(value: string | undefined) {
  return value ? new Date(value).toLocaleDateString('ar-SA') : 'غير محدد'
}

function usePlatformCompanies() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([])

  useEffect(() => {
    let disposed = false
    fetchPlatformCompanies().then((items) => {
      if (!disposed) setCompanies(items)
    })
    return () => {
      disposed = true
    }
  }, [])

  return companies
}

function CompanyActions() {
  return (
    <div className="platform-actions">
      <AppButton variant="ghost" disabled>عرض الشركة</AppButton>
      <AppButton variant="ghost" disabled>تعديل الباقة</AppButton>
      <AppButton variant="ghost" disabled>تعليق الاشتراك</AppButton>
      <AppButton variant="ghost" disabled>تجديد الاشتراك</AppButton>
    </div>
  )
}

function CompaniesTable({ companies }: { companies: PlatformCompany[] }) {
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
              <td><CompanyActions /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PlatformDashboardPage() {
  const companies = usePlatformCompanies()
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
        <CompaniesTable companies={companies} />
      </AppCard>
    </div>
  )
}

export function PlatformCompaniesPage() {
  const companies = usePlatformCompanies()
  return (
    <div className="page-layout platform-page-layout">
      <AppCard>
        <PageHeader title="الشركات المشتركة" description="إدارة الشركات المستأجرة وحالة الاشتراك وحدود الاستخدام." />
        <CompaniesTable companies={companies} />
      </AppCard>
    </div>
  )
}

export function PlatformSubscriptionsPage() {
  const companies = usePlatformCompanies()
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
  const companies = usePlatformCompanies()
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
