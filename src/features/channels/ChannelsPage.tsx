import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Camera,
  CheckCircle2,
  Clock3,
  Mail,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useAuth } from '../../auth/useAuth'
import { useUiStore } from '../../stores/uiStore'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { useTenant } from '../../tenants/useTenant'
import { getChannelLabel } from '../../shared/utils'

type ChannelType = 'WHATSAPP' | 'EMAIL' | 'WEBCHAT' | 'INSTAGRAM' | 'TELEGRAM' | 'SMS' | 'VOICE' | 'X'

type ChannelRecord = {
  id: string
  tenantId?: string
  tenant_id?: string
  type?: string
  status?: string
  name?: string
  label?: string
  config?: {
    whatsappNumber?: string
    operationMode?: 'PLATFORM_ONLY' | 'APP_AND_PLATFORM'
  } | null
  placeholder?: boolean
  connectedAt?: string | null
  updatedAt?: string | null
}

type TenantChannelSummary = {
  id: string
  organizationName: string
  whatsappNumber?: string | null
  requestedChannels: string[]
  hasMetaBusiness: boolean
  hasWhatsAppBusinessApp: boolean
  operationMode: 'PLATFORM_ONLY' | 'APP_AND_PLATFORM'
  status: string
}

type TenantChannelsResponse = {
  tenantId: string
  tenant?: {
    id: string
    name: string
    displayName?: string
    slug?: string
  } | null
  items?: ChannelRecord[]
  onboardingRequest?: TenantChannelSummary | null
  defaultWhatsAppReady?: boolean
}

type WhatsAppStatus = {
  cloudApiReady?: boolean
  embeddedSignupReady?: boolean
  webhookEngineReady?: boolean
}

type MetaSettings = {
  appId: string
  configId: string
  redirectUri: string
  webhookCallbackUrl: string
  requiredPermissions: string[]
  appReviewStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED'
  embeddedSignupEnabled: boolean
  appSecretConfigured?: boolean
  checklist: {
    appIdConfigured?: boolean
    configIdConfigured?: boolean
    redirectUriConfigured?: boolean
    webhookUrlConfigured?: boolean
    techProviderVerified: boolean
    appLive: boolean
    appReviewApproved: boolean
    webhookConfigured: boolean
    embeddedSignupConfigured: boolean
  }
  readiness: {
    ready: boolean
    missing: string[]
  }
}

type MetaStartPayload = {
  ready: boolean
  mode: string
  appId: string
  configId: string
  redirectUri: string
  state: string
  tenantId?: string
  requiredPermissions: string[]
  message: string
}

type WhatsAppConnectionState = 'غير متصل' | 'قيد التفعيل' | 'متصل' | 'يحتاج مراجعة' | 'يوجد خطأ'

type OnboardingFormState = {
  organizationName: string
  website: string
  adminName: string
  adminEmail: string
  adminMobile: string
  phoneToConnect: string
  currentlyUsesBusinessApp: string
  operationMode: string
  notes: string
}

type PlannedChannel = {
  type: ChannelType
  name: string
  description: string
  provider: string
  icon: LucideIcon
  available: boolean
}

