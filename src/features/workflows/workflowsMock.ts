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
