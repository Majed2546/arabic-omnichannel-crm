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

type WhatsAppOnboardingMock = {
  progress: number
  connectionState: WhatsAppConnectionState
  businessNumber: string
  qualityRating: QualityRating
  statuses: WhatsAppWorkspaceStatus[]
  steps: WhatsAppWizardStep[]
}

export const whatsappOnboardingMock: WhatsAppOnboardingMock = {
  progress: 60,
  connectionState: 'يحتاج مراجعة',
  businessNumber: '+966 55 123 4567',
  qualityRating: 'Green' satisfies QualityRating,
  statuses: [
    { label: 'حالة الاتصال', value: 'متصل تجريبياً', tone: 'success' },
    { label: 'تحقق النشاط التجاري', value: 'قيد المراجعة', tone: 'warning' },
    { label: 'Webhook', value: 'جاهز للاستقبال', tone: 'success' },
    { label: 'حالة الرقم', value: 'نشط', tone: 'success' },
    { label: 'تقييم الجودة', value: 'Green', tone: 'success' },
    { label: 'حالة القوالب', value: '3 معتمدة', tone: 'info' },
  ] satisfies WhatsAppWorkspaceStatus[],
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
  businessName: 'شركة الرؤيا للتجارة',
  wabaId: '935014620118422',
  phoneNumber: '+966 55 123 4567',
  qualityRating: 'Green',
  messagingTier: '1K محادثة / 24 ساعة',
}

export const whatsappSettings: WhatsAppSetting[] = [
  { id: 'access-token', label: 'Access Token', value: 'EAAB...placeholder', masked: true },
  { id: 'phone-number-id', label: 'Phone Number ID', value: '104928374650112' },
  { id: 'business-account-id', label: 'Business Account ID', value: '935014620118422' },
  { id: 'webhook-token', label: 'Webhook Verify Token', value: 'omni-chat-wa-verify', masked: true },
  { id: 'api-version', label: 'API Version', value: 'v21.0' },
]

export const whatsappTemplates: WhatsAppTemplate[] = [
  { id: 'tpl-welcome', name: 'welcome_support_ar', category: 'خدمة العملاء', language: 'ar', approvalStatus: 'معتمد', tone: 'success' },
  { id: 'tpl-sla', name: 'sla_followup_ar', category: 'تنبيه', language: 'ar', approvalStatus: 'قيد المراجعة', tone: 'warning' },
  { id: 'tpl-otp', name: 'login_otp_ar', category: 'مصادقة', language: 'ar', approvalStatus: 'معتمد', tone: 'success' },
  { id: 'tpl-promo', name: 'vip_offer_ar', category: 'تسويقي', language: 'ar', approvalStatus: 'مرفوض', tone: 'danger' },
]

export const whatsappWebhookEvents: WhatsAppWebhookEvent[] = [
  {
    id: 'evt-1',
    name: 'message.received',
    mappedBusEvent: 'message.created',
    payload: 'رسالة واردة من واتساب إلى صندوق الوارد الموحد.',
    receivedAt: 'الآن',
    status: 'تمت المعالجة',
    tone: 'success',
  },
  {
    id: 'evt-2',
    name: 'message.sent',
    mappedBusEvent: 'message.created',
    payload: 'تأكيد إرسال رسالة صادرة من وكيل الدعم.',
    receivedAt: 'قبل 4 دقائق',
    status: 'تمت المعالجة',
    tone: 'success',
  },
  {
    id: 'evt-3',
    name: 'template.status',
    mappedBusEvent: 'conversation.status_changed',
    payload: 'تحديث حالة قالب من Meta Business Manager.',
    receivedAt: 'قبل 18 دقيقة',
    status: 'بانتظار مراجعة',
    tone: 'warning',
  },
  {
    id: 'evt-4',
    name: 'conversation.started',
    mappedBusEvent: 'conversation.created',
    payload: 'بدء محادثة واتساب جديدة وإرسالها لمفهوم صندوق الوارد.',
    receivedAt: 'قبل 31 دقيقة',
    status: 'تم إنشاء محادثة',
    tone: 'info',
  },
]

export const whatsappDiagnostics: WhatsAppDiagnostic[] = [
  { id: 'api', label: 'API reachable', status: 'ناجح', detail: 'نقطة Graph API جاهزة للفحص عند الربط.', tone: 'success' },
  { id: 'webhook', label: 'webhook active', status: 'نشط', detail: 'مسار الاستقبال محفوظ كمعمارية مؤقتة.', tone: 'success' },
  { id: 'token', label: 'token valid', status: 'قيد الاختبار', detail: 'التحقق الفعلي ينتظر خدمة الخلفية.', tone: 'warning' },
  { id: 'rate-limit', label: 'rate limit', status: 'سليم', detail: 'لا توجد حدود مستهلكة في بيانات المحاكاة.', tone: 'info' },
]

export const whatsappConnectionLogs: WhatsAppConnectionLog[] = [
  { id: 'log-token', label: 'token refreshed', detail: 'تم تحديث رمز الوصول في نموذج المحاكاة.', occurredAt: 'قبل 3 دقائق', tone: 'success' },
  { id: 'log-webhook', label: 'webhook verified', detail: 'تمت مطابقة verify token مع مسار الاستقبال المؤقت.', occurredAt: 'قبل 8 دقائق', tone: 'success' },
  { id: 'log-test', label: 'message test success', detail: 'نجح سيناريو رسالة الاختبار داخل الواجهة فقط.', occurredAt: 'قبل 12 دقيقة', tone: 'info' },
  { id: 'log-template', label: 'template sync', detail: 'تمت محاكاة مزامنة القوالب من Meta Business.', occurredAt: 'قبل 26 دقيقة', tone: 'warning' },
]

export const whatsappQualityAlerts: WhatsAppQualityAlert[] = [
  { id: 'quality-low', label: 'low quality', detail: 'تنبيه معماري عند انخفاض تقييم جودة الرقم.', tone: 'warning' },
  { id: 'quality-rate', label: 'rate limited', detail: 'إظهار قيود المعدل قبل إرسال دفعات كبيرة.', tone: 'info' },
  { id: 'quality-restricted', label: 'restricted messaging', detail: 'حالة حرجة عند تقييد مراسلة العملاء من Meta.', tone: 'danger' },
]
