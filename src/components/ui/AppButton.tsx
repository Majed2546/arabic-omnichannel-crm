import type { ButtonHTMLAttributes, ReactNode } from 'react'

type AppButtonVariant = 'primary' | 'secondary' | 'ghost'

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: AppButtonVariant
}

export function AppButton({ children, className = '', variant = 'secondary', type = 'button', ...props }: AppButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`app-button app-button-${variant} control-safe text-safe ${className}`.trim()}
    >
      {children}
    </button>
  )
}

