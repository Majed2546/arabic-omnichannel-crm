import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { PageHeader } from '../../components/layout/PageHeader'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { useUiStore } from '../../stores/uiStore'

type MetaReviewStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'

type MetaSettings = {
  appId: string
  embeddedSignupConfigId: string
  redirectUri: string
  webhookUrl: string
  appReviewStatus: MetaReviewStatus
  techProviderVerified: boolean
  embeddedSignupEnabled: boolean
  requiredPermissions: string[]
  notes: string
  updatedAt?: string
}

type MetaReadiness = {
  ready: boolean
  checklist: {
    appIdConfigured: boolean
    configIdConfigured: boolean
    redirectUriConfigured: boolean
    webhookUrlConfigured: boolean
    appReviewApproved: boolean
    techProviderVerified: boolean
    embeddedSignupEnabled: boolean
  }
  missing: string[]
  updatedAt?: string
}

const emptySettings: MetaSettings = {
  appId: '',
  embeddedSignupConfigId: '',
  redirectUri: '',
  webhookUrl: '',
  appReviewStatus: 'NOT_STARTED',
  techProviderVerified: false,
  embeddedSignupEnabled: false,
  requiredPermissions: ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'],
  notes: '',
}

const emptyReadiness: MetaReadiness = {
  ready: false,
  checklist: {
    appIdConfigured: false,
    configIdConfigured: false,
    redirectUriConfigured: false,
    webhookUrlConfigured: false,
    appReviewApproved: false,
    techProviderVerified: false,
    embeddedSignupEnabled: false,
  },
  missing: [],
}

const reviewLabels: Record<MetaReviewStatus, string> = {
  NOT_STARTED: 'لم يبدأ',
  IN_PROGRESS: 'قيد التنفيذ',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
}

const readinessLabels: Record<keyof MetaReadiness['checklist'], string> = {
  appIdConfigured: 'معرف التطبيق',
  configIdConfigured: 'إعداد Embedded Signup',
  redirectUriConfigured: 'رابط Redirect URI',
  webhookUrlConfigured: 'رابط Webhook',
  appReviewApproved: 'موافقة App Review',
  techProviderVerified: 'توثيق Tech Provider',
  embeddedSignupEnabled: 'تفعيل Embedded Signup',
}

function normalizeSettings(payload: Partial<MetaSettings> & Record<string, unknown>): MetaSettings {
  return {
    ...emptySettings,
    appId: String(payload.appId ?? ''),
    embeddedSignupConfigId: String(payload.embeddedSignupConfigId ?? payload.configId ?? ''),
    redirectUri: String(payload.redirectUri ?? ''),
    webhookUrl: String(payload.webhookUrl ?? payload.webhookCallbackUrl ?? ''),
    appReviewStatus: String(payload.appReviewStatus ?? 'NOT_STARTED') as MetaReviewStatus,
    techProviderVerified: Boolean(payload.techProviderVerified ?? (payload.checklist as { techProviderVerified?: boolean } | undefined)?.techProviderVerified),
    embeddedSignupEnabled: Boolean(payload.embeddedSignupEnabled),
    requiredPermissions: Array.isArray(payload.requiredPermissions) ? payload.requiredPermissions.map(String) : emptySettings.requiredPermissions,
    notes: String(payload.notes ?? ''),
    updatedAt: payload.updatedAt ? String(payload.updatedAt) : undefined,
  }
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString('ar-SA') : 'لم يتم الحفظ بعد'
}

