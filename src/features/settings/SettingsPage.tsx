import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../auth/useAuth'
import { useTenant } from '../../tenants/useTenant'
import { useUiStore } from '../../stores/uiStore'
import { apiFetch, apiUrl } from '../../lib/apiClient'

type ConversationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'VIP'
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

type TenantSettings = {
  id: string | null
  tenantId: string
  companyDisplayName: string
  logoUrl: string
  timezone: string
  language: string
  workingDays: string[]
  workingHours: { start: string; end: string; slaWarningBeforeMinutes: number }
  slaFirstResponseMinutes: number
  slaResolutionMinutes: number
  notificationSettings: {
    newMessage: boolean
    newTicket: boolean
    upcomingAppointment: boolean
    slaBreached: boolean
    messageSendFailed: boolean
  }
  defaultConversationPriority: ConversationPriority
  defaultTicketPriority: TicketPriority
  defaultAppointmentDurationMinutes: number
  messageSignature: string
  updatedAt?: string | null
}

const defaultSettings: TenantSettings = {
  id: null,
  tenantId: 'default-tenant',
  companyDisplayName: '',
  logoUrl: '',
  timezone: 'Asia/Riyadh',
  language: 'ar',
  workingDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
  workingHours: { start: '09:00', end: '17:00', slaWarningBeforeMinutes: 10 },
  slaFirstResponseMinutes: 15,
  slaResolutionMinutes: 240,
  notificationSettings: {
    newMessage: true,
    newTicket: true,
    upcomingAppointment: true,
    slaBreached: true,
    messageSendFailed: true,
  },
  defaultConversationPriority: 'NORMAL',
  defaultTicketPriority: 'MEDIUM',
  defaultAppointmentDurationMinutes: 30,
  messageSignature: '',
}

const tabs = [
  ['company', 'بيانات الشركة'],
  ['working-hours', 'أوقات العمل'],
  ['sla', 'SLA'],
  ['notifications', 'الإشعارات'],
  ['defaults', 'الإعدادات الافتراضية'],
  ['signature', 'توقيع الرسائل'],
] as const

const dayOptions = [
  ['SUN', 'الأحد'],
  ['MON', 'الإثنين'],
  ['TUE', 'الثلاثاء'],
  ['WED', 'الأربعاء'],
  ['THU', 'الخميس'],
  ['FRI', 'الجمعة'],
  ['SAT', 'السبت'],
] as const

const conversationPriorityLabels: Record<ConversationPriority, string> = {
  LOW: 'منخفضة',
  NORMAL: 'عادية',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
  VIP: 'VIP',
}

const ticketPriorityLabels: Record<TicketPriority, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  URGENT: 'عاجلة',
}

