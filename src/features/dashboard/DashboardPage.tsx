import { useEffect, useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { StatCard } from '../../components/ui/StatCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { useTenant } from '../../tenants/useTenant'
import { apiFetch, apiUrl } from '../../lib/apiClient'
import { unwrapItems } from '../../lib/restUtils'

type DashboardConversation = {
  id: string
  status?: string
  priority?: string
  unreadCount?: number
  channel?: { type?: string } | null
  createdAt?: string
  updatedAt?: string
  lastMessageAt?: string | null
}

type DashboardNotification = {
  id: string
  priority?: string
  readAt?: string | null
}

type DashboardChannel = {
  id: string
  type?: string
  status?: string
}

async function fetchItems<T>(path: string): Promise<T[]> {
  const response = await apiFetch(apiUrl(path))
  if (!response.ok) return []
  return unwrapItems<T>(await response.json())
}

export default function DashboardPage() {
  const { currentTenant, currentTenantId } = useTenant()
  const [conversations, setConversations] = useState<DashboardConversation[]>([])
  const [notifications, setNotifications] = useState<DashboardNotification[]>([])
  const [channels, setChannels] = useState<DashboardChannel[]>([])

  useEffect(() => {
    let disposed = false
    setConversations([])
    setNotifications([])
    setChannels([])

    async function loadDashboard() {
      if (!currentTenantId) return
      const [nextConversations, nextNotifications, nextChannels] = await Promise.all([
        fetchItems<DashboardConversation>('/conversations?limit=100'),
        fetchItems<DashboardNotification>('/notifications'),
        fetchItems<DashboardChannel>('/channels'),
      ])

      if (disposed) return
      setConversations(nextConversations)
      setNotifications(nextNotifications)
      setChannels(nextChannels)
    }

    loadDashboard()
    const interval = window.setInterval(loadDashboard, 10_000)

    return () => {
      disposed = true
      window.clearInterval(interval)
    }
  }, [currentTenantId])

  const metrics = useMemo(() => {
    const activeConversations = conversations.filter((conversation) =>
      !['CLOSED', 'RESOLVED'].includes(conversation.status ?? ''),
    )
    const unreadMessages = conversations.reduce((total, conversation) => total + (conversation.unreadCount ?? 0), 0)
    const slaAlerts = conversations.filter((conversation) =>
      ['SLA_WARNING', 'SLA_BREACHED'].includes(conversation.status ?? ''),
    ).length
    const unreadNotifications = notifications.filter((notification) => !notification.readAt).length
    const connectedChannels = channels.filter((channel) =>
      ['ACTIVE', 'CONNECTED'].includes(channel.status ?? ''),
    ).length

    return {
      activeConversations: activeConversations.length,
      unreadMessages,
      slaAlerts,
      unreadNotifications,
      connectedChannels,
      inboxSummary: [
        { label: 'المحادثات', value: conversations.length },
        { label: 'غير مقروء', value: unreadMessages },
        { label: 'التنبيهات', value: unreadNotifications },
      ],
      channelsByType: Array.from(
        channels.reduce((counts, channel) => {
          const type = channel.type || 'غير محدد'
          counts.set(type, (counts.get(type) ?? 0) + 1)
          return counts
        }, new Map<string, number>()),
      ).map(([name, count]) => ({ name, count })),
      recentActivity: conversations
        .filter((conversation) => conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt)
        .slice(0, 5)
        .map((conversation) => ({
          id: conversation.id,
          text: `محادثة ${conversation.status ?? 'OPEN'}`,
          time: new Date(conversation.lastMessageAt ?? conversation.updatedAt ?? conversation.createdAt ?? Date.now()).toLocaleString('ar-SA'),
        })),
    }
  }, [channels, conversations, notifications])

  return (
    <div className="page-layout">
      <div className="dashboard-grid">
        <Card>
          <PageHeader
            title="مؤشرات الأداء الرئيسية"
            description={`نظرة خاصة بحساب ${currentTenant?.name ?? 'المستأجر الحالي'} على أداء الدعم والقنوات.`}
          />
          <div className="stats-grid">
            <StatCard value={metrics.activeConversations} label="محادثات نشطة" />
            <StatCard value={metrics.unreadMessages} label="رسائل غير مقروءة" />
            <StatCard value={metrics.slaAlerts} label="تنبيهات SLA" />
            <StatCard value={metrics.connectedChannels} label="قنوات متصلة" />
          </div>
        </Card>

        <Card>
          <PageHeader title="ملخص صندوق الوارد" />
          <ul className="summary-list">
            {metrics.inboxSummary.map((item) => (
              <li key={item.label}>
                <span>{item.value}</span>
                <small>{item.label}</small>
              </li>
            ))}
          </ul>
          <div className="chart-card">
            <h3>القنوات</h3>
            <ul className="channel-list">
              {metrics.channelsByType.map((channel) => (
                <li key={channel.name}>
                  <p>{channel.name}</p>
                  <div className="progress-bar">
                    <span style={{ width: metrics.connectedChannels ? `${Math.min(100, (channel.count / metrics.connectedChannels) * 100)}%` : '0%' }} />
                  </div>
                  <strong>{channel.count}</strong>
                </li>
              ))}
              {!metrics.channelsByType.length ? <li><p>لا توجد قنوات مسجلة</p><strong>0</strong></li> : null}
            </ul>
          </div>
        </Card>
      </div>

      <Card>
        <PageHeader title="النشاط الأخير" />
        <div className="activity-feed">
          {metrics.recentActivity.map((activity) => (
            <article key={activity.id} className="activity-item">
              <p>{activity.text}</p>
              <small>{activity.time}</small>
            </article>
          ))}
          {!metrics.recentActivity.length ? <p className="notification-empty">لا يوجد نشاط بعد تنظيف قاعدة البيانات.</p> : null}
        </div>
      </Card>
    </div>
  )
}
