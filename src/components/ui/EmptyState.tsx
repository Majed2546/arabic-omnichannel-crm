type EmptyStateProps = {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">i</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {actionLabel && onAction ? (
        <button type="button" className="empty-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
