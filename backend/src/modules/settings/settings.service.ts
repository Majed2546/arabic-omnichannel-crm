import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConversationPriority, Prisma, TicketPriority } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { UpdateCompanySettingsDto, UpdateNotificationSettingsDto, UpdateSettingsDto, UpdateSlaSettingsDto } from './dto'

const DEFAULT_WORKING_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU']
const DEFAULT_WORKING_HOURS = { start: '09:00', end: '17:00', slaWarningBeforeMinutes: 10 }
const DEFAULT_NOTIFICATIONS = {
  newMessage: true,
  newTicket: true,
  upcomingAppointment: true,
  slaBreached: true,
  messageSendFailed: true,
}

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.ensureSettingsTable()
  }

  async getSettings(tenantId: string) {
    const tenant = await this.findTenant(tenantId)
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId: tenant.id } })

    return this.toResponse(tenant, settings)
  }

  async updateSettings(tenantId: string, dto: UpdateSettingsDto) {
    const tenant = await this.findTenant(tenantId)
    const current = await this.getSettings(tenant.id)
    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      create: this.toCreateData(tenant.id, { ...current, ...dto }),
      update: this.toUpdateData({ ...current, ...dto }),
    })
    return this.getSettings(settings.tenantId)
  }

  async getCompanySettings(tenantId: string) {
    const settings = await this.getSettings(tenantId)
    return {
      tenantId: settings.tenantId,
      companyDisplayName: settings.companyDisplayName,
      logoUrl: settings.logoUrl,
      timezone: settings.timezone,
      language: settings.language,
      updatedAt: settings.updatedAt,
    }
  }

  updateCompanySettings(tenantId: string, dto: UpdateCompanySettingsDto) {
    return this.updateSettings(tenantId, dto)
  }

  async getSlaSettings(tenantId: string) {
    const settings = await this.getSettings(tenantId)
    return {
      tenantId: settings.tenantId,
      workingDays: settings.workingDays,
      workingHours: settings.workingHours,
      slaFirstResponseMinutes: settings.slaFirstResponseMinutes,
      slaResolutionMinutes: settings.slaResolutionMinutes,
      updatedAt: settings.updatedAt,
    }
  }

  updateSlaSettings(tenantId: string, dto: UpdateSlaSettingsDto) {
    return this.updateSettings(tenantId, dto)
  }

  async getNotificationSettings(tenantId: string) {
    const settings = await this.getSettings(tenantId)
    return {
      tenantId: settings.tenantId,
      notificationSettings: settings.notificationSettings,
      updatedAt: settings.updatedAt,
    }
  }

  updateNotificationSettings(tenantId: string, dto: UpdateNotificationSettingsDto) {
    return this.updateSettings(tenantId, { notificationSettings: dto })
  }

  private async findTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { slug: tenantId }], deletedAt: null },
      select: { id: true, name: true, logoUrl: true },
    })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return tenant
  }

  private toResponse(
    tenant: { id: string; name: string; logoUrl: string | null },
    settings: Awaited<ReturnType<PrismaService['tenantSettings']['findUnique']>>,
  ) {
    return {
      id: settings?.id ?? null,
      tenantId: tenant.id,
      companyDisplayName: settings?.companyDisplayName ?? tenant.name,
      logoUrl: settings?.logoUrl ?? tenant.logoUrl ?? '',
      timezone: settings?.timezone ?? 'Asia/Riyadh',
      language: settings?.language ?? 'ar',
      workingDays: this.arrayValue(settings?.workingDays, DEFAULT_WORKING_DAYS),
      workingHours: this.objectValue(settings?.workingHours, DEFAULT_WORKING_HOURS),
      slaFirstResponseMinutes: settings?.slaFirstResponseMinutes ?? 15,
      slaResolutionMinutes: settings?.slaResolutionMinutes ?? 240,
      notificationSettings: this.objectValue(settings?.notificationSettings, DEFAULT_NOTIFICATIONS),
      defaultConversationPriority: settings?.defaultConversationPriority ?? ConversationPriority.NORMAL,
      defaultTicketPriority: settings?.defaultTicketPriority ?? TicketPriority.MEDIUM,
      defaultAppointmentDurationMinutes: settings?.defaultAppointmentDurationMinutes ?? 30,
      messageSignature: settings?.messageSignature ?? '',
      createdAt: settings?.createdAt ?? null,
      updatedAt: settings?.updatedAt ?? null,
    }
  }

  private toCreateData(tenantId: string, dto: UpdateSettingsDto & Record<string, unknown>) {
    return {
      tenantId,
      companyDisplayName: this.optionalString(dto.companyDisplayName),
      logoUrl: this.optionalString(dto.logoUrl),
      timezone: this.optionalString(dto.timezone) ?? 'Asia/Riyadh',
      language: this.optionalString(dto.language) ?? 'ar',
      workingDays: (dto.workingDays ?? DEFAULT_WORKING_DAYS) as Prisma.InputJsonValue,
      workingHours: (dto.workingHours ?? DEFAULT_WORKING_HOURS) as Prisma.InputJsonValue,
      slaFirstResponseMinutes: Number(dto.slaFirstResponseMinutes ?? 15),
      slaResolutionMinutes: Number(dto.slaResolutionMinutes ?? 240),
      notificationSettings: (dto.notificationSettings ?? DEFAULT_NOTIFICATIONS) as Prisma.InputJsonValue,
      defaultConversationPriority: (dto.defaultConversationPriority ?? ConversationPriority.NORMAL) as ConversationPriority,
      defaultTicketPriority: (dto.defaultTicketPriority ?? TicketPriority.MEDIUM) as TicketPriority,
      defaultAppointmentDurationMinutes: Number(dto.defaultAppointmentDurationMinutes ?? 30),
      messageSignature: this.optionalString(dto.messageSignature),
    }
  }

  private toUpdateData(dto: UpdateSettingsDto & Record<string, unknown>) {
    return {
      companyDisplayName: this.optionalString(dto.companyDisplayName),
      logoUrl: this.optionalString(dto.logoUrl),
      timezone: this.optionalString(dto.timezone),
      language: this.optionalString(dto.language),
      workingDays: dto.workingDays ? dto.workingDays as Prisma.InputJsonValue : undefined,
      workingHours: dto.workingHours ? dto.workingHours as Prisma.InputJsonValue : undefined,
      slaFirstResponseMinutes: dto.slaFirstResponseMinutes,
      slaResolutionMinutes: dto.slaResolutionMinutes,
      notificationSettings: dto.notificationSettings ? dto.notificationSettings as Prisma.InputJsonValue : undefined,
      defaultConversationPriority: dto.defaultConversationPriority,
      defaultTicketPriority: dto.defaultTicketPriority,
      defaultAppointmentDurationMinutes: dto.defaultAppointmentDurationMinutes,
      messageSignature: this.optionalString(dto.messageSignature),
    }
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' ? value.trim() : undefined
  }

  private arrayValue(value: unknown, fallback: string[]) {
    return Array.isArray(value) ? value.map(String) : fallback
  }

  private objectValue<T extends Record<string, unknown>>(value: unknown, fallback: T): T {
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...fallback, ...(value as T) } : fallback
  }

  private async ensureSettingsTable() {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tenant_settings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        company_display_name TEXT,
        logo_url TEXT,
        timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
        language TEXT NOT NULL DEFAULT 'ar',
        working_days JSONB NOT NULL DEFAULT '["SUN","MON","TUE","WED","THU"]'::jsonb,
        working_hours JSONB NOT NULL DEFAULT '{"start":"09:00","end":"17:00","slaWarningBeforeMinutes":10}'::jsonb,
        sla_first_response_minutes INTEGER NOT NULL DEFAULT 15,
        sla_resolution_minutes INTEGER NOT NULL DEFAULT 240,
        notification_settings JSONB NOT NULL DEFAULT '{"newMessage":true,"newTicket":true,"upcomingAppointment":true,"slaBreached":true,"messageSendFailed":true}'::jsonb,
        default_conversation_priority "ConversationPriority" NOT NULL DEFAULT 'NORMAL',
        default_ticket_priority "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
        default_appointment_duration_minutes INTEGER NOT NULL DEFAULT 30,
        message_signature TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS tenant_settings_tenant_id_idx ON tenant_settings(tenant_id)')
  }
}
