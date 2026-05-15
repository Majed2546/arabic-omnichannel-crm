import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { DASHBOARD_OVERVIEW_QUERY } from '../../graphql/queries/dashboard'
import type { Company } from '../../graphql/types'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useTenant } from '../../tenants/useTenant'
import { useTenantQueryOptions } from '../../tenants/useTenantQueryOptions'
import { getMockCompaniesFallback, normalizeCompaniesPayload } from '../../graphql/normalizeCompanies'

type DashboardData = {
  companies: unknown
}

const EMPTY_COMPANIES: Company[] = []

export default function DashboardPage() {
  const { currentTenant } = useTenant()
  const tenantQueryOptions = useTenantQueryOptions()
  const { data, loading, error } = useQuery<DashboardData>(DASHBOARD_OVERVIEW_QUERY, tenantQueryOptions)
  const realCompanies = normalizeCompaniesPayload(data)
  const companies = Array.isArray(realCompanies) && realCompanies.length > 0
    ? realCompanies
    : error
      ? getMockCompaniesFallback()
      : EMPTY_COMPANIES

  const metrics = useMemo(() => {
    const safeCompanies = Array.isArray(companies) ? companies : EMPTY_COMPANIES
    const totalCompanies = safeCompanies.length
    const namedCompanies = safeCompanies.filter((company) => company.name.trim()).length

    return {
      totalCompanies,
      namedCompanies,
      activeWorkflows: totalCompanies,
      awaitingResponse: 0,
      inboxSummary: [
        { label: 'الشركات من Twenty', value: totalCompanies },
        { label: 'سجلات بأسماء', value: namedCompanies },
        { label: 'اتصال GraphQL', value: realCompanies.length > 0 ? 1 : 0 },
      ],
      topChannels: [
        { name: 'واتساب', percent: 42 },
        { name: 'تويتر', percent: 25 },
        { name: 'إنستغرام', percent: 18 },
      ],
      recentActivity:
        safeCompanies.length > 0
          ? safeCompanies.slice(0, 3).map((company) => ({
              id: company.id,
              text: `${error ? 'بيانات تجريبية للشركة' : 'تم تحميل شركة من Twenty'}: ${company.name}`,
              time: 'الآن',
            }))
          : [
              { id: '1', text: 'لم تصل بيانات شركات من Twenty بعد', time: 'الآن' },
            ],
    }
  }, [companies, error, realCompanies.length])

  if (loading) {
    return <LoadingState message="جاري تحميل لوحة القيادة..." />
  }

  if (!data && !error) {
    return (
      <EmptyState
        title="لا توجد بيانات متاحة"
        message="لم يتم العثور على معلومات عرض في لوحة القيادة حالياً."
      />
    )
  }

  return (
    <div className="page-layout">
      <div className="dashboard-grid">
        <Card>
          <PageHeader
            title="مؤشرات الأداء الرئيسية"
            description={`نظرة خاصة بحساب ${currentTenant?.name ?? 'المستأجر الحالي'} على أداء الدعم والقنوات.`}
          />
          <div className="stats-grid">
            <StatCard value={metrics.totalCompanies} label="الشركات من Twenty" />
            <StatCard value={metrics.namedCompanies} label="شركات بأسماء" />
            <StatCard value={metrics.awaitingResponse} label="في انتظار الرد" />
            <StatCard value={metrics.activeWorkflows} label="سير عمل نشط" />
          </div>
        </Card>

        <Card>
          <PageHeader title="ملخص صندوق الوارد" />
          <ul className="summary-list">
            {metrics.inboxSummary.map((item) => (
              <li key={item.label}>
                <span>{item.value}</span>
                <small>{item.label}</small>
              </li>
            ))}
          </ul>
          <div className="chart-card">
            <h3>أداء القنوات</h3>
            <ul className="channel-list">
              {metrics.topChannels.map((channel) => (
                <li key={channel.name}>
                  <p>{channel.name}</p>
                  <div className="progress-bar">
                    <span style={{ width: `${channel.percent}%` }} />
                  </div>
                  <strong>{channel.percent}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <PageHeader title="النشاط الأخير" />
        <div className="activity-feed">
          {metrics.recentActivity.map((activity) => (
            <article key={activity.id} className="activity-item">
              <p>{activity.text}</p>
              <small>{activity.time}</small>
            </article>
          ))}
        </div>
      </Card>
    </div>
  )
}
