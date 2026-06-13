import type { ActivityRecord } from './notificationTypes'
import { formatRelativeTime } from './notificationUtils'

type ActivityEventProps = {
  event: ActivityRecord
}

export function ActivityEventCard({ event }: ActivityEventProps) {
  return (
    <article className={`activity-event ${event.priority}`}>
      <span className="activity-event-icon">{event.icon}</span>
      <div>
        <strong>{event.title}</strong>
        <p>{event.description}</p>
        <footer>
          <span>{event.category}</span>
          <span>{event.source}</span>
          <time>{formatRelativeTime(event.timestamp)}</time>
        </footer>
      </div>
    </article>
  )
}

export const ActivityEvent = ActivityEventCard
