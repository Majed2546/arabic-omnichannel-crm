import { useQuery } from '@apollo/client/react'
import { PEOPLE_QUERY } from '../../graphql/queries/people'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingState } from '../../components/ui/LoadingState'
import { Card } from '../../components/ui/Card'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { PageHeader } from '../../components/layout/PageHeader'
import { useTenantQueryOptions } from '../../tenants/useTenantQueryOptions'
import { getMockPeopleFallback, normalizePeoplePayload } from '../../graphql/normalizePeople'
import type { Person } from '../../graphql/types'

type PeopleData = {
  people: unknown
}

export default function UsersPage() {
  const tenantQueryOptions = useTenantQueryOptions()
  const { data, loading, error } = useQuery<PeopleData>(PEOPLE_QUERY, tenantQueryOptions)
  const realPeople = normalizePeoplePayload(data)
  const people = realPeople.length > 0
    ? realPeople
    : error
      ? getMockPeopleFallback()
      : []

  if (loading) {
    return <LoadingState message="جاري تحميل المستخدمين..." />
  }

  if (error && !people.length) {
    return (
      <ErrorState
        title="تعذر تحميل المستخدمين"
        message="لا يمكن الاتصال بخادم الأشخاص من Twenty. يُعرض الآن محتوى تجريبي.
"
      />
    )
  }

  if (!people.length) {
    return (
      <EmptyState
        title="لا توجد مستخدمين"
        message="أضف أعضاء فريق الدعم والعمليات لتفعيل إدارة المستخدمين."
      />
    )
  }

  const columns: Array<DataTableColumn<Person>> = [
    {
      key: 'name',
      header: 'المستخدم',
      render: (person) => person.name,
    },
    {
      key: 'email',
      header: 'البريد الإلكتروني',
      render: (person) => person.email ?? '-',
    },
    {
      key: 'createdAt',
      header: 'تاريخ الإنشاء',
      render: (person) => person.createdAt ? new Date(person.createdAt).toLocaleDateString('ar-SA') : '-',
    },
  ]

  return (
    <div className="page-layout">
      <Card>
        <PageHeader
          title="الأشخاص من Twenty"
          description="عرض مؤقت لسجلات الأشخاص القادمة من Twenty داخل صفحة المستخدمين."
        />
        <DataTable columns={columns} rows={people} getRowKey={(person) => person.id} />
      </Card>
    </div>
  )
}
