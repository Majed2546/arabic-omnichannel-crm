import { useQuery } from '@apollo/client/react'
import { COMPANIES_QUERY } from '../../graphql/queries/companies'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { Card } from '../../components/ui/Card'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { PageHeader } from '../../components/layout/PageHeader'
import { useTenantQueryOptions } from '../../tenants/useTenantQueryOptions'
import { getMockCompaniesFallback, normalizeCompaniesPayload } from '../../graphql/normalizeCompanies'
import type { Company } from '../../graphql/types'

type CompaniesData = {
  companies: unknown
}

export default function TenantsPage() {
  const tenantQueryOptions = useTenantQueryOptions()
  const { data, loading, error } = useQuery<CompaniesData>(COMPANIES_QUERY, tenantQueryOptions)
  const realCompanies = normalizeCompaniesPayload(data)
  const companies = Array.isArray(realCompanies) && realCompanies.length > 0
    ? realCompanies
    : error
      ? getMockCompaniesFallback()
      : []

  if (loading) {
    return <LoadingState message="جاري تحميل بيانات الشركات..." />
  }

  if (error && !companies.length) {
    return (
      <ErrorState
        title="تعذر تحميل الشركات"
        message="لا يمكن الاتصال بخادم الشركات. يُعرض الآن محتوى تجريبي.
"
      />
    )
  }

  if (!companies.length) {
    return (
      <EmptyState
        title="لا توجد شركات بعد"
        message="ابدأ بإضافة حسابات جديدة لمؤسساتك في هذه الصفحة."
      />
    )
  }

  const columns: Array<DataTableColumn<Company>> = [
    { key: 'name', header: 'الشركة', render: (company) => company.name },
    { key: 'domain', header: 'النطاق', render: (company) => company.domain ?? '-' },
    { key: 'employees', header: 'عدد الموظفين', render: (company) => company.employees ?? '-' },
    {
      key: 'createdAt',
      header: 'تاريخ الإنشاء',
      render: (company) => company.createdAt ? new Date(company.createdAt).toLocaleDateString('ar-SA') : '-',
    },
  ]

  return (
    <div className="page-layout">
      <Card>
        <PageHeader
          title="الشركات من Twenty"
          description="عرض مؤقت للشركات القادمة من Twenty مع إبقاء نموذج المستأجرين منفصلاً داخلياً."
        />
        <DataTable columns={columns} rows={companies} getRowKey={(company) => company.id} />
      </Card>
    </div>
  )
}