const PLANNED_CHANNELS: PlannedChannel[] = [
  {
    type: 'WHATSAPP',
    name: `${getChannelLabel('WHATSAPP')} Business`,
    description: 'ربط واتساب Business عبر Meta لإدارة المحادثات والردود من صندوق الوارد.',
    provider: 'Meta Cloud API',
    icon: MessageCircle,
    available: true,
  },
  {
    type: 'EMAIL',
    name: 'البريد الإلكتروني',
    description: 'استقبال رسائل العملاء وتحويلها إلى محادثات قابلة للمتابعة داخل CRM.',
    provider: 'SMTP / IMAP',
    icon: Mail,
    available: false,
  },
  {
    type: 'WEBCHAT',
    name: getChannelLabel('WEBCHAT'),
    description: 'ودجت محادثة للموقع يساعد الزوار على التواصل مع فريق الدعم والمبيعات.',
    provider: 'CRM Web Chat',
    icon: MessageSquareText,
    available: false,
  },
  {
    type: 'INSTAGRAM',
    name: getChannelLabel('INSTAGRAM'),
    description: 'إدارة رسائل Instagram والتعليقات من نفس تجربة خدمة العملاء.',
    provider: 'Meta Graph API',
    icon: Camera,
    available: false,
  },
  {
    type: 'TELEGRAM',
    name: getChannelLabel('TELEGRAM'),
    description: 'قناة مراسلة مستقبلية لاستقبال محادثات Telegram وتوجيهها للوكلاء.',
    provider: 'Telegram Bot API',
    icon: Send,
    available: false,
  },
  {
    type: 'SMS',
    name: getChannelLabel('SMS'),
    description: 'رسائل نصية قصيرة للتنبيهات والمتابعة والردود التشغيلية.',
    provider: 'SMS Provider',
    icon: Bot,
    available: false,
  },
  {
    type: 'VOICE',
    name: 'المكالمات الصوتية',
    description: 'أساس لقنوات الاتصال الصوتي وتسجيل سجل المكالمات وربطها بالعملاء.',
    provider: 'Voice Provider',
    icon: PhoneCall,
    available: false,
  },
]

const WHATSAPP_ONBOARDING_STEPS = [
  'تسجيل الدخول إلى Meta',
  'اختيار الحساب التجاري',
  'اختيار أو إضافة رقم واتساب',
  'تفويض تطبيق ذكاء بلا حدود',
  'اختبار الإرسال والاستقبال',
]

const initialOnboardingForm: OnboardingFormState = {
  organizationName: '',
  website: '',
  adminName: '',
  adminEmail: '',
  adminMobile: '',
  phoneToConnect: '',
  currentlyUsesBusinessApp: 'لا',
  operationMode: 'المنصة فقط',
  notes: '',
}

const emptyMetaSettings: MetaSettings = {
  appId: '',
  configId: '',
  redirectUri: '',
  webhookCallbackUrl: '',
  requiredPermissions: ['whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'],
  appReviewStatus: 'NOT_STARTED',
  embeddedSignupEnabled: false,
  appSecretConfigured: false,
  checklist: {
    techProviderVerified: false,
    appLive: false,
    appReviewApproved: false,
    webhookConfigured: false,
    embeddedSignupConfigured: false,
  },
  readiness: {
    ready: false,
    missing: [],
  },
}

function channelTone(status: string) {
  if (status === 'متصل') return 'success'
  if (status === 'قريبًا') return 'info'
  if (status === 'قيد المراجعة') return 'warning'
  return 'muted'
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('ar-SA') : 'لا يوجد'
}

function normalizeStatus(channel: PlannedChannel, record?: ChannelRecord, whatsappStatus?: WhatsAppStatus) {
  if (channel.type === 'WHATSAPP') {
    if (whatsappStatus?.cloudApiReady) return 'متصل'
    if (record?.status === 'CONNECTED') return 'متصل'
    if (record?.status === 'PENDING') return 'قيد التفعيل'
    if (record?.status === 'NEEDS_REVIEW') return 'قيد المراجعة'
    if (record?.status === 'FAILED') return 'يوجد خطأ'
    return 'غير متصل'
  }

  if (record?.status === 'CONNECTED') return 'متصل'
  if (record?.status === 'PENDING') return 'قيد التفعيل'
  return channel.available ? 'غير متصل' : 'قريبًا'
}

function getWhatsAppConnectionState(record?: ChannelRecord): WhatsAppConnectionState {
  if (record?.status === 'CONNECTED') return 'متصل'
  if (record?.status === 'PENDING') return 'قيد التفعيل'
  if (record?.status === 'NEEDS_REVIEW') return 'يحتاج مراجعة'
  if (record?.status === 'FAILED') return 'يوجد خطأ'
  return 'غير متصل'
}

