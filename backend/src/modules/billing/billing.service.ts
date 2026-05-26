import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, TenantPlan, TenantStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { BILLING_PLANS, getBillingPlan } from './billing-plans'

type UsageScope = {
  tenantId?: string
  isPlatform: boolean
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  listPlans() {
    return Object.values(BILLING_PLANS)
  }

  async currentSubscription(scope: UsageScope) {
    if (scope.isPlatform && !scope.tenantId) {
      const tenants = await this.prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
      return { platform: true, tenants: tenants.map((tenant) => this.toSubscription(tenant)) }
    }

    if (!scope.tenantId) throw new ForbiddenException('Tenant access denied')
    const tenant = await this.findTenant(scope.tenantId)
    return { platform: false, tenant: this.toSubscription(tenant) }
  }

  async usage(scope: UsageScope) {
    if (scope.isPlatform && !scope.tenantId) {
      const tenants = await this.prisma.tenant.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' } })
      const items = await Promise.all(tenants.map((tenant) => this.tenantUsage(tenant.id)))
      return { platform: true, tenants: items }
    }

    if (!scope.tenantId) throw new ForbiddenException('Tenant access denied')
    return { platform: false, tenant: await this.tenantUsage(scope.tenantId) }
  }

  async updateTenantPlan(tenantId: string, plan: TenantPlan, subscriptionEnd?: string) {
    const definition = getBillingPlan(plan)
    await this.findTenant(tenantId)
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        maxUsers: tenantId === 'default-tenant' ? Math.max(definition.maxUsers, 1000) : definition.maxUsers,
        maxChannels: tenantId === 'default-tenant' ? Math.max(definition.maxChannels, 100) : definition.maxChannels,
        monthlyConversationLimit: tenantId === 'default-tenant' ? Math.max(definition.monthlyConversationLimit, 1000000) : definition.monthlyConversationLimit,
        subscriptionEnd: subscriptionEnd ? new Date(subscriptionEnd) : undefined,
        updatedBy: 'billing-readiness',
      },
    })
    return this.toSubscription(tenant)
  }

  async updateTenantStatus(tenantId: string, status: TenantStatus) {
    await this.findTenant(tenantId)
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status, updatedBy: 'billing-readiness' },
    })
    return this.toSubscription(tenant)
  }

  private async tenantUsage(tenantId: string) {
    const tenant = await this.findTenant(tenantId)
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const nextMonth = new Date(monthStart)
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
    const plan = getBillingPlan(tenant.plan)

    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM users WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS "usersCount",
        (SELECT COUNT(*)::int FROM channels WHERE tenant_id = ${tenantId} AND deleted_at IS NULL) AS "channelsCount",
        (SELECT COUNT(*)::int FROM conversations WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= ${monthStart} AND created_at < ${nextMonth}) AS "monthlyConversationsCount",
        (SELECT COUNT(*)::int FROM messages WHERE tenant_id = ${tenantId} AND deleted_at IS NULL AND created_at >= ${monthStart} AND created_at < ${nextMonth}) AS "monthlyMessagesCount"
    `) as Array<{
      usersCount: number
      channelsCount: number
      monthlyConversationsCount: number
      monthlyMessagesCount: number
    }>
    const usage = rows[0] ?? { usersCount: 0, channelsCount: 0, monthlyConversationsCount: 0, monthlyMessagesCount: 0 }
    const limits = {
      maxUsers: tenant.maxUsers,
      maxChannels: tenant.maxChannels,
      monthlyConversationLimit: tenant.monthlyConversationLimit,
      monthlyMessageLimit: tenant.id === 'default-tenant' ? Math.max(plan.monthlyMessageLimit, 5000000) : plan.monthlyMessageLimit,
    }

    return {
      ...this.toSubscription(tenant),
      usage,
      limits,
      warnings: this.createWarnings(tenant, usage, limits),
    }
  }

  private createWarnings(
    tenant: Awaited<ReturnType<PrismaService['tenant']['findFirstOrThrow']>>,
    usage: { usersCount: number; channelsCount: number; monthlyConversationsCount: number; monthlyMessagesCount: number },
    limits: { maxUsers: number; maxChannels: number; monthlyConversationLimit: number; monthlyMessageLimit: number },
  ) {
    const warnings: Array<{ type: string; label: string; severity: 'warning' | 'danger' }> = []
    const checks = [
      ['users', 'المستخدمون', usage.usersCount, limits.maxUsers],
      ['channels', 'القنوات', usage.channelsCount, limits.maxChannels],
      ['conversations', 'المحادثات الشهرية', usage.monthlyConversationsCount, limits.monthlyConversationLimit],
      ['messages', 'الرسائل الشهرية', usage.monthlyMessagesCount, limits.monthlyMessageLimit],
    ] as const

    for (const [type, label, current, limit] of checks) {
      if (limit <= 0) continue
      const ratio = current / limit
      if (ratio >= 1) warnings.push({ type, label: `تم تجاوز حد ${label}`, severity: 'danger' })
      else if (ratio >= 0.8) warnings.push({ type, label: `اقتربت من حد ${label}`, severity: 'warning' })
    }

    if (tenant.subscriptionEnd) {
      const days = Math.ceil((tenant.subscriptionEnd.getTime() - Date.now()) / 86_400_000)
      if (days >= 0 && days <= 7) warnings.push({ type: 'subscriptionEnd', label: 'الاشتراك يوشك على الانتهاء', severity: 'warning' })
    }

    return warnings
  }

  private async findTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return tenant
  }

  private toSubscription(tenant: Awaited<ReturnType<PrismaService['tenant']['findFirstOrThrow']>>) {
    const plan = getBillingPlan(tenant.plan)
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      status: tenant.status,
      plan: tenant.plan,
      planDefinition: plan,
      subscriptionStart: tenant.subscriptionStart,
      subscriptionEnd: tenant.subscriptionEnd,
      limits: {
        maxUsers: tenant.maxUsers,
        maxChannels: tenant.maxChannels,
        monthlyConversationLimit: tenant.monthlyConversationLimit,
        monthlyMessageLimit: tenant.id === 'default-tenant' ? Math.max(plan.monthlyMessageLimit, 5000000) : plan.monthlyMessageLimit,
      },
    }
  }
}