function normalizeSettings(payload: Partial<TenantSettings>): TenantSettings {
  return {
    ...defaultSettings,
    ...payload,
    workingDays: Array.isArray(payload.workingDays) ? payload.workingDays : defaultSettings.workingDays,
    workingHours: { ...defaultSettings.workingHours, ...(payload.workingHours ?? {}) },
    notificationSettings: { ...defaultSettings.notificationSettings, ...(payload.notificationSettings ?? {}) },
  }
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default function SettingsPage() {
  const { can } = useAuth()
  const { currentTenant, currentTenantId, refreshTenants } = useTenant()
  const showToast = useUiStore((state) => state.showToast)
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>('company')
  const [settings, setSettings] = useState<TenantSettings>(defaultSettings)
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const canManageSettings = can('settings.manage')

  const description = useMemo(() => {
    return `إعدادات تشغيل ${currentTenant?.displayName ?? currentTenant?.name ?? 'الشركة الحالية'} المستخدمة في الوارد والتذاكر والمواعيد والأتمتة والتقارير.`
  }, [currentTenant?.displayName, currentTenant?.name])

  function refresh() {
    setLoading(true)
    setLoadError('')
    apiFetch(apiUrl('/settings'))
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setSettings(normalizeSettings(payload)))
      .catch(() => setLoadError('تعذر تحميل إعدادات الشركة الحالية.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setSettings(defaultSettings)
    refresh()
  }, [currentTenantId])

  async function saveSettings() {
    if (!canManageSettings) return
    setSaving(true)
    try {
      const response = await apiFetch(apiUrl('/settings'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error('تعذر حفظ الإعدادات')
      setSettings(normalizeSettings(await response.json()))
      await refreshTenants()
      showToast('تم حفظ الإعدادات', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ الإعدادات', 'warning')
    } finally {
      setSaving(false)
    }
  }

  function toggleWorkingDay(day: string) {
    setSettings((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day],
    }))
  }

  return (
    <div className="page-layout settings-page">
      <PageHeader
        title="الإعدادات"
        description={description}
        actions={canManageSettings ? <AppButton variant="primary" onClick={saveSettings} disabled={isSaving}>{isSaving ? 'جار الحفظ' : 'حفظ الإعدادات'}</AppButton> : <StatusBadge label="عرض فقط" tone="muted" />}
      />

      {isLoading ? <EmptyState title="جار تحميل الإعدادات" message="نجهز إعدادات الشركة الحالية." /> : null}
      {!isLoading && loadError ? <EmptyState title="تعذر التحميل" message={loadError} /> : null}

      {!loadError ? (
        <section className="settings-shell">
          <AppCard className="settings-tabs" aria-label="أقسام الإعدادات">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>
                {label}
              </button>
            ))}
          </AppCard>

          <AppCard className="settings-panel">
            {activeTab === 'company' ? (
              <div className="settings-form-grid">
                <label>اسم الشركة الظاهر<input disabled={!canManageSettings} value={settings.companyDisplayName} onChange={(event) => setSettings((current) => ({ ...current, companyDisplayName: event.target.value }))} /></label>
                <label>رابط الشعار<input disabled={!canManageSettings} value={settings.logoUrl} onChange={(event) => setSettings((current) => ({ ...current, logoUrl: event.target.value }))} /></label>
                <label>اللغة<select disabled={!canManageSettings} value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))}><option value="ar">العربية</option><option value="en">English</option></select></label>
                <label>المنطقة الزمنية<input disabled={!canManageSettings} value={settings.timezone} onChange={(event) => setSettings((current) => ({ ...current, timezone: event.target.value }))} /></label>
              </div>
            ) : null}

            {activeTab === 'working-hours' ? (
              <div className="settings-form-grid">
                <div className="settings-form-wide">
                  <span className="settings-label">أيام العمل</span>
                  <div className="settings-check-grid">
                    {dayOptions.map(([day, label]) => (
                      <label key={day}><input type="checkbox" disabled={!canManageSettings} checked={settings.workingDays.includes(day)} onChange={() => toggleWorkingDay(day)} />{label}</label>
                    ))}
                  </div>
                </div>
                <label>وقت بداية الدوام<input type="time" disabled={!canManageSettings} value={settings.workingHours.start} onChange={(event) => setSettings((current) => ({ ...current, workingHours: { ...current.workingHours, start: event.target.value } }))} /></label>
                <label>وقت نهاية الدوام<input type="time" disabled={!canManageSettings} value={settings.workingHours.end} onChange={(event) => setSettings((current) => ({ ...current, workingHours: { ...current.workingHours, end: event.target.value } }))} /></label>
              </div>
            ) : null}

            {activeTab === 'sla' ? (
              <div className="settings-form-grid">
                <label>مدة الرد الأول بالدقائق<input type="number" disabled={!canManageSettings} value={settings.slaFirstResponseMinutes} onChange={(event) => setSettings((current) => ({ ...current, slaFirstResponseMinutes: numberValue(event.target.value, current.slaFirstResponseMinutes) }))} /></label>
                <label>مدة الحل بالدقائق<input type="number" disabled={!canManageSettings} value={settings.slaResolutionMinutes} onChange={(event) => setSettings((current) => ({ ...current, slaResolutionMinutes: numberValue(event.target.value, current.slaResolutionMinutes) }))} /></label>
                <label>تنبيه قبل تجاوز SLA<input type="number" disabled={!canManageSettings} value={settings.workingHours.slaWarningBeforeMinutes} onChange={(event) => setSettings((current) => ({ ...current, workingHours: { ...current.workingHours, slaWarningBeforeMinutes: numberValue(event.target.value, current.workingHours.slaWarningBeforeMinutes) } }))} /></label>
              </div>
            ) : null}

            {activeTab === 'notifications' ? (
              <div className="settings-check-grid">
                {[
                  ['newMessage', 'تنبيه رسالة جديدة'],
                  ['newTicket', 'تنبيه تذكرة جديدة'],
                  ['upcomingAppointment', 'تنبيه موعد قريب'],
                  ['slaBreached', 'تنبيه تجاوز SLA'],
                  ['messageSendFailed', 'تنبيه فشل إرسال رسالة'],
                ].map(([key, label]) => (
                  <label key={key}>
                    <input type="checkbox" disabled={!canManageSettings} checked={Boolean(settings.notificationSettings[key as keyof TenantSettings['notificationSettings']])} onChange={(event) => setSettings((current) => ({ ...current, notificationSettings: { ...current.notificationSettings, [key]: event.target.checked } }))} />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}

            {activeTab === 'defaults' ? (
              <div className="settings-form-grid">
                <label>أولوية المحادثة الافتراضية<select disabled={!canManageSettings} value={settings.defaultConversationPriority} onChange={(event) => setSettings((current) => ({ ...current, defaultConversationPriority: event.target.value as ConversationPriority }))}>{Object.entries(conversationPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>أولوية التذكرة الافتراضية<select disabled={!canManageSettings} value={settings.defaultTicketPriority} onChange={(event) => setSettings((current) => ({ ...current, defaultTicketPriority: event.target.value as TicketPriority }))}>{Object.entries(ticketPriorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>مدة الموعد الافتراضية بالدقائق<input type="number" disabled={!canManageSettings} value={settings.defaultAppointmentDurationMinutes} onChange={(event) => setSettings((current) => ({ ...current, defaultAppointmentDurationMinutes: numberValue(event.target.value, current.defaultAppointmentDurationMinutes) }))} /></label>
              </div>
            ) : null}

            {activeTab === 'signature' ? (
              <div className="settings-form-grid">
                <label className="settings-form-wide">توقيع افتراضي للرسائل<textarea rows={6} disabled={!canManageSettings} value={settings.messageSignature} onChange={(event) => setSettings((current) => ({ ...current, messageSignature: event.target.value }))} /></label>
              </div>
            ) : null}
          </AppCard>
        </section>
      ) : null}
    </div>
  )
}
