import { useRealtimeStore } from '../../modules/realtime'

function stateClass(connectionState: string) {
  if (connectionState === 'متصل') return 'success'
  if (connectionState === 'يعيد الاتصال') return 'pending'
  return 'error'
}

export function RealtimeHealthIndicator() {
  const connectionState = useRealtimeStore((state) => state.connectionState)
  const reconnectAttempts = useRealtimeStore((state) => state.reconnectAttempts)

  return (
    <span
      className={`topbar-control realtime-health control-safe ${stateClass(connectionState)}`}
      title="Socket.io / Redis pub/sub / NestJS gateway placeholder"
      aria-live="polite"
    >
      <span aria-hidden="true" />
      مباشر: {connectionState}
      {reconnectAttempts > 0 ? ` (${reconnectAttempts})` : ''}
    </span>
  )
}
