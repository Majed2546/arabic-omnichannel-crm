export const CHANNEL_LABELS: Record<string, string> = {
  WHATSAPP: 'واتساب',
  EMAIL: 'البريد الإلكتروني',
  WEBCHAT: 'دردشة الموقع',
  INSTAGRAM: 'إنستغرام',
  TELEGRAM: 'تيليجرام',
  SMS: 'رسائل SMS',
  VOICE: 'المكالمات الصوتية',
  X: 'منصة X',
  WhatsApp: 'واتساب',
  Email: 'البريد الإلكتروني',
  'Web Chat': 'دردشة الموقع',
  Telegram: 'تيليجرام',
}

export function getChannelLabel(channelType?: string | null) {
  if (!channelType) return 'غير محدد'
  return CHANNEL_LABELS[channelType] ?? channelType
}
