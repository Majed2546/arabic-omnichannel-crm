import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { CRM_PERMISSIONS, type CrmPermission } from '../../auth/permissions'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { useUiStore } from '../../stores/uiStore'
import { useTenant } from '../../tenants/useTenant'
import { crmRoles, permissionDefinitions } from './rolesMock'

type RoleScope = 'PLATFORM' | 'TENANT'
type RoleStatus = 'ACTIVE' | 'INACTIVE'

type RoleRecord = {
  id: string
  tenantId?: string | null
  name: string
  description?: string
  scope: RoleScope
  usersCount: number
  permissionsCount: number
  status: RoleStatus
  permissions: CrmPermission[]
  systemLocked?: boolean
}

type RoleForm = {
  id?: string
  name: string
  description: string
}

const moduleGroups: Array<{ id: string; label: string; permissions: CrmPermission[] }> = [
  { id: 'dashboard', label: 'الملخص التنفيذي', permissions: ['dashboard.view'] },
  { id: 'inbox', label: 'صندوق الوارد', permissions: ['inbox.view', 'inbox.reply', 'inbox.assign'] },
  { id: 'customers', label: 'العملاء', permissions: ['customers.view', 'customers.manage'] },
  { id: 'tickets', label: 'التذاكر', permissions: ['tickets.view', 'tickets.manage'] },
  { id: 'appointments', label: 'المواعيد', permissions: ['appointments.view', 'appointments.manage'] },
  { id: 'meetings', label: 'الاجتماعات المرئية', permissions: ['meetings.view', 'meetings.manage'] },
  { id: 'channels', label: 'القنوات', permissions: ['channels.view', 'channels.manage'] },
  { id: 'templates', label: 'القوالب والردود', permissions: ['templates.view', 'templates.manage'] },
  { id: 'automation', label: 'الأتمتة', permissions: ['automation.view', 'automation.manage'] },
  { id: 'reports', label: 'التقارير', permissions: ['reports.view', 'reports.export'] },
  { id: 'billing', label: 'الاشتراكات', permissions: ['billing.view', 'billing.manage'] },
  { id: 'settings', label: 'الإعدادات', permissions: ['settings.view', 'settings.manage'] },
  { id: 'users', label: 'المستخدمون', permissions: ['users.view', 'users.manage', 'agents.view', 'agents.manage'] },
  { id: 'roles', label: 'الأدوار والصلاحيات', permissions: ['roles.view', 'roles.manage'] },
]

const permissionLabelMap = new Map(permissionDefinitions.map((permission) => [permission.key, permission.label]))

const roleNameLabels: Record<string, string> = {
  SUPER_ADMIN: 'مدير المنصة',
  COMPANY_ADMIN: 'مدير الشركة',
  SUPERVISOR: 'مشرف',
  AGENT: 'موظف خدمة',
  VIEWER: 'مشاهد',
}

function fallbackRoles(): RoleRecord[] {
  return crmRoles.map((role) => {
    const permissions = Object.entries(role.permissions)
      .filter(([, enabled]) => enabled)
      .map(([permission]) => permission as CrmPermission)

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      scope: 'TENANT',
      usersCount: role.usersCount,
      permissionsCount: permissions.length,
      status: 'ACTIVE',
      permissions,
      systemLocked: true,
    }
  })
}

function normalizeRole(payload: Partial<RoleRecord>): RoleRecord {
  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.filter((permission): permission is CrmPermission => CRM_PERMISSIONS.includes(permission as CrmPermission))
    : []

  return {
    id: String(payload.id ?? payload.name ?? 'role'),
    tenantId: payload.tenantId ?? null,
    name: String(payload.name ?? 'ROLE'),
    description: payload.description ?? '',
    scope: payload.scope === 'PLATFORM' ? 'PLATFORM' : 'TENANT',
    usersCount: Number(payload.usersCount ?? 0),
    permissionsCount: Number(payload.permissionsCount ?? permissions.length),
    status: payload.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    permissions,
    systemLocked: Boolean(payload.systemLocked),
  }
}

function roleLabel(role: RoleRecord) {
  return roleNameLabels[role.name] ?? role.name
}

