import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUiStore } from '../../stores/uiStore'
import { mockChannels, type ChannelStatus } from './channelsMock'

function channelTone(status: ChannelStatus) {
  if (status === 'متصل') return 'success'
  if (status === 'بحاجة لإعداد') return 'warning'
  return 'danger'
}

export default function ChannelsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const channels = mockChannels

  if (!channels.length) {
    return (
      <EmptyState
        title="لا توجد قنوات"
        message="أضف قنوات جديدة مثل واتساب أو البريد أو المحادثة المباشرة."
      />
    )
  }

  return (
    <div className="page-layout">
      <AppCard>
        <PageHeader
          title="القنوات"
          description="قنوات أومني تشانل جاهزة للربط لاحقاً مع مزودي WhatsApp والبريد والرسائل."
          actions={(
            <AppButton
              variant="primary"
              onClick={() => showToast('سيتم فتح معالج إضافة قناة عند ربط الخلفية', 'info')}
            >
              إضافة قناة
            </AppButton>
          )}
        />
        <div className="channels-grid">
          {channels.map((channel) => (
            <article key={channel.id} className="channel-card">
              <div className="channel-meta">
                <span>{channel.type}</span>
                <StatusBadge label={channel.status} tone={channelTone(channel.status)} />
              </div>
              <h3>{channel.label}</h3>
              <dl className="meta-list">
                <div>
                  <dt>آخر مزامنة</dt>
                  <dd>{new Date(channel.lastSyncAt).toLocaleString('ar-SA')}</dd>
                </div>
                <div>
                  <dt>الفريق المسؤول</dt>
                  <dd>{channel.assignedTeam}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </AppCard>
    </div>
  )
}
