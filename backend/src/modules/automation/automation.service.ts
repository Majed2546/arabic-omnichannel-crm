import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { AutomationExecutorService } from './automation-executor.service'
import type { ListAutomationLogsQueryDto, ListAutomationRulesQueryDto, SaveAutomationRuleDto } from './dto'

function cuid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function blankToNull(value?: string) {
  const normalized = value?.trim()
  return normalized || null
}

function ruleSelectSql() {
  return Prisma.sql`
    r.id,
    r.tenant_id AS "tenantId",
    r.name,
    r.description,
    r.trigger_type AS "triggerType",
    r.conditions,
    r.actions,
    r.is_active AS "isActive",
    r.created_at AS "createdAt",
    r.updated_at AS "updatedAt",
    latest.status AS "lastRunStatus",
    latest.message AS "lastRunMessage",
    latest.created_at AS "lastRunAt"
  `
}

function logSelectSql() {
  return Prisma.sql`
    l.id,
    l.tenant_id AS "tenantId",
    l.rule_id AS "ruleId",
    l.trigger_type AS "triggerType",
    l.target_type AS "targetType",
    l.target_id AS "targetId",
    l.status,
    l.message,
    l.created_at AS "createdAt",
    r.name AS "ruleName"
  `
}

@Injectable()
export class AutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: AutomationExecutorService,
  ) {}

  listRules(tenantId: string, query: ListAutomationRulesQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`r.tenant_id = ${tenantId}`, Prisma.sql`r.deleted_at IS NULL`]
    if (query.triggerType) conditions.push(Prisma.sql`r.trigger_type = ${query.triggerType}::"AutomationTriggerType"`)
    if (query.isActive === 'true') conditions.push(Prisma.sql`r.is_active = true`)
    if (query.isActive === 'false') conditions.push(Prisma.sql`r.is_active = false`)

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT ${ruleSelectSql()}
      FROM automation_rules r
      LEFT JOIN LATERAL (
        SELECT status, message, created_at
        FROM automation_logs
        WHERE tenant_id = r.tenant_id AND rule_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY r.updated_at DESC, r.created_at DESC
      LIMIT 300
    `)
  }

  async findRuleById(tenantId: string, id: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT ${ruleSelectSql()}
      FROM automation_rules r
      LEFT JOIN LATERAL (
        SELECT status, message, created_at
        FROM automation_logs
        WHERE tenant_id = r.tenant_id AND rule_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) latest ON true
      WHERE r.id = ${id} AND r.tenant_id = ${tenantId} AND r.deleted_at IS NULL
      LIMIT 1
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Automation rule not found')
    return rows[0]
  }

  async createRule(tenantId: string, dto: SaveAutomationRuleDto) {
    this.validateRule(dto)
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO automation_rules (
        id, tenant_id, name, description, trigger_type, conditions, actions, is_active, updated_at
      )
      VALUES (
        ${cuid('automation_rule')},
        ${tenantId},
        ${dto.name.trim()},
        ${blankToNull(dto.description)},
        ${dto.triggerType}::"AutomationTriggerType",
        ${dto.conditions ?? {}},
        ${dto.actions},
        ${dto.isActive ?? true},
        CURRENT_TIMESTAMP
      )
      RETURNING id
    `) as Array<{ id: string }>
    return this.findRuleById(tenantId, rows[0].id)
  }

  async updateRule(tenantId: string, id: string, dto: SaveAutomationRuleDto) {
    await this.findRuleById(tenantId, id)
    this.validateRule(dto)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE automation_rules
      SET
        name = ${dto.name.trim()},
        description = ${blankToNull(dto.description)},
        trigger_type = ${dto.triggerType}::"AutomationTriggerType",
        conditions = ${dto.conditions ?? {}},
        actions = ${dto.actions},
        is_active = ${dto.isActive ?? true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return this.findRuleById(tenantId, id)
  }

  async toggleRule(tenantId: string, id: string, isActive?: boolean) {
    const rule = await this.findRuleById(tenantId, id) as { isActive?: boolean }
    const nextActive = typeof isActive === 'boolean' ? isActive : !rule.isActive
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE automation_rules
      SET is_active = ${nextActive}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return this.findRuleById(tenantId, id)
  }

  async softDeleteRule(tenantId: string, id: string) {
    await this.findRuleById(tenantId, id)
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE automation_rules
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND deleted_at IS NULL
    `)
    return { deleted: true, id }
  }

  listLogs(tenantId: string, query: ListAutomationLogsQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`l.tenant_id = ${tenantId}`]
    if (query.triggerType) conditions.push(Prisma.sql`l.trigger_type = ${query.triggerType}::"AutomationTriggerType"`)
    if (query.status) conditions.push(Prisma.sql`l.status = ${query.status}::"AutomationLogStatus"`)
    if (query.ruleId) conditions.push(Prisma.sql`l.rule_id = ${query.ruleId}`)

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT ${logSelectSql()}
      FROM automation_logs l
      LEFT JOIN automation_rules r ON r.id = l.rule_id AND r.tenant_id = l.tenant_id
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY l.created_at DESC
      LIMIT 100
    `)
  }

  async testRule(tenantId: string, id: string, targetType?: string, targetId?: string) {
    const rule = await this.findRuleById(tenantId, id) as { id: string; tenantId: string; triggerType: string; actions: unknown }
    const created = await this.executor.testRule(tenantId, rule, targetType, targetId)
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      SELECT ${logSelectSql()}
      FROM automation_logs l
      LEFT JOIN automation_rules r ON r.id = l.rule_id AND r.tenant_id = l.tenant_id
      WHERE l.id = ${created.id} AND l.tenant_id = ${tenantId}
      LIMIT 1
    `) as unknown[]
    return rows[0]
  }

  private validateRule(dto: SaveAutomationRuleDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Automation rule name is required')
    if (!Array.isArray(dto.actions)) throw new BadRequestException('Automation actions must be an array')
    this.executor.validateActions(dto.actions)
  }
}