export default function MetaSettingsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const [settings, setSettings] = useState<MetaSettings>(emptySettings)
  const [readiness, setReadiness] = useState<MetaReadiness>(emptyReadiness)
  const [isLoading, setLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  function refresh() {
    setLoading(true)
    setLoadError('')
    Promise.all([
      apiFetch(apiUrl('/meta/settings')).then((response) => response.ok ? response.json() : Promise.reject()),
      apiFetch(apiUrl('/meta/readiness')).then((response) => response.ok ? response.json() : Promise.reject()),
    ])
      .then(([settingsPayload, readinessPayload]) => {
        setSettings(normalizeSettings(settingsPayload))
        setReadiness({ ...emptyReadiness, ...readinessPayload, checklist: { ...emptyReadiness.checklist, ...readinessPayload.checklist } })
      })
      .catch(() => setLoadError('تعذر تحميل إعدادات Meta حالياً.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  async function saveSettings() {
    setSaving(true)
    try {
      const response = await apiFetch(apiUrl('/meta/settings'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) throw new Error('تعذر حفظ إعدادات Meta')
      showToast('تم حفظ إعدادات Meta بدون حفظ أي أسرار أو رموز وصول.', 'success')
      refresh()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ إعدادات Meta', 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-layout meta-admin-page">
      <PageHeader
        title="إعدادات Meta"
        description="هذه الإعدادات خاصة بمالك المنصة ولا تظهر للشركات المشتركة."
        actions={<StatusBadge label={readiness.ready ? 'جاهز لبدء الربط عبر Meta' : 'إعدادات Meta غير مكتملة'} tone={readiness.ready ? 'success' : 'warning'} />}
      />

      {isLoading ? <EmptyState title="جار تحميل إعدادات Meta" message="نراجع إعدادات التطبيق والجاهزية." /> : null}
      {!isLoading && loadError ? <EmptyState title="تعذر التحميل" message={loadError} /> : null}

      {!loadError ? (
        <section className="meta-admin-grid">
          <AppCard className="meta-settings-panel">
            <div className="form-section-title">
              <h2>إدارة الهوية والتكاملات</h2>
              <p>لا يتم عرض App Secret، ولا يتم تخزين Access Tokens في هذا الإصدار.</p>
            </div>
            <div className="meta-settings-grid">
              <label>Meta App ID<input value={settings.appId} onChange={(event) => setSettings((current) => ({ ...current, appId: event.target.value }))} /></label>
              <label>Embedded Signup Config ID<input value={settings.embeddedSignupConfigId} onChange={(event) => setSettings((current) => ({ ...current, embeddedSignupConfigId: event.target.value }))} /></label>
              <label>Redirect URI<input value={settings.redirectUri} onChange={(event) => setSettings((current) => ({ ...current, redirectUri: event.target.value }))} /></label>
              <label>Webhook URL<input value={settings.webhookUrl} onChange={(event) => setSettings((current) => ({ ...current, webhookUrl: event.target.value }))} /></label>
              <label>App Review Status
                <select value={settings.appReviewStatus} onChange={(event) => setSettings((current) => ({ ...current, appReviewStatus: event.target.value as MetaReviewStatus }))}>
                  {Object.entries(reviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="meta-settings-wide">Required Permissions<textarea rows={3} value={settings.requiredPermissions.join(', ')} onChange={(event) => setSettings((current) => ({ ...current, requiredPermissions: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} /></label>
              <label className="meta-settings-wide">Notes<textarea rows={4} value={settings.notes} onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))} /></label>
            </div>
            <div className="meta-checklist compact">
              <label>
                <input type="checkbox" checked={settings.techProviderVerified} onChange={(event) => setSettings((current) => ({ ...current, techProviderVerified: event.target.checked }))} />
                <span>Tech Provider Verified</span>
              </label>
              <label>
                <input type="checkbox" checked={settings.embeddedSignupEnabled} onChange={(event) => setSettings((current) => ({ ...current, embeddedSignupEnabled: event.target.checked }))} />
                <span>Embedded Signup Enabled</span>
              </label>
            </div>
            <div className="channel-actions">
              <AppButton variant="primary" onClick={saveSettings} disabled={isSaving}>{isSaving ? 'جار الحفظ' : 'حفظ الإعدادات'}</AppButton>
              <span className="meta-admin-updated">آخر تحديث: {formatDate(settings.updatedAt ?? readiness.updatedAt)}</span>
            </div>
          </AppCard>

          <AppCard className="meta-readiness-card">
            <div className="form-section-title">
              <h2>قائمة الجاهزية</h2>
              <p>تحدد هذه القائمة ظهور حالة جاهز في صفحة القنوات.</p>
            </div>
            <div className="meta-readiness-list">
              {(Object.keys(readinessLabels) as Array<keyof MetaReadiness['checklist']>).map((key) => {
                const done = Boolean(readiness.checklist[key])
                return (
                  <article key={key}>
                    <span className={done ? 'ready' : 'missing'}>{done ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}</span>
                    <strong>{readinessLabels[key]}</strong>
                    <StatusBadge label={done ? 'مكتمل' : 'غير مكتمل'} tone={done ? 'success' : 'warning'} />
                  </article>
                )
              })}
            </div>
          </AppCard>
        </section>
      ) : null}
    </div>
  )
}
