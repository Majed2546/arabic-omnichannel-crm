export function isRtlLocale(locale: string) {
  return /^(ar|fa|he|ur)(-|$)/i.test(locale)
}

export function rtlSafeText(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

