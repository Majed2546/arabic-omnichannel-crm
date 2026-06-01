import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { EmptyState } from '../../components/ui/EmptyState'
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton'
import { PageHeader } from '../../components/layout/PageHeader'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { useUiStore } from '../../stores/uiStore'
import { useTenant } from '../../tenants/useTenant'

type UserType = 'COMPANY_ADMIN' | 'SUPERVISOR' | 'AGENT' | 'CONSULTANT' | 'VIEWER'
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'INVITED'
type PlatformRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_USER'

type RoleOption = {
  id: string
  name: string
  scope: 'PLATFORM' | 'TENANT'
}

type ManagedUser = {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string
  platformRole: PlatformRole
  roleId?: string | null
  role?: { id: string; name: string } | null
  jobTitle: string
  userType: UserType
  status: UserStatus
  avatarUrl: string
  timezone: string
  lastLoginAt?: string | null
  assignedConversationsCount: number
  openTicketsCount: number
  upcomingAppointmentsCount: number
  createdAt: string
  updatedAt: string
}

type UserForm = {
  id?: string
  name: string
  email: string
  phone: string
  jobTitle: string
  userType: UserType
  roleId: string
  status: UserStatus
}

const userTypeLabels: Record<UserType, string> = {
  COMPANY_ADMIN: 'مدير الشركة',
  SUPERVISOR: 'مشرف',
  AGENT: 'وكيل',
  CONSULTANT: 'مستشار',
  VIEWER: 'مشاهد',
}

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: 'نشط',
  INACTIVE: 'معطل',
  INVITED: 'مدعو',
}

const emptyForm: UserForm = {
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  userType: 'AGENT',
  roleId: '',
  status: 'INVITED',
}

function normalizeUser(payload: Partial<ManagedUser>): ManagedUser {
  return {
    id: String(payload.id ?? ''),
    tenantId: String(payload.tenantId ?? ''),
    name: String(payload.name ?? ''),
    email: String(payload.email ?? ''),
    phone: String(payload.phone ?? ''),
    platformRole: payload.platformRole ?? 'COMPANY_USER',
    roleId: payload.roleId,
    role: payload.role ?? null,
    jobTitle: String(payload.jobTitle ?? ''),
    userType: payload.userType ?? 'AGENT',
    status: payload.status ?? 'INVITED',
    avatarUrl: String(payload.avatarUrl ?? ''),
    timezone: String(payload.timezone ?? ''),
    lastLoginAt: payload.lastLoginAt ?? null,
    assignedConversationsCount: Number(payload.assignedConversationsCount ?? 0),
    openTicketsCount: Number(payload.openTicketsCount ?? 0),
    upcomingAppointmentsCount: Number(payload.upcomingAppointmentsCount ?? 0),
    createdAt: String(payload.createdAt ?? ''),
    updatedAt: String(payload.updatedAt ?? ''),
  }
}

function normalizeRole(payload: Partial<RoleOption>): RoleOption {
  return {
    id: String(payload.id ?? ''),
    name: String(payload.name ?? ''),
    scope: payload.scope === 'PLATFORM' ? 'PLATFORM' : 'TENANT',
  }
}

function userTypeForRoleName(roleName: string): UserType | null {
  const normalized = roleName.toUpperCase()
  if (normalized.includes('VIEWER') || normalized.includes('مشاهد')) return 'VIEWER'
  if (normalized.includes('COMPANY_ADMIN') || normalized.includes('مدير')) return 'COMPANY_ADMIN'
  if (normalized.includes('SUPERVISOR') || normalized.includes('مشرف')) return 'SUPERVISOR'
  if (normalized.includes('CONSULTANT') || normalized.includes('مستشار')) return 'CONSULTANT'
  if (normalized.includes('AGENT') || normalized.includes('وكيل')) return 'AGENT'
  return null
}