function connectionTone(status: WhatsAppConnectionState) {
  if (status === 'متصل') return 'success'
  if (status === 'قيد التفعيل' || status === 'يحتاج مراجعة') return 'warning'
  if (status === 'يوجد خطأ') return 'danger'
  return 'muted'
}

function operationModeLabel(value?: string | null) {
  return value === 'APP_AND_PLATFORM' ? 'واتساب الجوال + المنصة' : 'المنصة فقط'
}

const appReviewLabels: Record<MetaSettings['appReviewStatus'], string> = {
  NOT_STARTED: 'لم يبدأ',
  IN_PROGRESS: 'قيد المراجعة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
}

function checklistLabel(key: keyof MetaSettings['checklist']) {
  const labels: Record<keyof MetaSettings['checklist'], string> = {
    appIdConfigured: 'Meta App ID Configured',
    configIdConfigured: 'Embedded Signup Configured',
    redirectUriConfigured: 'Redirect URI Configured',
    webhookUrlConfigured: 'Webhook URL Configured',
    techProviderVerified: 'Tech Provider Verified',
    appLive: 'App Live',
    appReviewApproved: 'App Review Approved',
    webhookConfigured: 'Webhook Configured',
    embeddedSignupConfigured: 'Embedded Signup Configured',
  }
  return labels[key]
}

