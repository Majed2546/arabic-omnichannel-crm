import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ChannelStatus, ChannelType, OnboardingOperationMode } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { TenantWhatsAppOnboardingDto, UpdateTenantChannelStatusDto } from './tenant-channels.dto'

const DEFAULT_TENANT_ID = 'default-tenant'

@Injectable()
export class TenantChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async listForCurrentTenant(tenantId?: string) {
    return this.getByTenantId(tenantId || DEFAULT_TENANT_ID)
  }

  async getByTenantId(tenantId: string) {
    const [tenant, channels, onboardingRequest] = await Promise.all([
      this.prisma.tenant.findFirst({
        where: { id: tenantId, deletedAt: null },
        select: { id: true, name: true, slug: true, status: true, plan: true },
      }),
      this.prisma.channel.findMany({
        where: { tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.onboardingRequest.findFirst({
        where: { activatedTenantId: tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          organizationName: true,
          whatsappNumber: true,
          requestedChannels: true,
          hasMetaBusiness: true,
          hasWhatsAppBusinessApp: true,
          operationMode: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ])

    return {
      tenantId,
      tenant: tenant ?? this.defaultTenantFallback(tenantId),
      items: this.withDefaultWhatsAppFallback(tenantId, channels, onboardingRequest),
      onboardingRequest,
      defaultWhatsAppReady: tenantId === DEFAULT_TENANT_ID && this.defaultWhatsAppReady(),
      mode: 'placeholder',
    }
  }

  async startWhatsAppOnboarding(tenantId: string, dto: TenantWhatsAppOnboardingDto) {
    await this.ensureTenantExists(tenantId)

    const channel = await this.prisma.channel.upsert({
      where: { id: await this.findExistingWhatsAppChannelId(tenantId) },
      create: {
        tenantId,
        type: ChannelType.WHATSAPP,
        status: ChannelStatus.PENDING,
        name: 'WhatsApp Business',
        config: this.safeWhatsAppConfig(dto),
        createdBy: 'platform-admin',
        updatedBy: 'platform-admin',
      },
      update: {
        status: ChannelStatus.PENDING,
        config: this.safeWhatsAppConfig(dto),
        updatedBy: 'platform-admin',
      },
    })

    return {
      accepted: true,
      storedSecrets: false,
      mode: 'placeholder',
      message: 'WhatsApp onboarding placeholder started. No tokens or technical identifiers were stored.',
      channel,
    }
  }

  async updateStatus(id: string, dto: UpdateTenantChannelStatusDto) {
    const channel = await this.prisma.channel.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!channel) throw new NotFoundException('Tenant channel not found')

    return this.prisma.channel.update({
      where: { id },
      data: {
        status: dto.status,
        connectedAt: dto.status === ChannelStatus.CONNECTED ? new Date() : undefined,
        updatedBy: 'platform-admin',
      },
    })
  }

  private withDefaultWhatsAppFallback(
    tenantId: string,
    channels: Array<{ type: ChannelType; status: ChannelStatus } & Record<string, unknown>>,
    onboardingRequest: { whatsappNumber: string | null; operationMode: OnboardingOperationMode } | null,
  ) {
    if (channels.some((channel) => channel.type === ChannelType.WHATSAPP)) return channels

    return [
      {
        id: `placeholder-${tenantId}-whatsapp`,
        tenantId,
        type: ChannelType.WHATSAPP,
        status: tenantId === DEFAULT_TENANT_ID && this.defaultWhatsAppReady() ? ChannelStatus.CONNECTED : ChannelStatus.DISCONNECTED,
        name: 'WhatsApp Business',
        config: this.safeWhatsAppConfig({
          whatsappNumber: onboardingRequest?.whatsappNumber ?? undefined,
          operationMode: onboardingRequest?.operationMode,
        }),
        connectedAt: tenantId === DEFAULT_TENANT_ID && this.defaultWhatsAppReady() ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
        placeholder: true,
      },
      ...channels,
    ]
  }

  private safeWhatsAppConfig(dto: TenantWhatsAppOnboardingDto) {
    return {
      whatsappNumber: dto.whatsappNumber?.trim() || undefined,
      operationMode: dto.operationMode ?? OnboardingOperationMode.PLATFORM_ONLY,
      notes: dto.notes?.trim() || undefined,
    }
  }

  private async findExistingWhatsAppChannelId(tenantId: string) {
    const channel = await this.prisma.channel.findFirst({
      where: { tenantId, type: ChannelType.WHATSAPP, deletedAt: null },
      select: { id: true },
    })
    return channel?.id ?? `new-${tenantId}-whatsapp`
  }

  private async ensureTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null }, select: { id: true } })
    if (!tenant) throw new BadRequestException('Tenant not found')
  }

  private defaultWhatsAppReady() {
    return Boolean(
      this.config.get<string>('whatsapp.accessToken') &&
      this.config.get<string>('whatsapp.phoneNumberId') &&
      this.config.get<string>('whatsapp.businessAccountId'),
    )
  }

  private defaultTenantFallback(tenantId: string) {
    if (tenantId !== DEFAULT_TENANT_ID) return null
    return {
      id: DEFAULT_TENANT_ID,
      name: 'المستأجر الافتراضي',
      slug: 'default',
      status: 'ACTIVE',
      plan: 'ENTERPRISE',
    }
  }
}
