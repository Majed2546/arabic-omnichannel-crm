import { useEffect, useState, type FormEvent } from 'react'
import { Bot, Save, Send } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { AppInput } from '../../components/ui/AppInput'
import { AppSelect } from '../../components/ui/AppSelect'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { fetchBotSettings, testBotMessage, updateBotSettings, type BotSettings } from './botData'

type Option = { id: string; name: string; email?: string }

const fallbackSettings: BotSettings = {
  tenantId: '',
  isEnabled: false,
  welcomeMessage: 'أهلًا بك 👋\nكيف نقدر نخدمك؟\n1. حجز موعد\n2. الدعم الفني\n3. متابعة طلب\n4. التحدث مع موظف',
  handoffMessage: 'تم تحويلك لأحد موظفينا، سيتم الرد عليك قريبًا.',
  appointmentEnabled: true,
  ticketEnabled: true,
  workingHoursOnly: false,
  defaultAppointmentDurationMinutes: 30,
  defaultAssignedTeamId: '',
  defaultAssignedUserId: '',
}

export default function BotPage() {
  const { can } = useAuth()
  const { currentTenantId } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const canManage = can('bot.manage')
  const [settings, setSettings] = useState<BotSettings>(fallbackSettings)
  const [teams, setTeams] = useState<Option[]>([])
  const [users, setUsers] = useState<Option[]>([])
  const [testMessage, setTestMessage] = useState('1')
  const [testReply, setTestReply] = useState('')

  function load() {
    if (!currentTenantId) return
    fetchBotSettings()
      .then((payload) => setSettings({ ...fallbackSettings, ...payload }))
      .catch((error) => showToast(error instanceof Error ? error.message : 'تعذر تحميل إعدادات الوكيل', 'warning'))
    apiFetch(apiUrl('/teams'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setTeams(Array.isArray(payload) ? payload : []))
      .catch(() => setTeams([]))
    apiFetch(apiUrl('/users?userType=AGENT,CONSULTANT,SUPERVISOR&status=ACTIVE'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setUsers(Array.isArray(payload) ? payload : []))
      .catch(() => setUsers([]))
  }

  useEffect(() => {
    setSettings(fallbackSettings)
    load()
  }, [currentTenantId])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return
    try {
      const saved = await updateBotSettings(settings)
      setSettings({ ...fallbackSettings, ...saved })
      showToast('تم حفظ إعدادات وكيل واتساب', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الإعدادات', 'warning')
    }
  }

  async function runTest() {
    const result = await testBotMessage(testMessage)
    setTestReply(result.reply)
  }

  return (
    <div className="page-layout bot-page">
      <PageHeader
        title="وكيل واتساب الذكي"
        description="وكيل إرشادي آمن يعتمد على خيارات مرقمة لحجز المواعيد وإنشاء التذاكر والتحويل للموظفين."
        actions={<Bot size={22} />}
      />

      <form className="bot-settings-grid" onSubmit={save}>
        <AppCard className="bot-settings-section">
          <h2>تفعيل الوكيل</h2>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.isEnabled} disabled={!canManage} onChange={(event) => setSettings({ ...settings, isEnabled: event.target.checked })} />
            <span>تفعيل وكيل واتساب</span>
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={settings.workingHoursOnly} disabled={!canManage} onChange={(event) => setSettings({ ...settings, workingHoursOnly: event.target.checked })} />
            <span>أوقات العمل فقط</span>
          </label>
        </AppCard>

        <AppCard className="bot-settings-section">
          <h2>رسالة الترحيب</h2>
          <textarea disabled={!canManage} value={settings.welcomeMessage} onChange={(event) => setSettings({ ...settings, welcomeMessage: event.target.value })} />
          <h3>خيارات القائمة الرئيسية</h3>
          <p>1. حجز موعد · 2. الدعم الفني · 3. متابعة طلب · 4. التحدث مع موظف</p>
        </AppCard>

        <AppCard className="bot-settings-section">
          <h2>إعدادات حجز المواعيد</h2>
          <label className="toggle-row"><input type="checkbox" checked={settings.appointmentEnabled} disabled={!canManage} onChange={(event) => setSettings({ ...settings, appointmentEnabled: event.target.checked })} /><span>تمكين حجز المواعيد</span></label>
          <label><span>مدة الموعد الافتراضية</span><AppInput type="number" disabled={!canManage} value={settings.defaultAppointmentDurationMinutes} onChange={(event) => setSettings({ ...settings, defaultAppointmentDurationMinutes: Number(event.target.value) })} /></label>
        </AppCard>

        <AppCard className="bot-settings-section">
          <h2>إعدادات التذاكر</h2>
          <label className="toggle-row"><input type="checkbox" checked={settings.ticketEnabled} disabled={!canManage} onChange={(event) => setSettings({ ...settings, ticketEnabled: event.target.checked })} /><span>تمكين إنشاء التذاكر</span></label>
        </AppCard>

        <AppCard className="bot-settings-section">
          <h2>التحويل للموظف</h2>
          <textarea disabled={!canManage} value={settings.handoffMessage} onChange={(event) => setSettings({ ...settings, handoffMessage: event.target.value })} />
          <label><span>الفريق الافتراضي</span><AppSelect disabled={!canManage} value={settings.defaultAssignedTeamId ?? ''} onChange={(event) => setSettings({ ...settings, defaultAssignedTeamId: event.target.value })}><option value="">بدون فريق</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</AppSelect></label>
          <label><span>الموظف الافتراضي</span><AppSelect disabled={!canManage} value={settings.defaultAssignedUserId ?? ''} onChange={(event) => setSettings({ ...settings, defaultAssignedUserId: event.target.value })}><option value="">بدون موظف</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</AppSelect></label>
        </AppCard>

        <AppCard className="bot-settings-section">
          <h2>تجربة رسالة</h2>
          <AppInput value={testMessage} onChange={(event) => setTestMessage(event.target.value)} />
          <AppButton type="button" variant="secondary" onClick={runTest}><Send size={15} /> تجربة</AppButton>
          {testReply ? <pre className="bot-test-reply">{testReply}</pre> : null}
        </AppCard>

        {canManage ? <AppButton type="submit" variant="primary"><Save size={16} /> حفظ الإعدادات</AppButton> : null}
      </form>
    </div>
  )
}
