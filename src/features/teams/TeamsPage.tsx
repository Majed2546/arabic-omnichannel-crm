import { type FormEvent, useEffect, useMemo, useState } from 'react'
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

type TeamType = 'SUPPORT' | 'SALES' | 'TECHNICAL' | 'OPERATIONS' | 'CUSTOM'
type MemberRole = 'LEAD' | 'MEMBER'

type Team = {
  id: string
  name: string
  description: string
  type: TeamType
  isActive: boolean
  membersCount: number
  lead?: { id: string; name: string; email: string } | null
}

type TeamMember = {
  id: string
  userId: string
  role: MemberRole
  user: { id: string; name: string; email: string; userType: string; status: string }
}

type UserOption = {
  id: string
  name: string
  email: string
  userType: string
  status: string
}

const typeLabels: Record<TeamType, string> = {
  SUPPORT: 'الدعم',
  SALES: 'المبيعات',
  TECHNICAL: 'تقني',
  OPERATIONS: 'تشغيلي',
  CUSTOM: 'مخصص',
}

const emptyTeam = { name: '', description: '', type: 'SUPPORT' as TeamType }

function normalizeTeam(payload: Partial<Team>): Team {
  return {
    id: String(payload.id ?? ''),
    name: String(payload.name ?? ''),
    description: String(payload.description ?? ''),
    type: payload.type ?? 'SUPPORT',
    isActive: payload.isActive ?? true,
    membersCount: Number(payload.membersCount ?? 0),
    lead: payload.lead ?? null,
  }
}

