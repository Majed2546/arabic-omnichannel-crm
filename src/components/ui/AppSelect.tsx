import type { SelectHTMLAttributes } from 'react'

type AppSelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function AppSelect({ className = '', children, ...props }: AppSelectProps) {
  return (
    <select {...props} className={`app-select control-safe text-safe ${className}`.trim()}>
      {children}
    </select>
  )
}

