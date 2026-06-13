export const designTokens = {
  colors: {
    background: '#050916',
    surface: '#0e172f',
    surfaceStrong: '#0b1224',
    surfaceMuted: '#15203f',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    accent: '#7c3aed',
    accentStrong: '#4338ca',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  spacing: {
    xs: '6px',
    sm: '10px',
    md: '16px',
    lg: '24px',
    xl: '28px',
    pageDesktop: '28px',
    pageTablet: '20px',
    pageMobile: '16px',
    card: '28px',
    gap: '24px',
  },
  radius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    pill: '999px',
  },
  shadows: {
    card: '0 20px 60px rgba(5, 9, 22, 0.45)',
    focus: '0 0 0 3px rgba(124, 58, 237, 0.35)',
  },
  typography: {
    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    bodySize: '16px',
    bodyLineHeight: '1.8',
    compactLineHeight: '1.7',
    pageTitle: '32px',
    sectionTitle: '1.35rem',
    label: '0.86rem',
  },
  breakpoints: {
    mobile: 720,
    tablet: 900,
    desktop: 1200,
    wide: 1380,
  },
} as const

export type DesignTokens = typeof designTokens