export default function TeamsPage() {
  const { can } = useAuth()
  const { currentTenant } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('users.manage')
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [form, setForm] = useState<typeof emptyTeam & { id?: string } | null>(null)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<MemberRole>('MEMBER')
  const [isLoading, setLoading] = useState(true)

  const selectedTeam = useMemo(() => teams.find((team) => team.id === selectedTeamId) ?? teams[0] ?? null, [teams, selectedTeamId])

  function loadTeams() {
    setLoading(true)
    apiFetch(apiUrl('/teams'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => {
        const nextTeams = Array.isArray(payload) ? payload.map(normalizeTeam) : []
        setTeams(nextTeams)
        setSelectedTeamId((current) => current && nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id ?? '')
      })
      .catch(() => setTeams([]))
      .finally(() => setLoading(false))
  }

  function loadUsers() {
    apiFetch(apiUrl('/users?userType=AGENT,CONSULTANT,SUPERVISOR&status=ACTIVE'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setUsers(Array.isArray(payload) ? payload : []))
      .catch(() => setUsers([]))
  }

  function loadMembers(teamId: string) {
    if (!teamId) return setMembers([])
    apiFetch(apiUrl(`/teams/${teamId}/members`))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setMembers(Array.isArray(payload) ? payload : []))
      .catch(() => setMembers([]))
  }

  useEffect(() => {
    loadTeams()
    loadUsers()
  }, [])

  useEffect(() => {
    loadMembers(selectedTeam?.id ?? '')
  }, [selectedTeam?.id])

  async function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form || !canManage) return
    try {
      const response = await apiFetch(apiUrl(form.id ? `/teams/${form.id}` : '/teams'), {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!response.ok) throw new Error('تعذر حفظ الفريق')
      setForm(null)
      loadTeams()
      showToast('تم حفظ الفريق', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الفريق', 'warning')
    }
  }

  async function addMember() {
    if (!selectedTeam || !memberUserId || !canManage) return
    try {
      const response = await apiFetch(apiUrl(`/teams/${selectedTeam.id}/members`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberUserId, role: memberRole }),
      })
      if (!response.ok) throw new Error('تعذر إضافة العضو')
      setMemberUserId('')
      loadMembers(selectedTeam.id)
      loadTeams()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر إضافة العضو', 'warning')
    }
  }

  async function removeMember(userId: string) {
    if (!selectedTeam || !canManage) return
    await apiFetch(apiUrl(`/teams/${selectedTeam.id}/members/${userId}`), { method: 'DELETE' })
    loadMembers(selectedTeam.id)
    loadTeams()
  }

  async function updateTeamStatus(team: Team) {
    if (!canManage) return
    await apiFetch(apiUrl(`/teams/${team.id}/status`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !team.isActive }),
    })
    loadTeams()
  }

  return (
    <div className="page-layout teams-page">
      <PageHeader
        title="الفرق"
        description={`إدارة فرق الإسناد في ${currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'}.`}
        actions={canManage ? <AppButton variant="primary" onClick={() => setForm(emptyTeam)}>إنشاء فريق</AppButton> : <StatusBadge label="عرض فقط" tone="muted" />}
      />

      {isLoading ? <LoadingSkeleton rows={4} /> : null}
      {!isLoading && !teams.length ? <EmptyState title="لا توجد فرق" message="أنشئ فريقاً لإسناد المحادثات والتذاكر والمواعيد." /> : null}

      <section className="teams-layout">
        <div className="teams-card-grid">
          {teams.map((team) => (
            <AppCard key={team.id} className={`team-card ${selectedTeam?.id === team.id ? 'active' : ''}`}>
              <button type="button" onClick={() => setSelectedTeamId(team.id)}>
                <strong>{team.name}</strong>
                <span>{typeLabels[team.type]}</span>
              </button>
              <p>{team.description || 'لا يوجد وصف'}</p>
              <dl>
                <div><dt>الأعضاء</dt><dd>{team.membersCount}</dd></div>
                <div><dt>قائد الفريق</dt><dd>{team.lead?.name ?? 'غير محدد'}</dd></div>
              </dl>
              <footer>
                <StatusBadge label={team.isActive ? 'نشط' : 'غير نشط'} tone={team.isActive ? 'success' : 'muted'} />
                {canManage ? <AppButton variant="ghost" onClick={() => updateTeamStatus(team)}>{team.isActive ? 'تعطيل' : 'تفعيل'}</AppButton> : null}
                {canManage ? <AppButton variant="secondary" onClick={() => setForm({ id: team.id, name: team.name, description: team.description, type: team.type })}>تعديل</AppButton> : null}
              </footer>
            </AppCard>
          ))}
        </div>

        <AppCard className="team-members-panel">
          <div className="panel-header">
            <p className="panel-label">أعضاء الفريق</p>
            <h2>{selectedTeam?.name ?? 'اختر فريقاً'}</h2>
          </div>
          {canManage && selectedTeam ? (
            <div className="team-member-add">
              <AppSelect value={memberUserId} onChange={(event) => setMemberUserId(event.target.value)}>
                <option value="">اختر مستخدماً</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}
              </AppSelect>
              <AppSelect value={memberRole} onChange={(event) => setMemberRole(event.target.value as MemberRole)}>
                <option value="MEMBER">عضو</option>
                <option value="LEAD">قائد الفريق</option>
              </AppSelect>
              <AppButton variant="primary" onClick={addMember}>إضافة</AppButton>
            </div>
          ) : null}
          <div className="team-member-list">
            {members.map((member) => (
              <article key={member.id}>
                <div><strong>{member.user.name}</strong><small>{member.user.email}</small></div>
                <StatusBadge label={member.role === 'LEAD' ? 'قائد الفريق' : 'عضو'} tone={member.role === 'LEAD' ? 'vip' : 'info'} />
                {canManage ? <AppButton variant="ghost" onClick={() => removeMember(member.userId)}>إزالة</AppButton> : null}
              </article>
            ))}
          </div>
        </AppCard>
      </section>

      {form ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setForm(null)}>
          <form className="customer-modal team-modal panel-panel" role="dialog" aria-modal="true" onSubmit={submitTeam} onMouseDown={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <p className="panel-label">{form.id ? 'تعديل فريق' : 'إنشاء فريق'}</p>
              <h2>{form.id ? 'تعديل بيانات الفريق' : 'فريق جديد'}</h2>
            </div>
            <label>اسم الفريق<AppInput required value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} /></label>
            <label>النوع<AppSelect value={form.type} onChange={(event) => setForm((current) => current ? { ...current, type: event.target.value as TeamType } : current)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></label>
            <label>الوصف<textarea rows={4} value={form.description} onChange={(event) => setForm((current) => current ? { ...current, description: event.target.value } : current)} /></label>
            <div className="modal-actions">
              <AppButton type="button" variant="ghost" onClick={() => setForm(null)}>إلغاء</AppButton>
              <AppButton type="submit" variant="primary">حفظ الفريق</AppButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
