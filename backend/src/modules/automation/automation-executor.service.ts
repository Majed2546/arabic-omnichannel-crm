import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'

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

@Injectable()
export class AutomationExecutorService {
  constructor(private readonly prisma: PrismaService) {}

  validateActions(actions: Array<Record<string, unknown>>) {
    if (!actions.length) throw new BadRequestException('At least one automation action is required')

    for (const action of actions) {
      const type = typeof action.type === 'string' ? action.type : ''
      if (!supportedActions.has(type)) throw new BadRequestException(`Unsupported automation action: ${type || 'missing'}`)
    }
  }

  async testRule(tenantId: string, rule: AutomationRuleRecord, targetType = 'manual_test', targetId = 'manual') {
    const actions = Array.isArray(rule.actions) ? rule.actions : []
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

  private cuid(prefix: string) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}
