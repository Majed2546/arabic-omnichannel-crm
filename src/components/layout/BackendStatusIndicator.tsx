import { useEffect, useState } from 'react'
import { apiFetch, apiUrl } from '../../lib/apiClient'

type ApiStatus = 'pending' | 'success' | 'error'

export function BackendStatusIndicator() {
  const [status, setStatus] = useState<ApiStatus>('pending')

  useEffect(() => {
    let disposed = false

    apiFetch(apiUrl('/health'))
      .then((response) => {
        if (disposed) return
        setStatus(response.ok ? 'success' : 'error')
      })
      .catch(() => {
        if (!disposed) setStatus('error')
      })

    return () => {
      disposed = true
    }
  }, [])

  const label = status === 'success'
    ? 'REST متصل'
    : status === 'pending'
      ? 'فحص REST'
      : 'REST غير متصل'

  return (
    <span
      className={`topbar-control api-status control-safe ${status}`}
      title={apiUrl('/health')}
      aria-live="polite"
    >
      <span aria-hidden="true" />
      {label}
    </span>
  )
}
