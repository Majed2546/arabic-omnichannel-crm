export const breakpoints = {
  mobile: 720,
  tablet: 900,
  desktop: 1200,
  wide: 1380,
} as const

export type BreakpointName = keyof typeof breakpoints

export function mediaQuery(name: BreakpointName) {
  return `(max-width: ${breakpoints[name]}px)`
}

