import { useMemo, useState } from 'react'
import { AppButton } from '../../components/ui/AppButton'
import { AppCard } from '../../components/ui/AppCard'
import { PageHeader } from '../../components/layout/PageHeader'
import { ActivityEventCard } from './ActivityEvent'
import { useNotificationStore } from './notificationStore'
import type { NotificationCategory, NotificationPriority } from './notificationTypes'

type ActivityFilter = 'all' | NotificationPriority | NotificationCategory

const filterLabels: Record<ActivityFilter, string> = {
  all: 'الكل',
  info: 'معلومات',
  warning: 'تحذيرات',
  critical: 'حرج',
  conversation: 'محادثات',
  sla: 'SLA',
  queue: 'القوائم',
  agent: 'الوكلاء',
  supervisor: 'المشرفون',
  automation: 'الأتمتة',
  webhook: 'Webhook',
  whatsapp: 'واتساب',
}

const filters: ActivityFilter[] = [
  'all',
  'critical',
  'warning',
  'conversation',
  'sla',
  'queue',
  'automation',
  'webhook',
  'whatsapp',
]

function groupLabel(timestamp: number) {
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60_000)
  if (diffMinutes < 60) return 'آخر ساعة'
  if (diffMinutes < 24 * 60) return 'اليوم'
  return 'أقدم'
}

export default function ActivityFeedPage() {
  const activities = useNotificationStore((state) => state.activities)
  const clearAll = useNotificationStore((state) => state.clearAll)
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all')

  const filteredActivities = useMemo(
    () => activities.filter((event) =>
      activeFilter === 'all' || event.priority === activeFilter || event.category === activeFilter,
    ),
    [activeFilter, activities],
  )

  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce<Record<string, typeof filteredActivities>>((groups, event) => {
      const label = groupLabel(event.timestamp)
      return {
        ...groups,
        [label]: [...(groups[label] ?? []), event],
      }
    }, {})
  }, [filteredActivities])

  return (
    <div className="page-layout">
      <AppCard>
        <PageHeader
          title="سجل النشاط التشغيلي"
          description="Timeline مباشر للتنبيهات، القنوات، SLA، الأتمتة، وحالة واتساب."
          actions={<AppButton variant="ghost" onClick={clearAll}>مسح السجل</AppButton>}
        />
        <div className="activity-filter-bar">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={activeFilter === filter ? 'active' : ''}
              onClick={() => setActiveFilter(filter)}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      </AppCard>

      <AppCard>
        <div className="activity-timeline">
          {Object.entries(groupedActivities).map(([label, events]) => (
            <section key={label}>
              <h3>{label}</h3>
              <div className="activity-timeline-list">
                {events.map((event) => <ActivityEventCard key={event.id} event={event} />)}
              </div>
            </section>
          ))}
          {!filteredActivities.length ? (
            <p className="notification-empty">لا توجد أحداث مطابقة لهذا الفلتر.</p>
          ) : null}
        </div>
      </AppCard>
    </div>
  )
}