export default function ChannelsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const { user } = useAuth()
  const { currentTenant, currentTenantId } = useTenant()
  const [channels, setChannels] = useState<ChannelRecord[]>([])
  const [tenantChannelState, setTenantChannelState] = useState<TenantChannelsResponse | null>(null)
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [metaSettings, setMetaSettings] = useState<MetaSettings>(emptyMetaSettings)
  const [metaForm, setMetaForm] = useState<MetaSettings>(emptyMetaSettings)
  const [metaStartPayload, setMetaStartPayload] = useState<MetaStartPayload | null>(null)
  const [isSignupModalOpen, setSignupModalOpen] = useState(false)
  const [isSavingMeta, setSavingMeta] = useState(false)
  const [isStartingMeta, setStartingMeta] = useState(false)
  const [isSubmittingOnboarding, setSubmittingOnboarding] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState<OnboardingFormState>(initialOnboardingForm)
  const tenantId = currentTenantId ?? 'default-tenant'
  const isDefaultTenant = tenantId === 'default-tenant'
  const isSuperAdmin = user?.platformRole === 'SUPER_ADMIN'

  function refreshMetaSettings() {
    return apiFetch(apiUrl('/meta/settings'))
      .then((response) => response.ok ? response.json() : emptyMetaSettings)
      .then((payload: MetaSettings) => {
        setMetaSettings(payload)
        setMetaForm(payload)
        return payload
      })
      .catch(() => {
        setMetaSettings(emptyMetaSettings)
        setMetaForm(emptyMetaSettings)
        return emptyMetaSettings
      })
  }

  function refreshTenantChannels() {
    return apiFetch(apiUrl('/tenant-channels'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload: TenantChannelsResponse | null) => {
        setTenantChannelState(payload)
        setChannels(payload?.items ?? [])
        return payload
      })
      .catch(() => {
        setTenantChannelState(null)
        setChannels([])
        return null
      })
  }

  useEffect(() => {
    let disposed = false
    setTenantChannelState(null)
    setChannels([])
    setWhatsappStatus(null)

    Promise.all([
      refreshTenantChannels(),
      refreshMetaSettings(),
      apiFetch(apiUrl('/whatsapp/status'))
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null),
    ]).then(([, , whatsapp]) => {
      if (disposed) return
      setWhatsappStatus(whatsapp)
    })

    return () => {
      disposed = true
    }
  }, [tenantId])

  const channelsByType = useMemo(() => {
    return channels.reduce<Record<string, ChannelRecord>>((acc, channel) => {
      if (channel.type) acc[channel.type] = channel
      return acc
    }, {})
  }, [channels])

  const whatsappRecord = channelsByType.WHATSAPP
  const whatsappConnectionState = getWhatsAppConnectionState(whatsappRecord)
  const onboardingSummary = tenantChannelState?.onboardingRequest
  const whatsappOperationMode = whatsappRecord?.config?.operationMode ?? onboardingSummary?.operationMode ?? 'PLATFORM_ONLY'
  const whatsappNumber = whatsappRecord?.config?.whatsappNumber ?? onboardingSummary?.whatsappNumber
  const showDefaultReady = isDefaultTenant && Boolean(tenantChannelState?.defaultWhatsAppReady || whatsappStatus?.cloudApiReady)
  const metaReady = metaSettings.readiness.ready

  async function saveMetaSettings() {
    setSavingMeta(true)
    try {
      const response = await apiFetch(apiUrl('/meta/settings'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: metaForm.appId,
          configId: metaForm.configId,
          redirectUri: metaForm.redirectUri,
          webhookCallbackUrl: metaForm.webhookCallbackUrl,
          requiredPermissions: metaForm.requiredPermissions,
          appReviewStatus: metaForm.appReviewStatus,
          embeddedSignupEnabled: metaForm.embeddedSignupEnabled,
          techProviderVerified: metaForm.checklist.techProviderVerified,
          appLive: metaForm.checklist.appLive,
          webhookConfigured: metaForm.checklist.webhookConfigured,
        }),
      })
      if (!response.ok) throw new Error('تعذر حفظ إعدادات Meta')
      const payload = await response.json()
      setMetaSettings(payload)
      setMetaForm(payload)
      showToast('تم حفظ إعدادات Meta كجاهزية Placeholder بدون أي أسرار.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ إعدادات Meta', 'warning')
    } finally {
      setSavingMeta(false)
    }
  }

  async function startMetaEmbeddedSignup() {
    setStartingMeta(true)
    try {
      const response = await apiFetch(apiUrl('/meta/embedded-signup/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })
      if (!response.ok) throw new Error('تعذر بدء جاهزية الربط عبر Meta')
      const payload = await response.json()
      setMetaStartPayload(payload)
      setSignupModalOpen(true)
    } catch (error) {
      setMetaStartPayload(null)
      setSignupModalOpen(true)
      showToast(error instanceof Error ? error.message : 'تعذر بدء جاهزية الربط عبر Meta', 'warning')
    } finally {
      setStartingMeta(false)
    }
  }

  async function submitOnboardingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmittingOnboarding(true)

    try {
      const response = await apiFetch(apiUrl(`/tenant-channels/${tenantId}/whatsapp/onboarding`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        tenantScopedBody: {
          whatsappNumber: onboardingForm.phoneToConnect,
          operationMode: onboardingForm.operationMode === 'واتساب الجوال + المنصة' ? 'APP_AND_PLATFORM' : 'PLATFORM_ONLY',
          notes: onboardingForm.notes,
        },
      })

      if (!response.ok) {
        throw new Error('تعذر حفظ طلب الربط حالياً')
      }

      showToast('تم استلام طلب ربط واتساب بدون حفظ أي رموز أو معرفات تقنية.', 'success')
      await refreshTenantChannels()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'تعذر حفظ طلب الربط حالياً', 'warning')
    } finally {
      setSubmittingOnboarding(false)
    }
  }

  async function handleRefreshStatus() {
    await refreshTenantChannels()
    showToast('تم تحديث حالة قنوات الشركة', 'success')
  }

  function handleTestConnection() {
    if (whatsappConnectionState === 'متصل') {
      showToast('اتصال واتساب جاهز لهذه الشركة بدون كشف أي بيانات تقنية.', 'success')
      return
    }
    showToast('لم يكتمل ربط واتساب لهذه الشركة بعد. استخدم بدء الربط عبر Meta عند جاهزية Embedded Signup.', 'info')
  }

  return (
    <div className="page-layout">
      <AppCard>
        <PageHeader
          title="القنوات"
          description="إدارة قنوات التواصل الخاصة بالشركة الحالية من مكان واحد."
          actions={(
            <AppButton
              variant="primary"
              onClick={() => showToast('سيتم تفعيل معالج إعداد القنوات تدريجياً ضمن إصدارات الربط القادمة', 'info')}
            >
              إضافة قناة
            </AppButton>
          )}
        />

        <section className="channels-tenant-strip" aria-label="نطاق الشركة">
          <span>الشركة الحالية</span>
          <strong>{tenantChannelState?.tenant?.displayName ?? tenantChannelState?.tenant?.name ?? currentTenant?.displayName ?? currentTenant?.name ?? tenantId}</strong>
          <small>{tenantId}</small>
        </section>

        <div className="channels-grid omnichannel-grid">
          {PLANNED_CHANNELS.map((channel) => {
            const record = channelsByType[channel.type]
            const Icon = channel.icon
            const status = normalizeStatus(channel, record, showDefaultReady ? whatsappStatus ?? undefined : undefined)
            const isWhatsapp = channel.type === 'WHATSAPP'

            return (
              <article key={channel.type} className={`channel-card omnichannel-card ${isWhatsapp ? 'whatsapp-channel-card' : ''}`}>
                <div className="channel-card-header">
                  <span className={`channel-icon ${status === 'متصل' ? 'is-ready' : ''}`} aria-hidden="true">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3>{channel.name}</h3>
                    <p>{channel.description}</p>
                  </div>
                </div>

                {isWhatsapp && (
                  <div className="whatsapp-onboarding-note">
                    <strong>ربط واتساب Business عبر Meta</strong>
                    <span>لا نطلب منك رموز API أو معرفات تقنية</span>
                    <small>حالة التفعيل: {whatsappConnectionState}</small>
                    <small>{metaReady ? 'جاهز لبدء الربط' : 'إعدادات Meta غير مكتملة'}</small>
                  </div>
                )}

                <dl className="meta-list channel-details-list">
                  <div>
                    <dt>الحالة</dt>
                    <dd><StatusBadge label={status} tone={channelTone(status)} /></dd>
                  </div>
                  <div>
                    <dt>المزود</dt>
                    <dd>{channel.provider}</dd>
                  </div>
                  {isWhatsapp ? (
                    <>
                      <div>
                        <dt>نوع التشغيل</dt>
                        <dd>{operationModeLabel(whatsappOperationMode)}</dd>
                      </div>
                      <div>
                        <dt>الرقم المطلوب ربطه</dt>
                        <dd>{whatsappNumber || 'غير محدد'}</dd>
                      </div>
                    </>
                  ) : null}
                  <div>
                    <dt>آخر مزامنة</dt>
                    <dd>{formatDate(record?.updatedAt ?? record?.connectedAt)}</dd>
                  </div>
                </dl>

                <div className="channel-actions">
                  {isWhatsapp ? (
                    <>
                      <AppButton
                        variant={showDefaultReady ? 'secondary' : 'primary'}
                        onClick={startMetaEmbeddedSignup}
                        disabled={isStartingMeta}
                      >
                        {isStartingMeta ? 'جار التحضير' : 'بدء ربط واتساب عبر Meta'}
                      </AppButton>
                      <AppButton variant="ghost" onClick={handleRefreshStatus}>
                        تحديث الحالة
                      </AppButton>
                      <AppButton variant="ghost" onClick={handleTestConnection}>
                        اختبار الاتصال
                      </AppButton>
                    </>
                  ) : (
                    <AppButton
                      disabled
                      variant="secondary"
                      title="قريبًا"
                    >
                      إعداد الربط
                    </AppButton>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <section className="whatsapp-onboarding-panel" aria-labelledby="whatsapp-onboarding-title">
          <div className="whatsapp-onboarding-head">
            <div>
              <span className="section-kicker">WhatsApp Business</span>
              <h2 id="whatsapp-onboarding-title">ربط واتساب Business عبر Meta</h2>
              <p>لن نطلب منك رموز API أو معرفات تقنية. يتم الربط عبر Meta بشكل آمن.</p>
              <p className={metaReady ? 'meta-ready-note is-ready' : 'meta-ready-note'}>
                {metaReady ? 'جاهز لبدء الربط' : 'إعدادات Meta غير مكتملة'}
              </p>
            </div>
            <AppButton variant="primary" onClick={startMetaEmbeddedSignup} disabled={isStartingMeta}>
              {isStartingMeta ? 'جار التحضير' : 'ابدأ الربط مع Meta'}
            </AppButton>
          </div>

          <div className="whatsapp-onboarding-layout">
            <article className="whatsapp-status-card">
              <div className="status-card-topline">
                <span>حالة الربط</span>
                <StatusBadge label={whatsappConnectionState} tone={connectionTone(whatsappConnectionState)} />
              </div>
              {showDefaultReady ? (
                <p className="whatsapp-default-connection">
                  اتصال واتساب الافتراضي نشط للبيئة الحالية
                </p>
              ) : null}
              <div className="whatsapp-status-options" aria-label="حالات ربط واتساب">
                {(['غير متصل', 'قيد التفعيل', 'متصل', 'يحتاج مراجعة', 'يوجد خطأ'] as WhatsAppConnectionState[]).map((state) => (
                  <StatusBadge key={state} label={state} tone={connectionTone(state)} />
                ))}
              </div>
              <dl className="meta-list channel-details-list">
                <div>
                  <dt>نوع التشغيل</dt>
                  <dd>{operationModeLabel(whatsappOperationMode)}</dd>
                </div>
                <div>
                  <dt>الرقم المطلوب ربطه</dt>
                  <dd>{whatsappNumber || 'غير محدد'}</dd>
                </div>
                <div>
                  <dt>Cloud API</dt>
                  <dd>{showDefaultReady ? 'جاهز للبيئة الافتراضية' : 'بانتظار ربط الشركة'}</dd>
                </div>
                <div>
                  <dt>Embedded Signup</dt>
                  <dd>{metaReady ? 'جاهز' : 'إعدادات Meta غير مكتملة'}</dd>
                </div>
                <div>
                  <dt>Webhook Engine</dt>
                  <dd>{whatsappStatus?.webhookEngineReady ? 'نشط' : 'غير نشط'}</dd>
                </div>
              </dl>
            </article>

            <article className="whatsapp-steps-card">
              <h3>خطوات الربط</h3>
              <ol className="whatsapp-onboarding-steps">
                {WHATSAPP_ONBOARDING_STEPS.map((step, index) => (
                  <li key={step}>
                    <span>{whatsappConnectionState === 'متصل' ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}</span>
                    <div>
                      <strong>{step}</strong>
                      <small>الخطوة {index + 1}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </div>

          {onboardingSummary ? (
            <article className="whatsapp-request-summary">
              <div className="form-section-title">
                <h3>ملخص طلب الاشتراك المرتبط</h3>
                <p>بيانات تشغيلية للشركة بدون أي رموز أو معرفات تقنية.</p>
              </div>
              <dl className="meta-list channel-details-list">
                <div>
                  <dt>اسم المؤسسة</dt>
                  <dd>{onboardingSummary.organizationName}</dd>
                </div>
                <div>
                  <dt>رقم واتساب المراد ربطه</dt>
                  <dd>{onboardingSummary.whatsappNumber || 'غير محدد'}</dd>
                </div>
                <div>
                  <dt>القنوات المطلوبة</dt>
                  <dd>{onboardingSummary.requestedChannels.map(getChannelLabel).join('، ') || 'غير محدد'}</dd>
                </div>
                <div>
                  <dt>Meta Business</dt>
                  <dd>{onboardingSummary.hasMetaBusiness ? 'نعم' : 'لا'}</dd>
                </div>
                <div>
                  <dt>WhatsApp Business App</dt>
                  <dd>{onboardingSummary.hasWhatsAppBusinessApp ? 'نعم' : 'لا'}</dd>
                </div>
                <div>
                  <dt>نوع التشغيل</dt>
                  <dd>{operationModeLabel(onboardingSummary.operationMode)}</dd>
                </div>
              </dl>
            </article>
          ) : null}

          <form className="whatsapp-onboarding-form" onSubmit={submitOnboardingRequest}>
            <div className="form-section-title">
              <h3>بيانات تشغيل غير حساسة</h3>
              <p>هذه البيانات تساعد فريق الإعداد على تجهيز تجربة الربط بدون طلب رموز تقنية.</p>
            </div>
            <div className="whatsapp-form-grid">
              <label>اسم المؤسسة<input value={onboardingForm.organizationName} onChange={(event) => setOnboardingForm((current) => ({ ...current, organizationName: event.target.value }))} /></label>
              <label>الموقع الإلكتروني<input value={onboardingForm.website} onChange={(event) => setOnboardingForm((current) => ({ ...current, website: event.target.value }))} /></label>
              <label>اسم المسؤول<input value={onboardingForm.adminName} onChange={(event) => setOnboardingForm((current) => ({ ...current, adminName: event.target.value }))} /></label>
              <label>البريد الإلكتروني<input type="email" value={onboardingForm.adminEmail} onChange={(event) => setOnboardingForm((current) => ({ ...current, adminEmail: event.target.value }))} /></label>
              <label>رقم جوال المسؤول<input value={onboardingForm.adminMobile} onChange={(event) => setOnboardingForm((current) => ({ ...current, adminMobile: event.target.value }))} /></label>
              <label>الرقم المراد ربطه<input value={onboardingForm.phoneToConnect} onChange={(event) => setOnboardingForm((current) => ({ ...current, phoneToConnect: event.target.value }))} /></label>
              <label>هل يستخدم الرقم حاليًا WhatsApp Business App؟
                <select value={onboardingForm.currentlyUsesBusinessApp} onChange={(event) => setOnboardingForm((current) => ({ ...current, currentlyUsesBusinessApp: event.target.value }))}>
                  <option>لا</option>
                  <option>نعم</option>
                  <option>غير متأكد</option>
                </select>
              </label>
              <label>نوع التشغيل المطلوب
                <select value={onboardingForm.operationMode} onChange={(event) => setOnboardingForm((current) => ({ ...current, operationMode: event.target.value }))}>
                  <option>المنصة فقط</option>
                  <option>واتساب الجوال + المنصة</option>
                </select>
              </label>
              <label className="whatsapp-form-wide">ملاحظات<textarea rows={4} value={onboardingForm.notes} onChange={(event) => setOnboardingForm((current) => ({ ...current, notes: event.target.value }))} /></label>
            </div>
            <div className="channel-actions">
              <AppButton variant="secondary" type="submit" disabled={isSubmittingOnboarding}>
                {isSubmittingOnboarding ? 'جار الحفظ' : 'حفظ طلب الربط'}
              </AppButton>
            </div>
          </form>
        </section>

        {isSuperAdmin ? (
          <section className="meta-settings-panel" aria-labelledby="meta-settings-title">
            <div className="form-section-title">
              <h2 id="meta-settings-title">إعدادات Meta</h2>
              <p>إعدادات جاهزية Meta Embedded Signup فقط. لا يتم عرض App Secret ولا تخزين رموز وصول في هذا الإصدار.</p>
            </div>
            <div className="meta-settings-grid">
              <label>Meta App ID<input value={metaForm.appId} onChange={(event) => setMetaForm((current) => ({ ...current, appId: event.target.value }))} /></label>
              <label>Embedded Signup Config ID<input value={metaForm.configId} onChange={(event) => setMetaForm((current) => ({ ...current, configId: event.target.value }))} /></label>
              <label>Redirect URI<input value={metaForm.redirectUri} onChange={(event) => setMetaForm((current) => ({ ...current, redirectUri: event.target.value }))} /></label>
              <label>Webhook Callback URL<input value={metaForm.webhookCallbackUrl} onChange={(event) => setMetaForm((current) => ({ ...current, webhookCallbackUrl: event.target.value }))} /></label>
              <label>App Review Status
                <select value={metaForm.appReviewStatus} onChange={(event) => setMetaForm((current) => ({ ...current, appReviewStatus: event.target.value as MetaSettings['appReviewStatus'] }))}>
                  {Object.entries(appReviewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="meta-settings-wide">Required Permissions<textarea rows={3} value={metaForm.requiredPermissions.join(', ')} onChange={(event) => setMetaForm((current) => ({ ...current, requiredPermissions: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} /></label>
            </div>
            <div className="meta-checklist">
              {(Object.keys(metaForm.checklist) as Array<keyof MetaSettings['checklist']>).map((key) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={key === 'appReviewApproved' ? metaForm.appReviewStatus === 'APPROVED' : Boolean(metaForm.checklist[key])}
                    disabled={key === 'appReviewApproved'}
                    onChange={(event) => setMetaForm((current) => ({ ...current, checklist: { ...current.checklist, [key]: event.target.checked } }))}
                  />
                  <span>{checklistLabel(key)}</span>
                </label>
              ))}
              <label>
                <input type="checkbox" checked={metaForm.embeddedSignupEnabled} onChange={(event) => setMetaForm((current) => ({ ...current, embeddedSignupEnabled: event.target.checked }))} />
                <span>Embedded Signup Enabled</span>
              </label>
            </div>
            <div className="channel-actions">
              <StatusBadge label={metaSettings.readiness.ready ? 'جاهز لبدء الربط' : 'إعدادات Meta غير مكتملة'} tone={metaSettings.readiness.ready ? 'success' : 'warning'} />
              <StatusBadge label={metaSettings.appSecretConfigured ? 'App Secret مضبوط في الخادم' : 'App Secret غير معروض'} tone="muted" />
              <AppButton variant="primary" onClick={saveMetaSettings} disabled={isSavingMeta}>{isSavingMeta ? 'جار الحفظ' : 'حفظ إعدادات Meta'}</AppButton>
            </div>
          </section>
        ) : null}
      </AppCard>

      {isSignupModalOpen && (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={() => setSignupModalOpen(false)}>
          <section className="platform-modal whatsapp-signup-modal" role="dialog" aria-modal="true" aria-labelledby="embedded-signup-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="embedded-signup-title">Meta Embedded Signup</h2>
            <p>{metaStartPayload?.message ?? 'سيتم تفعيل الربط المباشر عبر Meta Embedded Signup بعد إكمال إعدادات Meta App و App Review.'}</p>
            <p>لن نطلب من العميل رموز API أو معرفات تقنية. في هذه المرحلة لا نخزن رموز وصول أو معرفات تقنية.</p>
            <dl className="meta-list channel-details-list">
              <div><dt>حالة الجاهزية</dt><dd>{metaStartPayload?.ready ? 'جاهز لبدء الربط' : 'إعدادات Meta غير مكتملة'}</dd></div>
              <div><dt>Meta App ID</dt><dd>{metaStartPayload?.appId || metaSettings.appId || 'غير محدد'}</dd></div>
              <div><dt>Config ID</dt><dd>{metaStartPayload?.configId || metaSettings.configId || 'غير محدد'}</dd></div>
              <div><dt>Redirect URI</dt><dd>{metaStartPayload?.redirectUri || metaSettings.redirectUri || 'غير محدد'}</dd></div>
              <div><dt>State</dt><dd>{metaStartPayload?.state || 'سيتم إنشاؤه عند الجاهزية'}</dd></div>
            </dl>
            <div className="platform-modal-actions">
              <AppButton variant="primary" onClick={() => setSignupModalOpen(false)}>تم</AppButton>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
