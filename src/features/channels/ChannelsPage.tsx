import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Camera,
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
import { unwrapItems } from '../../lib/restUtils'
import { getCurrentTenantId } from '../../tenants/tenantUtils'

type ChannelType = 'WHATSAPP' | 'EMAIL' | 'WEBCHAT' | 'INSTAGRAM' | 'TELEGRAM' | 'SMS' | 'VOICE'

type ChannelRecord = {
  id: string
  tenantId?: string
  tenant_id?: string
  type?: string
  status?: string
  name?: string
  label?: string
  connectedAt?: string | null
  updatedAt?: string | null
}

type WhatsAppStatus = {
  cloudApiReady?: boolean
  embeddedSignupReady?: boolean
  webhookEngineReady?: boolean
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
    name: 'واتساب Business',
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
    name: 'الدردشة المباشرة',
    description: 'ودجت محادثة للموقع يساعد الزوار على التواصل مع فريق الدعم والمبيعات.',
    provider: 'CRM Web Chat',
    icon: MessageSquareText,
    available: false,
  },
  {
    type: 'INSTAGRAM',
    name: 'Instagram',
    description: 'إدارة رسائل Instagram والتعليقات من نفس تجربة خدمة العملاء.',
    provider: 'Meta Graph API',
    icon: Camera,
    available: false,
  },
  {
    type: 'TELEGRAM',
    name: 'Telegram',
    description: 'قناة مراسلة مستقبلية لاستقبال محادثات Telegram وتوجيهها للوكلاء.',
    provider: 'Telegram Bot API',
    icon: Send,
    available: false,
  },
  {
    type: 'SMS',
    name: 'SMS',
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
    if (record?.status === 'NEEDS_REVIEW') return 'قيد المراجعة'
    return 'غير متصل'
  }

  if (record?.status === 'CONNECTED') return 'متصل'
  return channel.available ? 'غير متصل' : 'قريبًا'
}

export default function ChannelsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const [channels, setChannels] = useState<ChannelRecord[]>([])
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null)
  const tenantId = getCurrentTenantId() ?? 'default-tenant'

  useEffect(() => {
    let disposed = false

    Promise.all([
      apiFetch(apiUrl('/channels'))
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => unwrapItems<ChannelRecord>(payload))
        .catch(() => []),
      apiFetch(apiUrl('/whatsapp/status'))
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null),
    ]).then(([channelItems, whatsapp]) => {
      if (disposed) return
      setChannels(channelItems)
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
          <strong>{tenantId}</strong>
        </section>

        <div className="channels-grid omnichannel-grid">
          {PLANNED_CHANNELS.map((channel) => {
            const record = channelsByType[channel.type]
            const Icon = channel.icon
            const status = normalizeStatus(channel, record, whatsappStatus ?? undefined)
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
                  <div>
                    <dt>آخر مزامنة</dt>
                    <dd>{formatDate(record?.updatedAt ?? record?.connectedAt)}</dd>
                  </div>
                </dl>

                <div className="channel-actions">
                  {isWhatsapp ? (
                    <AppButton
                      variant={whatsappStatus?.cloudApiReady ? 'secondary' : 'primary'}
                      onClick={() => showToast('سيتم فتح الربط المدمج مع Meta عند تفعيل Embedded Signup', 'info')}
                    >
                      ابدأ الربط مع Meta
                    </AppButton>
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
      </AppCard>
    </div>
  )
}
