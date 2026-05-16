import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { PageHeader } from '../../components/layout/PageHeader'
import type { Person } from '../../data/types'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { unwrapItems } from '../../lib/restUtils'

export default function UsersPage() {
  const [people, setPeople] = useState<Person[]>([])

  useEffect(() => {
    let disposed = false

    apiFetch(apiUrl('/users'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!disposed) setPeople(unwrapItems<Person>(payload))
      })
      .catch(() => {
        if (!disposed) setPeople([])
      })

    return () => {
      disposed = true
    }
  }, [])

  if (!people.length) {
    return (
      <EmptyState
        title="لا توجد مستخدمين"
        message="لا توجد سجلات مستخدمين راجعة من واجهة REST حالياً."
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
          title="الأشخاص"
          description="سجلات المستخدمين الراجعة من واجهة REST."
        />
        <DataTable columns={columns} rows={people} getRowKey={(person) => person.id} />
      </Card>
    </div>
  )
}
