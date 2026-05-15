export function formatRelativeTime(timestamp: number) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (diffMinutes < 1) return 'الآن'
  if (diffMinutes < 60) return `قبل ${diffMinutes} د`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `قبل ${hours} س`
  return `قبل ${Math.floor(hours / 24)} يوم`
}
