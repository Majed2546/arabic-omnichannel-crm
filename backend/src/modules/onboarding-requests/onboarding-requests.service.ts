import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { OnboardingRequestStatus, TenantPlan, TenantStatus } from '@prisma/client'
import { PrismaService } from '../../database/prisma.service'
import { TenantsService } from '../tenants/tenants.service'
import type {
  CreateOnboardingRequestDto,
  UpdateOnboardingRequestDto,
  UpdateOnboardingRequestStatusDto,
} from './dto'

@Injectable()
export class OnboardingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  list() {
    return this.prisma.onboardingRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { activatedTenant: { select: { id: true, name: true, slug: true, status: true, plan: true } } },
    })
  }

  async findById(id: string) {
    const request = await this.prisma.onboardingRequest.findUnique({
      where: { id },
      include: { activatedTenant: { select: { id: true, name: true, slug: true, status: true, plan: true } } },
    })
    if (!request) throw new NotFoundException('Onboarding request not found')
    return request
  }

  create(dto: CreateOnboardingRequestDto) {
    return this.prisma.onboardingRequest.create({
      data: this.cleanPayload(dto),
    })
  }

  async update(id: string, dto: UpdateOnboardingRequestDto) {
    await this.ensureExists(id)
    return this.prisma.onboardingRequest.update({
      where: { id },
      data: this.cleanPayload(dto),
    })
  }

  async updateStatus(id: string, dto: UpdateOnboardingRequestStatusDto) {
    await this.ensureExists(id)
    return this.prisma.onboardingRequest.update({
      where: { id },
      data: { status: dto.status },
    })
  }

  async createTenant(id: string) {
    const request = await this.findById(id)

    if (request.activatedTenantId) {
      return this.findById(id)
    }

    if (request.status === OnboardingRequestStatus.REJECTED) {
      throw new BadRequestException('Rejected onboarding requests cannot create tenants')
    }

    const tenant = await this.tenants.create({
      name: request.organizationName,
      slug: await this.createUniqueSlug(request.organizationName, request.website, request.id),
      status: TenantStatus.ACTIVE,
      plan: request.requestedPlan,
      subscriptionStart: new Date().toISOString(),
      maxUsers: request.requestedUsers,
      maxChannels: Math.max(request.requestedChannels.length, 1),
      monthlyConversationLimit: this.conversationLimitForPlan(request.requestedPlan),
      admin: {
        name: request.contactName,
        email: request.contactEmail,
      },
    })

    return this.prisma.onboardingRequest.update({
      where: { id },
      data: {
        status: OnboardingRequestStatus.ACTIVATED,
        activatedTenantId: tenant.id,
      },
      include: { activatedTenant: { select: { id: true, name: true, slug: true, status: true, plan: true } } },
    })
  }

  private cleanPayload<T extends CreateOnboardingRequestDto | UpdateOnboardingRequestDto>(dto: T) {
    return {
      ...dto,
      website: dto.website?.trim() || undefined,
      whatsappNumber: dto.whatsappNumber?.trim() || undefined,
      notes: dto.notes?.trim() || undefined,
      requestedChannels: dto.requestedChannels?.map((channel) => channel.trim()).filter(Boolean),
    }
  }

  private async ensureExists(id: string) {
    const request = await this.prisma.onboardingRequest.findUnique({ where: { id }, select: { id: true } })
    if (!request) throw new NotFoundException('Onboarding request not found')
  }

  private async createUniqueSlug(organizationName: string, website: string | null, requestId: string) {
    const base = this.slugBaseFromWebsite(website) ?? this.slugify(organizationName) ?? `company-${requestId.slice(-6).toLowerCase()}`
    let slug = base
    let suffix = 2

    while (await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${base}-${suffix}`
      suffix += 1
    }

    return slug
  }

  private slugBaseFromWebsite(website: string | null) {
    if (!website) return null
    try {
      const url = new URL(website.startsWith('http') ? website : `https://${website}`)
      return this.slugify(url.hostname.replace(/^www\./, '').split('.')[0])
    } catch {
      return null
    }
  }

  private slugify(value: string) {
    const slug = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return slug || null
  }

  private conversationLimitForPlan(plan: TenantPlan) {
    if (plan === TenantPlan.ENTERPRISE) return 50000
    if (plan === TenantPlan.PROFESSIONAL) return 10000
    return 1000
  }
}
