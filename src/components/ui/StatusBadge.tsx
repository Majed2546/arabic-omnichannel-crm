type StatusBadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'vip'

type StatusBadgeProps = {
  label: string
  tone?: StatusBadgeTone
}

export function StatusBadge({ label, tone = 'muted' }: StatusBadgeProps) {
  return <span className={`status-badge ${tone}`}>{label}</span>
}
