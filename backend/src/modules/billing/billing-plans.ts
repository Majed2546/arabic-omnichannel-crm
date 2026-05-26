import { TenantPlan } from '@prisma/client'

export type BillingPlanDefinition = {
  id: TenantPlan
  name: string
  maxUsers: number
  maxChannels: number
  monthlyConversationLimit: number
  monthlyMessageLimit: number
  features: string[]
}

export const BILLING_PLANS: Record<TenantPlan, BillingPlanDefinition> = {
  [TenantPlan.STARTER]: {
    id: TenantPlan.STARTER,
    name: 'Starter',
    maxUsers: 5,
    maxChannels: 2,
    monthlyConversationLimit: 1000,
    monthlyMessageLimit: 5000,
    features: ['صندوق وارد موحد', 'واتساب افتراضي', 'عملاء وتذاكر أساسية'],
  },
  [TenantPlan.PROFESSIONAL]: {
    id: TenantPlan.PROFESSIONAL,
    name: 'Professional',
    maxUsers: 25,
    maxChannels: 6,
    monthlyConversationLimit: 10000,
    monthlyMessageLimit: 50000,
    features: ['أتمتة أساسية', 'تقارير تشغيلية', 'مواعيد واجتماعات'],
  },
  [TenantPlan.ENTERPRISE]: {
    id: TenantPlan.ENTERPRISE,
    name: 'Enterprise',
    maxUsers: 1000,
    maxChannels: 100,
    monthlyConversationLimit: 1000000,
    monthlyMessageLimit: 5000000,
    features: ['حدود موسعة', 'جاهزية تعدد الشركات', 'دعم تكاملات متقدم'],
  },
}

export function getBillingPlan(plan: TenantPlan) {
  return BILLING_PLANS[plan] ?? BILLING_PLANS[TenantPlan.STARTER]
}
