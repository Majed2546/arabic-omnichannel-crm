type ErrorStateProps = {
  title?: string
  message?: string
}

export function ErrorState({
  title = 'حدث خطأ',
  message = 'تعذر تحميل البيانات. يرجى المحاولة مرة أخرى لاحقًا.',
}: ErrorStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⚠️</div>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  )
}
