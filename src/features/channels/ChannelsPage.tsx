import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useUiStore } from '../../stores/uiStore'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { unwrapItems } from '../../lib/restUtils'

type ChannelRecord = {
  id: string
  type?: string
  status?: string
  name?: string
  label?: string
  connectedAt?: string | null
  updatedAt?: string | null
}

function channelTone(status?: string) {
  if (status === 'ACTIVE' || status === 'CONNECTED') return 'success'
  if (status === 'PENDING' || status === 'NEEDS_SETUP') return 'warning'
  return 'danger'
}

export default function ChannelsPage() {
  const showToast = useUiStore((state) => state.showToast)
  const [channels, setChannels] = useState<ChannelRecord[]>([])

  useEffect(() => {
    let disposed = false

    apiFetch(apiUrl('/channels'))
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!disposed) setChannels(unwrapItems<ChannelRecord>(payload))
      })
      .catch(() => {
        if (!disposed) setChannels([])
      })

    return () => {
      disposed = true
    }
  }, [])

  if (!channels.length) {
    return (
      <EmptyState
        title="لا توجد قنوات"
        message="لا توجد قنوات راجعة من واجهة REST حالياً."
      />
    )
  }

  return (
    <div className="page-layout">
      <AppCard>
        <PageHeader
          title="القنوات"
          description="القنوات المسجلة في backend."
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
                <span>{channel.type ?? '-'}</span>
                <StatusBadge label={channel.status ?? 'UNKNOWN'} tone={channelTone(channel.status)} />
              </div>
              <h3>{channel.label ?? channel.name ?? channel.id}</h3>
              <dl className="meta-list">
                <div>
                  <dt>تاريخ الربط</dt>
                  <dd>{channel.connectedAt ? new Date(channel.connectedAt).toLocaleString('ar-SA') : '-'}</dd>
                </div>
                <div>
                  <dt>آخر تحديث</dt>
                  <dd>{channel.updatedAt ? new Date(channel.updatedAt).toLocaleString('ar-SA') : '-'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </AppCard>
    </div>
  )
}
