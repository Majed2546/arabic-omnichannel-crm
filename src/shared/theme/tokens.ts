export const themeTokens = {
  color: {
    background: '#050916',
    surface: '#0e172f',
    surfaceStrong: '#0b1224',
    surfaceMuted: '#15203f',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#e2e8f0',
    muted: '#94a3b8',
    accent: '#7c3aed',
    accentStrong: '#4338ca',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  radius: {
    control: '16px',
    card: '24px',
    pill: '999px',
  },
  spacing: {
    pageDesktop: '28px',
    pageTablet: '20px',
    pageMobile: '16px',
    card: '28px',
    gap: '24px',
  },
  typography: {
    arabicFont: "'Cairo', 'Segoe UI', sans-serif",
    bodySize: '16px',
    lineHeight: '1.8',
    titleSize: '32px',
  },
} as const

export type ThemeTokens = typeof themeTokens

