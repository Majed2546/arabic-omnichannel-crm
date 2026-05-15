import type { ReactNode } from 'react'

type TopbarControlProps = {
  children: ReactNode
  className?: string
}

export function TopbarControl({ children, className = '' }: TopbarControlProps) {
  return <div className={`topbar-control control-safe ${className}`.trim()}>{children}</div>
}
