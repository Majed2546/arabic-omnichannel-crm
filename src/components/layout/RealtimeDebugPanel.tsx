import { useRealtimeStore } from '../../modules/realtime'

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(timestamp))
}

export function RealtimeDebugPanel() {
  const latestEvents = useRealtimeStore((state) => state.latestEvents)

  return (
    <div className="panel-card realtime-debug-panel card-safe">
      <div className="activity-feed-title">
        <div>
          <strong>أحداث مباشرة</strong>
          <small>Event debug</small>
        </div>
        <span>{latestEvents.length}</span>
      </div>
      <div className="realtime-event-list">
        {latestEvents.length ? latestEvents.slice(0, 5).map((event) => (
          <article key={event.id}>
            <strong>{event.type}</strong>
            <small>{formatTime(event.timestamp)} · {event.source}</small>
          </article>
        )) : (
          <p className="notification-empty">بانتظار أول حدث مباشر</p>
        )}
      </div>
    </div>
  )
}