export default function UsersPage() {
  const location = useLocation()
  const { can } = useAuth()
  const { currentTenant, currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('users.manage')
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [search, setSearch] = useState('')
  const [roleId, setRoleId] = useState('')
  const [userType, setUserType] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setLoading] = useState(true)
  const [form, setForm] = useState<UserForm | null>(null)
  const isAgentsView = location.pathname === '/agents' || location.pathname === '/tenants'
  const operationalUserTypes: UserType[] = ['AGENT', 'CONSULTANT']

  const filteredRoles = useMemo(() => roles.filter((role) => role.scope === 'TENANT'), [roles])
  const pageTitle = isAgentsView ? 'المستشارون والوكلاء' : 'المستخدمون'
  const pageDescription = isAgentsView
    ? `يعرض فقط المستخدمين التشغيليين من نوع وكيل أو مستشار في ${currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'}.`
    : `إدارة المستخدمين والمستشارين والوكلاء في ${currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'}.`

  function loadUsers() {
    if (!currentTenantId) return
    setLoading(true)
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (roleId) params.set('roleId', roleId)
    if (isAgentsView) params.set('userType', operationalUserTypes.join(','))
    else if (userType) params.set('userType', userType)
    if (status) params.set('status', status)

    apiFetch(apiUrl(`/users${params.toString() ? `?${params.toString()}` : ''}`))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setUsers(Array.isArray(payload) ? payload.map(normalizeUser) : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }

  function loadRoles() {
    apiFetch(apiUrl('/roles'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setRoles(Array.isArray(payload) ? payload.map(normalizeRole) : []))
      .catch(() => setRoles([]))
  }

  useEffect(() => {
    loadRoles()
  }, [currentTenantId])

  useEffect(() => {
    loadUsers()
  }, [currentTenantId, search, roleId, userType, status, isAgentsView])

  function openEdit(user: ManagedUser) {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      jobTitle: user.jobTitle,
      userType: user.userType,
      roleId: user.roleId ?? '',
      status: user.status,
    })
  }

  function updateFormRole(nextRoleId: string) {
    setForm((current) => {
      if (!current) return current
      const selectedRole = filteredRoles.find((role) => role.id === nextRoleId)
      const nextUserType = selectedRole ? userTypeForRoleName(selectedRole.name) : null
      return {
        ...current,
        roleId: nextRoleId,
        userType: nextUserType ?? current.userType,
      }
    })
  }

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || !canManage) return
    try {
      const response = await apiFetch(apiUrl(form.id ? `/users/${encodeURIComponent(form.id)}` : '/users'), {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error('تعذر حفظ المستخدم')
      await response.json()
      setForm(null)
      loadUsers()
      showToast('تم حفظ المستخدم', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ المستخدم', 'warning')
    }
  }

  async function updateStatus(user: ManagedUser, nextStatus: UserStatus) {
    if (!canManage) return
    try {
      const response = await apiFetch(apiUrl(`/users/${encodeURIComponent(user.id)}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!response.ok) throw new Error('تعذر تحديث حالة المستخدم')
      await response.json()
      loadUsers()
      showToast('تم تحديث حالة المستخدم', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر تحديث حالة المستخدم', 'warning')
    }
  }

  return (
    <div className="page-layout users-page">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        actions={canManage ? <AppButton variant="primary" onClick={() => setForm(emptyForm)}>إنشاء مستخدم</AppButton> : <StatusBadge label="عرض فقط" tone="muted" />}
      />

      <AppCard className="users-filters">
        <AppInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث بالاسم أو البريد أو الجوال" aria-label="بحث المستخدمين" />
        <AppSelect value={roleId} onChange={(event) => setRoleId(event.target.value)} aria-label="تصفية حسب الدور">
          <option value="">كل الأدوار</option>
          {filteredRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
        </AppSelect>
        <AppSelect value={userType} onChange={(event) => setUserType(event.target.value)} aria-label="تصفية حسب نوع المستخدم" disabled={isAgentsView}>
          <option value="">كل الأنواع</option>
          {Object.entries(userTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
        <AppSelect value={status} onChange={(event) => setStatus(event.target.value)} aria-label="تصفية حسب الحالة">
          <option value="">كل الحالات</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </AppSelect>
      </AppCard>

      {isLoading ? <LoadingSkeleton rows={5} /> : null}
      {!isLoading && !users.length ? <EmptyState title="لا توجد مستخدمين" message="لا توجد سجلات مطابقة ضمن نطاق الشركة الحالي." /> : null}

      {!isLoading && users.length ? (
        <section className="users-card-grid">
          {users.map((user) => (
            <AppCard key={user.id} className="user-management-card">
              <header>
                <span>{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : user.name.charAt(0)}</span>
                <div>
                  <h2>{user.name}</h2>
                  <p>{user.email}</p>
                  <small>{user.phone || 'لا يوجد جوال'}</small>
                </div>
                <StatusBadge label={statusLabels[user.status]} tone={user.status === 'ACTIVE' ? 'success' : user.status === 'INVITED' ? 'info' : 'muted'} />
              </header>
              <dl>
                <div><dt>الدور</dt><dd>{user.role?.name ?? 'بدون دور'}</dd></div>
                <div><dt>نوع المستخدم</dt><dd>{userTypeLabels[user.userType]}</dd></div>
                <div><dt>المسمى الوظيفي</dt><dd>{user.jobTitle || '-'}</dd></div>
                <div><dt>المحادثات</dt><dd>{user.assignedConversationsCount}</dd></div>
                <div><dt>التذاكر المفتوحة</dt><dd>{user.openTicketsCount}</dd></div>
                <div><dt>المواعيد القادمة</dt><dd>{user.upcomingAppointmentsCount}</dd></div>
              </dl>
              {canManage ? (
                <footer>
                  <AppButton variant="secondary" onClick={() => openEdit(user)}>تعديل</AppButton>
                  {user.status === 'ACTIVE'
                    ? <AppButton variant="ghost" onClick={() => updateStatus(user, 'INACTIVE')}>تعطيل</AppButton>
                    : <AppButton variant="ghost" onClick={() => updateStatus(user, 'ACTIVE')}>تفعيل</AppButton>}
                </footer>
              ) : null}
            </AppCard>
          ))}
        </section>
      ) : null}

      {form ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setForm(null)}>
          <form className="customer-modal user-modal panel-panel" role="dialog" aria-modal="true" aria-label="المستخدم" onSubmit={submitUser} onMouseDown={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <p className="panel-label">{form.id ? 'تعديل مستخدم' : 'إنشاء مستخدم'}</p>
              <h2>{form.id ? 'تعديل بيانات المستخدم' : 'مستخدم جديد'}</h2>
            </div>
            <div className="user-form-grid">
              <label>الاسم<AppInput required value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} /></label>
              <label>البريد الإلكتروني<AppInput required type="email" value={form.email} onChange={(event) => setForm((current) => current ? { ...current, email: event.target.value } : current)} /></label>
              <label>الجوال<AppInput value={form.phone} onChange={(event) => setForm((current) => current ? { ...current, phone: event.target.value } : current)} /></label>
              <label>المسمى الوظيفي<AppInput value={form.jobTitle} onChange={(event) => setForm((current) => current ? { ...current, jobTitle: event.target.value } : current)} /></label>
              <label>نوع المستخدم<AppSelect value={form.userType} onChange={(event) => setForm((current) => current ? { ...current, userType: event.target.value as UserType } : current)}>{Object.entries(userTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></label>
              <label>الدور<AppSelect value={form.roleId} onChange={(event) => updateFormRole(event.target.value)}><option value="">بدون دور</option>{filteredRoles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</AppSelect></label>
              <label>الحالة<AppSelect value={form.status} onChange={(event) => setForm((current) => current ? { ...current, status: event.target.value as UserStatus } : current)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></label>
            </div>
            {form.userType === 'VIEWER' ? <p className="user-form-note">اختيار نوع مشاهد يمنع ظهور المستخدم في صفحة المستشارين والوكلاء.</p> : null}
            {isAgentsView && !operationalUserTypes.includes(form.userType) ? <p className="user-form-note warning">هذا المستخدم لن يظهر في صفحة المستشارين والوكلاء بعد الحفظ لأن نوعه ليس وكيلاً أو مستشاراً.</p> : null}
            <div className="modal-actions">
              <AppButton type="button" variant="ghost" onClick={() => setForm(null)}>إلغاء</AppButton>
              <AppButton type="submit" variant="primary">حفظ المستخدم</AppButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
