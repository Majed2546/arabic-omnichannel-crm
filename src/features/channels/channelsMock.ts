export type ChannelStatus = 'متصل' | 'بحاجة لإعداد' | 'متوقف'

export type OmnichannelChannel = {
  id: string
  type: 'WhatsApp' | 'Email' | 'Web Chat' | 'SMS'
  label: string
  status: ChannelStatus
  lastSyncAt: string
  assignedTeam: string
}

export const mockChannels: OmnichannelChannel[] = [
  {
    id: 'whatsapp-main',
    type: 'WhatsApp',
    label: 'واتساب المبيعات والدعم',
    status: 'متصل',
    lastSyncAt: '2026-05-15T00:42:00+03:00',
    assignedTeam: 'فريق واتساب',
  },
  {
    id: 'email-support',
    type: 'Email',
    label: 'support@example.com',
    status: 'متصل',
    lastSyncAt: '2026-05-15T00:38:00+03:00',
    assignedTeam: 'فريق الدعم',
  },
  {
    id: 'web-chat',
    type: 'Web Chat',
    label: 'دردشة الموقع',
    status: 'بحاجة لإعداد',
    lastSyncAt: '2026-05-14T22:05:00+03:00',
    assignedTeam: 'فريق العمليات',
  },
  {
    id: 'sms-alerts',
    type: 'SMS',
    label: 'رسائل التنبيهات',
    status: 'متوقف',
    lastSyncAt: '2026-05-13T17:20:00+03:00',
    assignedTeam: 'فريق المنصة',
  },
]
