import type { RealtimeEventName } from '../../modules/realtime/eventBus'

export type WorkflowTrigger =
  | 'رسالة جديدة'
  | 'محادثة غير مسندة'
  | 'تحذير SLA'
  | 'عميل VIP'
  | 'قناة واتساب'
  | 'خارج أوقات العمل'

export type WorkflowCondition =
  | 'القناة = واتساب'
  | 'الأولوية = عاجل'
  | 'الطابور = الدعم'
  | 'العميل VIP'
  | 'الوقت خارج الدوام'

export type WorkflowAction =
  | 'إسناد إلى وكيل'
  | 'نقل إلى طابور'
  | 'إرسال رد تلقائي'
  | 'تصعيد لمشرف'
  | 'إضافة وسم'
  | 'إنشاء تنبيه'

export type WorkflowStatus = 'نشط' | 'متوقف' | 'فشل' | 'قيد الاختبار'
export type WorkflowLogStatus = 'rule_triggered' | 'action_executed' | 'skipped' | 'failed'

export type WorkflowRule = {
  id: string
  name: string
  trigger: WorkflowTrigger
  condition: WorkflowCondition
  action: WorkflowAction
  status: WorkflowStatus
  lastRun: string
  enabled: boolean
  eventName: RealtimeEventName
}

export type WorkflowExecutionLog = {
  id: string
  ruleName: string
  status: WorkflowLogStatus
  detail: string
  occurredAt: string
}

export const workflowTriggers: WorkflowTrigger[] = [
  'رسالة جديدة',
  'محادثة غير مسندة',
  'تحذير SLA',
  'عميل VIP',
  'قناة واتساب',
  'خارج أوقات العمل',
]

export const workflowConditions: WorkflowCondition[] = [
  'القناة = واتساب',
  'الأولوية = عاجل',
  'الطابور = الدعم',
  'العميل VIP',
  'الوقت خارج الدوام',
]

export const workflowActions: WorkflowAction[] = [
  'إسناد إلى وكيل',
  'نقل إلى طابور',
  'إرسال رد تلقائي',
  'تصعيد لمشرف',
  'إضافة وسم',
  'إنشاء تنبيه',
]

export const workflowRules: WorkflowRule[] = [
  {
    id: 'wf-vip-sales',
    name: 'إسناد عملاء VIP للمبيعات',
    trigger: 'عميل VIP',
    condition: 'العميل VIP',
    action: 'إسناد إلى وكيل',
    status: 'نشط',
    lastRun: 'قبل 6 دقائق',
    enabled: true,
    eventName: 'conversation.escalated',
  },
  {
    id: 'wf-sla-10',
    name: 'تصعيد SLA بعد 10 دقائق',
    trigger: 'تحذير SLA',
    condition: 'الأولوية = عاجل',
    action: 'تصعيد لمشرف',
    status: 'قيد الاختبار',
    lastRun: 'قبل 12 دقيقة',
    enabled: true,
    eventName: 'conversation.sla_warning',
  },
  {
    id: 'wf-after-hours',
    name: 'رد تلقائي خارج أوقات العمل',
    trigger: 'خارج أوقات العمل',
    condition: 'الوقت خارج الدوام',
    action: 'إرسال رد تلقائي',
    status: 'نشط',
    lastRun: 'أمس 09:40 م',
    enabled: true,
    eventName: 'message.created',
  },
  {
    id: 'wf-whatsapp-support',
    name: 'تحويل واتساب للدعم',
    trigger: 'قناة واتساب',
    condition: 'القناة = واتساب',
    action: 'نقل إلى طابور',
    status: 'متوقف',
    lastRun: 'قبل يومين',
    enabled: false,
    eventName: 'conversation.queue_changed',
  },
]

export const workflowExecutionLogs: WorkflowExecutionLog[] = [
  {
    id: 'log-1',
    ruleName: 'إسناد عملاء VIP للمبيعات',
    status: 'rule_triggered',
    detail: 'تم التقاط محادثة VIP من صندوق الوارد.',
    occurredAt: 'الآن',
  },
  {
    id: 'log-2',
    ruleName: 'إسناد عملاء VIP للمبيعات',
    status: 'action_executed',
    detail: 'تم إسناد المحادثة إلى وكيل المبيعات المناوب.',
    occurredAt: 'قبل دقيقة',
  },
  {
    id: 'log-3',
    ruleName: 'تحويل واتساب للدعم',
    status: 'skipped',
    detail: 'تم تخطي القاعدة لأنها متوقفة حالياً.',
    occurredAt: 'قبل 8 دقائق',
  },
  {
    id: 'log-4',
    ruleName: 'تصعيد SLA بعد 10 دقائق',
    status: 'failed',
    detail: 'فشل التصعيد التجريبي لعدم وجود مشرف متاح.',
    occurredAt: 'قبل 15 دقيقة',
  },
]
