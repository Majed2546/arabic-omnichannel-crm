type LoadingStateProps = {
  message?: string
}

export function LoadingState({ message = 'جاري التحميل…' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-card">
        <div className="loading-line short" />
        <div className="loading-line" />
        <div className="loading-line" />
      </div>
      <p>{message}</p>
    </div>
  )
}
