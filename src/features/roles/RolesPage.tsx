import { useMemo, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUiStore } from '../../stores/uiStore'
import { crmRoles, permissionDefinitions, type CrmRole, type PermissionKey } from './rolesMock'

function permissionTone(enabled: boolean) {
  return enabled ? 'success' : 'muted'
}

const matrixPermissionKeys: PermissionKey[] = [
  'dashboard.view',
  'inbox.view',
  'inbox.reply',
  'inbox.assign',
  'channels.view',
  'automation.view',
  'reports.view',
  'roles.manage',
]

const matrixPermissions = permissionDefinitions.filter((permission) =>
  matrixPermissionKeys.includes(permission.key),
)

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<CrmRole | null>(null)
  const [isLoading] = useState(false)
  const showToast = useUiStore((state) => state.showToast)

  const roles: CrmRole[] = crmRoles
  const enabledCount = useMemo(
    () => selectedRole ? Object.values(selectedRole.permissions).filter(Boolean).length : 0,
    [selectedRole],
  )

  if (isLoading) {
    return <LoadingSkeleton rows={5} />
  }

  if (!roles.length) {
    return (
      <EmptyState
        title="لا توجد أدوار بعد"
        message="سيتم ربط هذه الصفحة لاحقاً بخدمة RBAC من NestJS."
      />
    )
  }

  return (
    <div className="page-layout roles-page-layout">
      <AppCard>
        <PageHeader
          title="الأدوار والصلاحيات"
          description="هيكل RBAC المؤسسي وربط أدوار Keycloak بصلاحيات CRM."
          actions={(
            <AppButton onClick={() => showToast('تم تجهيز هيكل RBAC للربط الخلفي', 'success')}>
              اختبار التنبيه
            </AppButton>
          )}
        />

        <div className="permissions-matrix-wrapper">
          <div className="permissions-matrix" role="grid" aria-label="مصفوفة صلاحيات الأدوار">
            <div className="permissions-matrix-row permissions-matrix-header" role="row">
              <div className="matrix-cell matrix-role-name" role="columnheader">الدور</div>
              <div className="matrix-cell matrix-users-count" role="columnheader">المستخدمون</div>
              <div className="matrix-cell matrix-description" role="columnheader">أدوار Keycloak</div>
              {matrixPermissions.map((permission) => (
                <div key={permission.key} className="matrix-cell matrix-permission" role="columnheader">
                  {permission.label}
                </div>
              ))}
            </div>

            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                className={`permissions-matrix-row permissions-matrix-data-row ${
                  selectedRole?.id === role.id ? 'selected-matrix-row' : ''
                }`}
                role="row"
                onClick={() => setSelectedRole(role)}
              >
                <div className="matrix-cell matrix-role-name" role="gridcell">
                  <strong className="text-safe">{role.name}</strong>
                </div>
                <div className="matrix-cell matrix-users-count" role="gridcell">{role.usersCount}</div>
                <div className="matrix-cell matrix-description" role="gridcell">
                  <span className="text-safe">{role.keycloakRoles.join(' · ')}</span>
                </div>
                {matrixPermissions.map((permission) => (
                  <div key={permission.key} className="matrix-cell matrix-permission" role="gridcell">
                    <StatusBadge
                      label={role.permissions[permission.key] ? 'مسموح' : 'محجوب'}
                      tone={permissionTone(role.permissions[permission.key])}
                    />
                  </div>
                ))}
              </button>
            ))}
          </div>
        </div>
      </AppCard>

      <aside className="detail-drawer">
        {selectedRole ? (
          <>
            <div className="panel-header">
              <p className="panel-label">تفاصيل الدور</p>
              <h2>{selectedRole.name}</h2>
              <p>{selectedRole.description}</p>
            </div>
            <div className="drawer-metrics">
              <article>
                <span>{selectedRole.usersCount}</span>
                <small>مستخدم مرتبط</small>
              </article>
              <article>
                <span>{enabledCount}</span>
                <small>صلاحية مفعلة</small>
              </article>
            </div>
            <div className="drawer-permissions">
              {permissionDefinitions.map((permission) => (
                <div key={permission.key}>
                  <span>{permission.group} · {permission.label}</span>
                  <StatusBadge
                    label={selectedRole.permissions[permission.key] ? 'مفعل' : 'غير مفعل'}
                    tone={permissionTone(selectedRole.permissions[permission.key])}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="اختر دوراً" message="حدد دوراً من الجدول لعرض تفاصيله." />
        )}
      </aside>
    </div>
  )
}
