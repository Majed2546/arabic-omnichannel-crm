export function unwrapItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (typeof payload !== 'object' || payload === null) return []

  const record = payload as Record<string, unknown>
  if (Array.isArray(record.items)) return record.items as T[]
  if (Array.isArray(record.data)) return record.data as T[]
  if (Array.isArray(record.results)) return record.results as T[]

  return []
}
