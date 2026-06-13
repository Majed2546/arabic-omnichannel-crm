import type { RealtimeEventName } from '../../modules/realtime/eventBus'

export type WizardStepStatus = 'مكتمل' | 'قيد التنفيذ' | 'بانتظار'
export type CloudStatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'
export type QualityRating = 'Green' | 'Yellow' | 'Red'
export type WhatsAppConnectionState = 'غير متصل' | 'جاري الربط' | 'متصل' | 'يحتاج مراجعة' | 'فشل الاتصال'

export type WhatsAppWizardStep = {
  id: string
  title: string
  description: string
  status: WizardStepStatus
}

export type WhatsAppWorkspaceStatus = {
  label: string
  value: string
  tone: CloudStatusTone
}

export type WhatsAppSetting = {
  id: string
  label: string
  value: string
  masked?: boolean
}

export type WhatsAppTemplate = {
  id: string
  name: string
  category: string
  language: string
  approvalStatus: string
  tone: CloudStatusTone
}

export type WhatsAppWebhookEvent = {
  id: string
  name: 'message.received' | 'message.sent' | 'template.status' | 'conversation.started'
  mappedBusEvent: RealtimeEventName
  payload: string
  receivedAt: string
  status: string
  tone: CloudStatusTone
}

export type WhatsAppDiagnostic = {
  id: string
  label: string
  status: string
  detail: string
  tone: CloudStatusTone
}

export type WhatsAppBusinessSummary = {
  businessName: string
  wabaId: string
  phoneNumber: string
  qualityRating: QualityRating
  messagingTier: string
}

export type WhatsAppConnectionLog = {
  id: string
  label: string
  detail: string
  occurredAt: string
  tone: CloudStatusTone
}

export type WhatsAppQualityAlert = {
  id: string
  label: 'low quality' | 'rate limited' | 'restricted messaging'
  detail: string
  tone: CloudStatusTone
}

type WhatsAppOnboardingState = {
  progress: number
  connectionState: WhatsAppConnectionState
  businessNumber: string
  qualityRating: QualityRating
  statuses: WhatsAppWorkspaceStatus[]
  steps: WhatsAppWizardStep[]
}

export const whatsappOnboardingState: WhatsAppOnboardingState = {
  progress: 0,
  connectionState: 'غير متصل',
  businessNumber: '-',
  qualityRating: 'Red' satisfies QualityRating,
  statuses: [] satisfies WhatsAppWorkspaceStatus[],
  steps: [
    {
      id: 'connect-meta',
      title: 'تسجيل الدخول إلى Meta',
      description: 'فتح تجربة Embedded Signup عند تفعيل Meta SDK لاحقاً.',
      status: 'مكتمل',
    },
    {
      id: 'select-business',
      title: 'اختيار الحساب التجاري',
      description: 'اختيار WhatsApp Business Account المرتبط بالمستأجر الحالي.',
      status: 'مكتمل',
    },
    {
      id: 'select-number',
      title: 'اختيار رقم واتساب',
      description: 'تحديد رقم الإرسال والاستقبال وربطه بصندوق الوارد.',
      status: 'قيد التنفيذ',
    },
    {
      id: 'grant-permissions',
      title: 'منح الصلاحيات',
      description: 'تجهيز صلاحيات إدارة الرسائل والقوالب والويب هوك.',
      status: 'بانتظار',
    },
    {
      id: 'enable-webhook',
      title: 'تفعيل Webhook',
      description: 'تسجيل رابط الاستقبال والتحقق من رمز Webhook.',
      status: 'بانتظار',
    },
    {
      id: 'test-connection',
      title: 'اختبار الاتصال',
      description: 'إرسال رسالة اختبار وفحص الحالات قبل الإطلاق.',
      status: 'بانتظار',
    },
  ] satisfies WhatsAppWizardStep[],
}

export const whatsappConnectionStates: WhatsAppConnectionState[] = [
  'غير متصل',
  'جاري الربط',
  'متصل',
  'يحتاج مراجعة',
  'فشل الاتصال',
]

export const whatsappBusinessSummary: WhatsAppBusinessSummary = {
  businessName: '-',
  wabaId: '-',
  phoneNumber: '-',
  qualityRating: 'Red',
  messagingTier: '-',
}

export const whatsappSettings: WhatsAppSetting[] = []

export const whatsappTemplates: WhatsAppTemplate[] = []

export const whatsappWebhookEvents: WhatsAppWebhookEvent[] = []

export const whatsappDiagnostics: WhatsAppDiagnostic[] = []

export const whatsappConnectionLogs: WhatsAppConnectionLog[] = []

export const whatsappQualityAlerts: WhatsAppQualityAlert[] = []
