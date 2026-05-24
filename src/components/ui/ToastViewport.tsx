import { useEffect } from 'react'
import { useUiStore } from '../../stores/uiStore'

export function ToastViewport() {
  const { toast, dismissToast } = useUiStore()

  useEffect(() => {
    if (!toast) return
    const timeoutId = window.setTimeout(dismissToast, 3200)
    return () => window.clearTimeout(timeoutId)
  }, [dismissToast, toast])

  if (!toast) return null

  return (
    <div className={`toast-message ${toast.tone}`} role="status" aria-live="polite">
      <span>{toast.message}</span>
      <button type="button" onClick={dismissToast} aria-label="إغلاق التنبيه">
        ×
      </button>
    </div>
  )
}
