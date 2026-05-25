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
import { useUiStore } from '../../stores/uiStore'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { getCurrentTenantId } from '../../tenants/tenantUtils'
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

export default function ChannelsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const { currentTenant } = useTenant()
  const [channels, setChannels] = useState<ChannelRecord[]>([])
  const [tenantChannelState, setTenantChannelState] = useState<TenantChannelsResponse | null>(null)
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const [isSignupModalOpen, setSignupModalOpen] = useState(false)
  const [isSubmittingOnboarding, setSubmittingOnboarding] = useState(false)
  const [onboardingForm, setOnboardingForm] = useState<OnboardingFormState>(initialOnboardingForm)
  const tenantId = getCurrentTenantId() ?? 'default-tenant'
  const isDefaultTenant = tenantId === 'default-tenant'

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

    Promise.all([
      refreshTenantChannels(),
      apiFetch(apiUrl('/whatsapp/status'))
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null),
    ]).then(([, whatsapp]) => {
      if (disposed) return
      setWhatsappStatus(whatsapp)
    })

    return () => {
      disposed = true
    }
  }, [])

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
          <strong>{tenantChannelState?.tenant?.name ?? currentTenant?.name ?? tenantId}</strong>
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
                        onClick={() => setSignupModalOpen(true)}
                      >
                        بدء ربط واتساب عبر Meta
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
            </div>
            <AppButton variant="primary" onClick={() => setSignupModalOpen(true)}>
              ابدأ الربط مع Meta
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
                  <dd>{whatsappStatus?.embeddedSignupReady ? 'جاهز' : 'بانتظار App Review'}</dd>
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
      </AppCard>

      {isSignupModalOpen && (
        <div className="platform-modal-backdrop" role="presentation" onMouseDown={() => setSignupModalOpen(false)}>
          <section className="platform-modal whatsapp-signup-modal" role="dialog" aria-modal="true" aria-labelledby="embedded-signup-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="embedded-signup-title">Meta Embedded Signup</h2>
            <p>سيتم تفعيل الربط المباشر عبر Meta Embedded Signup بعد إكمال إعدادات Meta App و App Review.</p>
            <p>في هذه المرحلة نحضّر البيانات التشغيلية فقط ولا نخزن رموز وصول أو معرفات تقنية.</p>
            <div className="platform-modal-actions">
              <AppButton variant="primary" onClick={() => setSignupModalOpen(false)}>تم</AppButton>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
