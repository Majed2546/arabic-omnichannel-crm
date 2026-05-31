import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { NotificationsService } from '../notifications/notifications.service'

type AutomationRuleRecord = {
  id: string
  tenantId: string
  triggerType: string
  actions: unknown
}

const supportedActions = new Set([
  'assign_conversation',
  'add_tag',
  'create_ticket',
  'send_quick_reply',
  'send_template',
  'notify_agent',
])

type AutomationTriggerInput = {
  tenantId: string
  triggerType: string
  targetType: string
  targetId: string
  context: {
    conversationId?: string | null
    customerId?: string | null
    channelType?: string | null
    messageText?: string | null
  }
}

type AutomationRuleRow = {
  id: string
  tenantId: string
  name: string
  triggerType: string
  conditions: Record<string, unknown> | null
  actions: unknown
}

@Injectable()
export class AutomationExecutorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  normalizeActionItems(actions: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(actions)) return actions.filter((action): action is Record<string, unknown> => typeof action === 'object' && action !== null)
    if (typeof actions === 'object' && actions !== null && Array.isArray((actions as { items?: unknown }).items)) {
      return (actions as { items: unknown[] }).items.filter((action): action is Record<string, unknown> => typeof action === 'object' && action !== null)
    }
    return []
  }

  normalizeActions(actions: unknown) {
    return { items: this.normalizeActionItems(actions) }
  }

  validateActions(actions: unknown) {
    const items = this.normalizeActionItems(actions)
    if (!items.length) throw new BadRequestException('At least one automation action is required')

    for (const action of items) {
      const type = typeof action.type === 'string' ? action.type : ''
      if (!supportedActions.has(type)) throw new BadRequestException(`Unsupported automation action: ${type || 'missing'}`)
    }
  }

  async testRule(tenantId: string, rule: AutomationRuleRecord, targetType = 'manual_test', targetId = 'manual') {
    const actions = this.normalizeActionItems(rule.actions)
    const actionSummary = actions
      .map((action) => typeof action === 'object' && action && 'type' in action ? String((action as { type?: unknown }).type) : 'unknown')
      .join('، ')

    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO automation_logs (
        id, tenant_id, rule_id, trigger_type, target_type, target_id, status, message
      )
      VALUES (
        ${this.cuid('automation_log')},
        ${tenantId},
        ${rule.id},
        ${rule.triggerType}::"AutomationTriggerType",
        ${targetType.trim() || 'manual_test'},
        ${targetId.trim() || 'manual'},
        'SUCCESS'::"AutomationLogStatus",
        ${`اختبار آمن للقاعدة. الإجراءات لم تُنفذ فعليًا: ${actionSummary || 'بدون إجراءات'}`}
      )
      RETURNING id
    `) as Array<{ id: string }>

    return rows[0]
  }

  async executeTrigger(input: AutomationTriggerInput) {
    const rules = await this.prisma.$queryRaw(Prisma.sql`
      SELECT
        id,
        tenant_id AS "tenantId",
        name,
        trigger_type AS "triggerType",
        conditions,
        actions
      FROM automation_rules
      WHERE tenant_id = ${input.tenantId}
        AND trigger_type = ${input.triggerType}::"AutomationTriggerType"
        AND is_active = true
        AND deleted_at IS NULL
      ORDER BY created_at ASC
      LIMIT 100
    `) as AutomationRuleRow[]

    const results = []
    for (const rule of rules) {
      results.push(await this.executeRule(input, rule))
    }
    return results
  }

  private async executeRule(input: AutomationTriggerInput, rule: AutomationRuleRow) {
    const conditions = this.normalizeConditions(rule.conditions)
    const context = await this.enrichContext(input)

    if (!this.matchesConditions(conditions, context)) {
      return this.logExecution(input, rule, 'SKIPPED', 'تم تخطي القاعدة لأن الشروط لا تنطبق على الرسالة.')
    }

    const existingSuccess = await this.prisma.$queryRaw(Prisma.sql`
      SELECT id
      FROM automation_logs
      WHERE tenant_id = ${input.tenantId}
        AND rule_id = ${rule.id}
        AND target_type = ${input.targetType}
        AND target_id = ${input.targetId}
        AND status = 'SUCCESS'::"AutomationLogStatus"
      LIMIT 1
    `) as Array<{ id: string }>
    if (existingSuccess.length) {
      return this.logExecution(input, rule, 'SKIPPED', 'تم تخطي التنفيذ لمنع إنشاء تذكرة مكررة لنفس الرسالة.')
    }

    try {
      const actions = this.normalizeActionItems(rule.actions)
      if (!actions.length) return this.logExecution(input, rule, 'SKIPPED', 'لا توجد إجراءات قابلة للتنفيذ في القاعدة.')

      const summaries: string[] = []
      for (const action of actions) {
        const type = typeof action.type === 'string' ? action.type : ''
        if (type === 'create_ticket') {
          const ticketId = await this.createTicketForMessage(input, rule, action)
          summaries.push(`تم إنشاء تذكرة ${ticketId}`)
          continue
        }

        if (type === 'send_quick_reply' || type === 'send_template' || type === 'notify_agent') {
          summaries.push(`${type} placeholder فقط`)
          continue
        }

        summaries.push(`تم تجاهل إجراء غير مدعوم: ${type || 'unknown'}`)
      }

      return this.logExecution(input, rule, 'SUCCESS', summaries.join('، ') || 'تم تنفيذ القاعدة.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل تنفيذ قاعدة الأتمتة'
      return this.logExecution(input, rule, 'FAILED', message)
    }
  }

  private async enrichContext(input: AutomationTriggerInput) {
    const context = { ...input.context }

    if (context.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: context.customerId, tenantId: input.tenantId, deletedAt: null },
        select: { tags: true },
      })
      Object.assign(context, { customerTags: customer?.tags ?? [] })
    }

    if (context.conversationId) {
      const conversation = await this.prisma.conversation.findFirst({
        where: { id: context.conversationId, tenantId: input.tenantId, deletedAt: null },
        select: { status: true },
      })
      Object.assign(context, { conversationStatus: conversation?.status })
    }

    return context as AutomationTriggerInput['context'] & { customerTags?: string[]; conversationStatus?: string }
  }

  private matchesConditions(conditions: Record<string, unknown>, context: AutomationTriggerInput['context'] & { customerTags?: string[]; conversationStatus?: string }) {
    if (conditions.channelType && conditions.channelType !== context.channelType) return false
    if (conditions.conversationStatus && conditions.conversationStatus !== context.conversationStatus) return false
    if (conditions.customerTag && !context.customerTags?.includes(String(conditions.customerTag))) return false
    return true
  }

  private async createTicketForMessage(input: AutomationTriggerInput, rule: AutomationRuleRow, action: Record<string, unknown>) {
    const config = this.readConfig(action)
    const priority = this.validPriority(config.priority) ? config.priority : 'MEDIUM'
    const title = typeof config.title === 'string' && config.title.trim()
      ? config.title.trim()
      : `متابعة تلقائية: ${rule.name}`
    const preview = (input.context.messageText ?? '').trim().slice(0, 500)
    const description = [
      'تم إنشاء هذه التذكرة تلقائيًا من رسالة واتساب واردة.',
      preview ? `نص الرسالة: ${preview}` : null,
      `معرّف الرسالة: ${input.targetId}`,
    ].filter(Boolean).join('\n')

    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO tickets (
        id, tenant_id, customer_id, conversation_id, title, description, status, priority, category, tags, updated_at
      )
      VALUES (
        ${this.cuid('ticket')},
        ${input.tenantId},
        ${input.context.customerId ?? null},
        ${input.context.conversationId ?? null},
        ${title},
        ${description},
        'OPEN'::"TicketStatus",
        ${priority}::"TicketPriority",
        ${typeof config.category === 'string' ? config.category : 'أتمتة'},
        ${['أتمتة', 'واتساب']},
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `) as Array<{ id: string }>

    return rows[0].id
  }

  private async logExecution(input: AutomationTriggerInput, rule: AutomationRuleRow, status: 'SUCCESS' | 'FAILED' | 'SKIPPED', message: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO automation_logs (
        id, tenant_id, rule_id, trigger_type, target_type, target_id, status, message
      )
      VALUES (
        ${this.cuid('automation_log')},
        ${input.tenantId},
        ${rule.id},
        ${input.triggerType}::"AutomationTriggerType",
        ${input.targetType},
        ${input.targetId},
        ${status}::"AutomationLogStatus",
        ${message}
      )
      RETURNING id, status, message
    `) as Array<{ id: string; status: string; message: string }>

    const log = rows[0]
    if (status === 'SUCCESS') {
      await this.notifications.create({
        tenantId: input.tenantId,
        type: 'AUTOMATION_EXECUTED',
        title: 'تم تنفيذ أتمتة',
        message,
        targetType: input.targetType.toUpperCase(),
        targetId: input.targetId,
        conversationId: input.context.conversationId ?? undefined,
        priority: 'LOW',
        metadata: { ruleId: rule.id, automationLogId: log.id, triggerType: input.triggerType },
      })
    }

    return log
  }

  private normalizeConditions(conditions: unknown) {
    if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) return {}
    return conditions as Record<string, unknown>
  }

  private readConfig(action: Record<string, unknown>) {
    const config = action.config
    if (!config || typeof config !== 'object' || Array.isArray(config)) return {} as Record<string, unknown>
    return config as Record<string, unknown>
  }

  private validPriority(value: unknown): value is 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    return value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'URGENT'
  }

  private cuid(prefix: string) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}
