import type { ReactNode } from 'react'

type AppCardProps = {
  children: ReactNode
  className?: string
  as?: 'section' | 'article' | 'aside' | 'div'
}

export function AppCard({ children, className = '', as: Component = 'section' }: AppCardProps) {
  return <Component className={`panel-panel app-card card-safe ${className}`.trim()}>{children}</Component>
}

