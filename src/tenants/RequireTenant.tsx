import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/ui/EmptyState'
import { AppButton } from '../components/ui/AppButton'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useTenant } from './useTenant'
import type { Tenant } from './tenantTypes'

type RequireTenantProps = {
  children: ReactElement
}

const tenantStatusLabels: Record<Tenant['status'], string> = {
  active: 'نشط',
  suspended: 'غير نشط',
}

function formatLastActivity(value: string | undefined) {
  if (!value) return 'غير متاح'

  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function InactiveTenantNotice({ tenant, canBrowseHistory }: { tenant: Tenant; canBrowseHistory: boolean }) {
  return (
    <section className="inactive-tenant-card card-safe" aria-live="polite">
      <div className="inactive-tenant-illustration" aria-hidden="true">
        <span>!</span>
      </div>

      <div className="inactive-tenant-copy">
        <div className="inactive-tenant-heading">
          <StatusBadge label={tenantStatusLabels[tenant.status]} tone="warning" />
          <h2 className="text-safe">الحساب غير نشط حالياً</h2>
        </div>
        <p className="text-safe">
          {canBrowseHistory
            ? 'يمكنك متابعة تصفح البيانات التاريخية، بينما تبقى الإجراءات التشغيلية الجديدة معلقة حتى إعادة التنشيط.'
            : 'يمكنك التنقل داخل مساحة العمل، لكن عرض البيانات التشغيلية لهذا الحساب مقيد حتى إعادة التنشيط.'}
        </p>

        <dl className="inactive-tenant-meta">
          <div>
            <dt>السبب</dt>
            <dd>{tenant.inactiveReason ?? 'لم يتم تسجيل سبب التعليق.'}</dd>
          </div>
          <div>
            <dt>آخر نشاط</dt>
            <dd>{formatLastActivity(tenant.lastActivityAt)}</dd>
          </div>
        </dl>
      </div>

      <AppButton className="inactive-tenant-action" variant="ghost" disabled>
        طلب إعادة التنشيط
      </AppButton>
    </section>
  )
}

export function RequireTenant({ children }: RequireTenantProps) {
  const location = useLocation()
  const { currentTenant, currentTenantId, canAccessTenant } = useTenant()
  const { user } = useAuth()

  if (!currentTenant || !currentTenantId) {
    return (
      <EmptyState
        title="لا يوجد مستأجر محدد"
        message="اختر مستأجراً قبل متابعة العمل داخل النظام."
      />
    )
  }

  if (!canAccessTenant(currentTenantId)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />
  }

  if (currentTenant.status !== 'active') {
    const canBrowseHistory = user?.role === 'admin' || user?.role === 'support'

    return (
      <div className="page-layout">
        <InactiveTenantNotice tenant={currentTenant} canBrowseHistory={canBrowseHistory} />
        {canBrowseHistory ? children : null}
      </div>
    )
  }

  return children
}
