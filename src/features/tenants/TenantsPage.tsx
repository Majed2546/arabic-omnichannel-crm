import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable'
import { PageHeader } from '../../components/layout/PageHeader'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { unwrapItems } from '../../lib/restUtils'

type TenantRecord = {
  id: string
  name?: string
  slug?: string
  plan?: string
  status?: string
  createdAt?: string
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRecord[]>([])

  useEffect(() => {
    let disposed = false

    apiFetch(apiUrl('/tenants'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!disposed) setTenants(unwrapItems<TenantRecord>(payload))
      })
      .catch(() => {
        if (!disposed) setTenants([])
      })

    return () => {
      disposed = true
    }
  }, [])

  if (!tenants.length) {
    return (
      <EmptyState
        title="لا توجد مستأجرين"
        message="لا توجد سجلات مستأجرين راجعة من واجهة REST حالياً."
      />
    )
  }

  const columns: Array<DataTableColumn<TenantRecord>> = [
    { key: 'name', header: 'المستأجر', render: (tenant) => tenant.name ?? tenant.id },
    { key: 'slug', header: 'المعرف', render: (tenant) => tenant.slug ?? '-' },
    { key: 'plan', header: 'الخطة', render: (tenant) => tenant.plan ?? '-' },
    { key: 'status', header: 'الحالة', render: (tenant) => tenant.status ?? '-' },
    {
      key: 'createdAt',
      header: 'تاريخ الإنشاء',
      render: (tenant) => tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('ar-SA') : '-',
    },
  ]

  return (
    <div className="page-layout">
      <Card>
        <PageHeader
          title="المستأجرون"
          description="سجلات المستأجرين الراجعة من واجهة REST."
        />
        <DataTable columns={columns} rows={tenants} getRowKey={(tenant) => tenant.id} />
      </Card>
    </div>
  )
}
