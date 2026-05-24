export const rtl = {
  direction: 'rtl',
  inlineStart: 'right',
  inlineEnd: 'left',
} as const

export function logicalSide(side: 'start' | 'end') {
  return side === 'start' ? rtl.inlineStart : rtl.inlineEnd
}

