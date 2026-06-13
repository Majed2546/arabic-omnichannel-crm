import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type {
  ListQuickRepliesQueryDto,
  ListWhatsAppTemplatesQueryDto,
  SaveQuickReplyDto,
  SaveWhatsAppTemplateDto,
} from './dto'

function cuid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function blankToNull(value?: string) {
  const normalized = value?.trim()
  return normalized || null
}

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  listQuickReplies(tenantId: string, query: ListQuickRepliesQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`tenant_id = ${tenantId}`]
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`
      conditions.push(Prisma.sql`(title ILIKE ${search} OR content ILIKE ${search} OR category ILIKE ${search})`)
    }
    if (query.category?.trim()) conditions.push(Prisma.sql`category = ${query.category.trim()}`)
    if (query.channelType) conditions.push(Prisma.sql`channel_type = ${query.channelType}::"ChannelType"`)
    if (query.isActive === 'true') conditions.push(Prisma.sql`is_active = true`)
    if (query.isActive === 'false') conditions.push(Prisma.sql`is_active = false`)

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT
        id,
        tenant_id AS "tenantId",
        title,
        content,
        category,
        channel_type AS "channelType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM quick_replies
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 200
    `)
  }

  createQuickReply(tenantId: string, dto: SaveQuickReplyDto) {
    return this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO quick_replies (id, tenant_id, title, content, category, channel_type, is_active, updated_at)
      VALUES (
        ${cuid('qr')},
        ${tenantId},
        ${dto.title.trim()},
        ${dto.content.trim()},
        ${blankToNull(dto.category)},
        ${dto.channelType ? Prisma.sql`${dto.channelType}::"ChannelType"` : Prisma.sql`NULL`},
        ${dto.isActive ?? true},
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        tenant_id AS "tenantId",
        title,
        content,
        category,
        channel_type AS "channelType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `).then((rows: unknown) => (rows as unknown[])[0])
  }

  async updateQuickReply(tenantId: string, id: string, dto: SaveQuickReplyDto) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      UPDATE quick_replies
      SET
        title = ${dto.title.trim()},
        content = ${dto.content.trim()},
        category = ${blankToNull(dto.category)},
        channel_type = ${dto.channelType ? Prisma.sql`${dto.channelType}::"ChannelType"` : Prisma.sql`NULL`},
        is_active = ${dto.isActive ?? true},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id AS "tenantId",
        title,
        content,
        category,
        channel_type AS "channelType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Quick reply not found')
    return rows[0]
  }

  async setQuickReplyActive(tenantId: string, id: string, isActive: boolean) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      UPDATE quick_replies
      SET is_active = ${isActive}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING
        id,
        tenant_id AS "tenantId",
        title,
        content,
        category,
        channel_type AS "channelType",
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Quick reply not found')
    return rows[0]
  }

  listWhatsAppTemplates(tenantId: string, query: ListWhatsAppTemplatesQueryDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`tenant_id = ${tenantId}`]
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`
      conditions.push(Prisma.sql`(name ILIKE ${search} OR body ILIKE ${search} OR category ILIKE ${search})`)
    }
    if (query.status) conditions.push(Prisma.sql`status = ${query.status}::"WhatsAppTemplateStatus"`)

    return this.prisma.$queryRaw(Prisma.sql`
      SELECT
        id,
        tenant_id AS "tenantId",
        name,
        language,
        category,
        status,
        body,
        variables,
        channel_type AS "channelType",
        meta_template_id AS "metaTemplateId",
        rejection_reason AS "rejectionReason",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM whatsapp_templates
      WHERE ${Prisma.join(conditions, ' AND ')}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 200
    `)
  }

  createWhatsAppTemplate(tenantId: string, dto: SaveWhatsAppTemplateDto) {
    return this.prisma.$queryRaw(Prisma.sql`
      INSERT INTO whatsapp_templates (id, tenant_id, name, language, category, body, variables, channel_type, updated_at)
      VALUES (
        ${cuid('wat')},
        ${tenantId},
        ${dto.name.trim()},
        ${dto.language?.trim() || 'ar'},
        ${dto.category.trim()},
        ${dto.body.trim()},
        ${dto.variables ?? []},
        'WHATSAPP',
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        tenant_id AS "tenantId",
        name,
        language,
        category,
        status,
        body,
        variables,
        channel_type AS "channelType",
        meta_template_id AS "metaTemplateId",
        rejection_reason AS "rejectionReason",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `).then((rows: unknown) => (rows as unknown[])[0])
  }

  async updateWhatsAppTemplate(tenantId: string, id: string, dto: SaveWhatsAppTemplateDto) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      UPDATE whatsapp_templates
      SET
        name = ${dto.name.trim()},
        language = ${dto.language?.trim() || 'ar'},
        category = ${dto.category.trim()},
        body = ${dto.body.trim()},
        variables = ${dto.variables ?? []},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'DRAFT'
      RETURNING
        id,
        tenant_id AS "tenantId",
        name,
        language,
        category,
        status,
        body,
        variables,
        channel_type AS "channelType",
        meta_template_id AS "metaTemplateId",
        rejection_reason AS "rejectionReason",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Draft template not found')
    return rows[0]
  }

  async submitWhatsAppTemplate(tenantId: string, id: string) {
    const rows = await this.prisma.$queryRaw(Prisma.sql`
      UPDATE whatsapp_templates
      SET status = 'PENDING_REVIEW', updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} AND tenant_id = ${tenantId} AND status = 'DRAFT'
      RETURNING
        id,
        tenant_id AS "tenantId",
        name,
        language,
        category,
        status,
        body,
        variables,
        channel_type AS "channelType",
        meta_template_id AS "metaTemplateId",
        rejection_reason AS "rejectionReason",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
    `) as unknown[]
    if (!rows.length) throw new NotFoundException('Draft template not found')
    return {
      ...(rows[0] as Record<string, unknown>),
      placeholder: true,
      message: 'Meta Embedded template submission is not implemented yet.',
    }
  }
}
