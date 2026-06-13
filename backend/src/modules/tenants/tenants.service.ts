import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PlatformRole, TenantPlan, TenantStatus, UserStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import type { CreateTenantDto, UpdateTenantDto, UpdateTenantStatusDto } from './dto'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        settings: { select: { companyDisplayName: true } },
        _count: { select: { users: true } },
        users: {
          where: { platformRole: PlatformRole.COMPANY_ADMIN, deletedAt: null },
          select: { id: true, name: true, email: true, platformRole: true, status: true },
          take: 1,
        },
      },
    })
    return tenants.map((tenant) => this.withDisplayName(tenant))
  }

  async listForUser(tenantId?: string) {
    if (!tenantId) throw new ForbiddenException('Tenant access denied')
    const tenants = await this.prisma.tenant.findMany({
      where: { id: tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        settings: { select: { companyDisplayName: true } },
        _count: { select: { users: true } },
        users: {
          where: { platformRole: PlatformRole.COMPANY_ADMIN, deletedAt: null },
          select: { id: true, name: true, email: true, platformRole: true, status: true },
          take: 1,
        },
      },
    })
    return tenants.map((tenant) => this.withDisplayName(tenant))
  }

  denyTenantAccess(): never {
    throw new ForbiddenException('Tenant access denied')
  }

  async findById(id: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        settings: { select: { companyDisplayName: true } },
        users: { where: { deletedAt: null }, select: { id: true, name: true, email: true, platformRole: true, status: true } },
      },
    })
    if (!tenant) throw new NotFoundException('Tenant not found')
    return this.withDisplayName(tenant)
  }

  async create(dto: CreateTenantDto) {
    const existing = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Tenant slug already exists')
    const admin = dto.admin ?? dto.companyAdmin

    const tenant = await this.prisma.$transaction(async (tx) => {
      if (admin) {
        const existingAdmin = await tx.user.findFirst({
          where: { email: admin.email, deletedAt: null },
          select: { id: true },
        })
        if (existingAdmin) throw new BadRequestException('Admin email already exists')
      }

      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          logoUrl: dto.logoUrl,
          status: dto.status ?? TenantStatus.TRIAL,
          plan: dto.plan ?? TenantPlan.STARTER,
          subscriptionStart: dto.subscriptionStart ? new Date(dto.subscriptionStart) : new Date(),
          subscriptionEnd: dto.subscriptionEnd ? new Date(dto.subscriptionEnd) : undefined,
          maxUsers: dto.maxUsers ?? 10,
          maxChannels: dto.maxChannels ?? 2,
          monthlyConversationLimit: dto.monthlyConversationLimit ?? 1000,
          createdBy: 'platform-admin',
          updatedBy: 'platform-admin',
        },
      })

      if (admin) {
        await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: admin.name,
            email: admin.email,
            passwordHash: 'pending-keycloak-invite',
            status: UserStatus.ACTIVE,
            platformRole: PlatformRole.COMPANY_ADMIN,
            createdBy: 'platform-admin',
            updatedBy: 'platform-admin',
          },
        })
      }

      return tenant
    })

    return this.findById(tenant.id)
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.ensureExists(id)

    await this.prisma.tenant.update({
      where: { id },
      data: {
        ...dto,
        subscriptionStart: dto.subscriptionStart ? new Date(dto.subscriptionStart) : undefined,
        subscriptionEnd: dto.subscriptionEnd ? new Date(dto.subscriptionEnd) : undefined,
        updatedBy: 'platform-admin',
      },
    })
    return this.findById(id)
  }

  async updateStatus(id: string, dto: UpdateTenantStatusDto) {
    await this.ensureExists(id)

    return this.prisma.tenant.update({
      where: { id },
      data: {
        status: dto.status,
        updatedBy: 'platform-admin',
      },
    })
  }

  private async ensureExists(id: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id, deletedAt: null }, select: { id: true } })
    if (!tenant) throw new NotFoundException('Tenant not found')
  }

  private withDisplayName<T extends { name: string; settings?: { companyDisplayName: string | null } | null }>(tenant: T) {
    return {
      ...tenant,
      displayName: tenant.settings?.companyDisplayName?.trim() || tenant.name,
    }
  }
}