function scopeLabel(scope: RoleScope) {
  return scope === 'PLATFORM' ? 'منصة' : 'شركة'
}

export default function RolesPage() {
  const { can } = useAuth()
  const { currentTenant } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('roles.manage')
  const [roles, setRoles] = useState<RoleRecord[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [draftPermissions, setDraftPermissions] = useState<Set<CrmPermission>>(new Set())
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [form, setForm] = useState<RoleForm | null>(null)

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) ?? roles[0] ?? null,
    [roles, selectedRoleId],
  )

  const enabledCount = draftPermissions.size
  const isEditableRole = Boolean(canManage && selectedRole && !selectedRole.systemLocked)

  function loadRoles() {
    setLoading(true)
    apiFetch(apiUrl('/roles'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => {
        const nextRoles = Array.isArray(payload) ? payload.map(normalizeRole) : []
        setRoles(nextRoles)
        setSelectedRoleId((current) => current && nextRoles.some((role) => role.id === current) ? current : nextRoles[0]?.id ?? '')
      })
      .catch(() => {
        const nextRoles = fallbackRoles()
        setRoles(nextRoles)
        setSelectedRoleId(nextRoles[0]?.id ?? '')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRoles()
  }, [currentTenant?.id])

  useEffect(() => {
    setDraftPermissions(new Set(selectedRole?.permissions ?? []))
  }, [selectedRole?.id])

  function togglePermission(permission: CrmPermission) {
    if (!isEditableRole) return
    setDraftPermissions((current) => {
      const next = new Set(current)
      if (next.has(permission)) next.delete(permission)
      else next.add(permission)
      return next
    })
  }

  async function savePermissions() {
    if (!selectedRole || !isEditableRole) return
    setSaving(true)
    try {
      const response = await apiFetch(apiUrl(`/roles/${encodeURIComponent(selectedRole.id)}/permissions`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: Array.from(draftPermissions) }),
      })
      if (!response.ok) throw new Error('تعذر حفظ الصلاحيات')
      const updatedRole = normalizeRole(await response.json())
      setRoles((current) => current.map((role) => role.id === updatedRole.id ? updatedRole : role))
      showToast('تم حفظ الصلاحيات', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الصلاحيات', 'warning')
    } finally {
      setSaving(false)
    }
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || !canManage) return

    try {
      const response = await apiFetch(apiUrl(form.id ? `/roles/${encodeURIComponent(form.id)}` : '/roles'), {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description }),
      })
      if (!response.ok) throw new Error('تعذر حفظ الدور')
      const savedRole = normalizeRole(await response.json())
      setRoles((current) => {
        const exists = current.some((role) => role.id === savedRole.id)
        return exists ? current.map((role) => role.id === savedRole.id ? savedRole : role) : [...current, savedRole]
      })
      setSelectedRoleId(savedRole.id)
      setForm(null)
      showToast('تم حفظ الدور', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الدور', 'warning')
    }
  }

  if (isLoading) return <LoadingSkeleton rows={5} />

  return (
    <div className="page-layout roles-page">
      <PageHeader
        title="الأدوار والصلاحيات"
        description={`إدارة صلاحيات ${currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'} دون تفعيل Keycloak الإنتاجي.`}
        actions={canManage ? <AppButton variant="primary" onClick={() => setForm({ name: '', description: '' })}>إنشاء دور</AppButton> : <StatusBadge label="عرض فقط" tone="muted" />}
      />

      <div className="roles-warning">
        بعض الصلاحيات النظامية لا يمكن تعديلها في هذا الإصدار.
      </div>

      <section className="roles-layout">
        <AppCard className="roles-list-panel">
          <div className="panel-header">
            <p className="panel-label">قائمة الأدوار</p>
            <h2>الأدوار المتاحة</h2>
          </div>
          <div className="roles-card-list">
            {roles.map((role) => (
              <button key={role.id} type="button" className={`role-card ${selectedRole?.id === role.id ? 'active' : ''}`} onClick={() => setSelectedRoleId(role.id)}>
                <span>
                  <strong>{roleLabel(role)}</strong>
                  <small>{role.name}</small>
                </span>
                <StatusBadge label={scopeLabel(role.scope)} tone={role.scope === 'PLATFORM' ? 'vip' : 'info'} />
                <dl>
                  <div><dt>المستخدمون</dt><dd>{role.usersCount}</dd></div>
                  <div><dt>الصلاحيات</dt><dd>{role.permissionsCount}</dd></div>
                  <div><dt>الحالة</dt><dd>{role.status === 'ACTIVE' ? 'نشط' : 'غير نشط'}</dd></div>
                </dl>
              </button>
            ))}
          </div>
        </AppCard>

        <AppCard className="role-details-panel">
          {selectedRole ? (
            <>
              <div className="role-details-header">
                <div>
                  <p className="panel-label">تفاصيل الدور</p>
                  <h2>{roleLabel(selectedRole)}</h2>
                  <p>{selectedRole.description || 'دور ضمن إعدادات الشركة الحالية.'}</p>
                </div>
                <div className="role-details-actions">
                  <StatusBadge label={scopeLabel(selectedRole.scope)} tone={selectedRole.scope === 'PLATFORM' ? 'vip' : 'info'} />
                  {canManage && !selectedRole.systemLocked ? <AppButton variant="secondary" onClick={() => setForm({ id: selectedRole.id, name: selectedRole.name, description: selectedRole.description ?? '' })}>تعديل الدور</AppButton> : null}
                </div>
              </div>

              <div className="drawer-metrics">
                <article><span>{selectedRole.usersCount}</span><small>مستخدم مرتبط</small></article>
                <article><span>{enabledCount}</span><small>صلاحية مفعلة</small></article>
                <article><span>{selectedRole.systemLocked ? 'نظامي' : 'مخصص'}</span><small>نوع الدور</small></article>
              </div>

              <section className="permissions-matrix-panel">
                <div className="role-section-header">
                  <div>
                    <p className="panel-label">مصفوفة الصلاحيات</p>
                    <h3>الصلاحيات حسب الوحدة</h3>
                  </div>
                  <AppButton variant="primary" onClick={savePermissions} disabled={!isEditableRole || isSaving}>
                    {isSaving ? 'جار الحفظ' : 'حفظ الصلاحيات'}
                  </AppButton>
                </div>

                <div className="permissions-group-grid">
                  {moduleGroups.map((group) => (
                    <section key={group.id} className="permission-group">
                      <h4>{group.label}</h4>
                      {group.permissions.map((permission) => (
                        <label key={permission} className="permission-toggle">
                          <input
                            type="checkbox"
                            checked={draftPermissions.has(permission)}
                            disabled={!isEditableRole}
                            onChange={() => togglePermission(permission)}
                          />
                          <span>{permissionLabelMap.get(permission) ?? permission}</span>
                        </label>
                      ))}
                    </section>
                  ))}
                </div>
              </section>

              <section className="role-users-placeholder">
                <p className="panel-label">المستخدمون المرتبطون بالدور</p>
                <EmptyState title="جاهز للربط مع المستخدمين" message="سيظهر هنا المستخدمون المرتبطون بالدور عند اكتمال إدارة المستخدمين." />
              </section>
            </>
          ) : (
            <EmptyState title="لا توجد أدوار" message="لم يتم العثور على أدوار ضمن نطاق الشركة الحالي." />
          )}
        </AppCard>
      </section>

      {form ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setForm(null)}>
          <form className="customer-modal role-modal panel-panel" role="dialog" aria-modal="true" aria-label="الدور" onSubmit={submitRole} onMouseDown={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <p className="panel-label">{form.id ? 'تعديل الدور' : 'إنشاء دور'}</p>
              <h2>{form.id ? 'تعديل بيانات الدور' : 'دور جديد'}</h2>
            </div>
            <label>اسم الدور<AppInput autoFocus required value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} /></label>
            <label>الوصف<textarea rows={4} value={form.description} onChange={(event) => setForm((current) => current ? { ...current, description: event.target.value } : current)} /></label>
            <div className="modal-actions">
              <AppButton type="button" variant="ghost" onClick={() => setForm(null)}>إلغاء</AppButton>
              <AppButton type="submit" variant="primary">حفظ الدور</AppButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
