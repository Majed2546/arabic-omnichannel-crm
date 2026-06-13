import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PlatformRole, Prisma, UserStatus, UserType } from '@prisma/client'
import { TenantAccessService } from '../../common/tenant-access.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { SaveUserDto, UpdateUserStatusDto, UserQueryDto, UserStatusDto } from './dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async list(requestedTenantId: string | undefined, user: AuthenticatedUser, query: UserQueryDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const where: Prisma.UserWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.userType ? { userType: { in: this.parseUserTypes(query.userType) } } : {}),
      ...(query.platformRole ? { platformRole: query.platformRole } : {}),
      ...(query.status ? { status: this.toPrismaStatus(query.status) } : {}),
    }

    if (query.search?.trim()) {
      const search = query.search.trim()
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: this.userInclude(),
    })
    return users.map((item) => this.toResponse(item))
  }

  async findById(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const item = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.userInclude(),
    })
    if (!item) throw new NotFoundException('User not found')
    return this.toResponse(item)
  }

  async create(requestedTenantId: string | undefined, user: AuthenticatedUser, dto: SaveUserDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.validateRole(tenantId, dto.roleId)
    const platformRole = this.resolvePlatformRole(user, dto.platformRole, dto.userType)

    try {
      const item = await this.prisma.user.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          phone: this.optionalString(dto.phone),
          passwordHash: 'invitation-pending',
          status: this.toPrismaStatus(dto.status ?? UserStatusDto.INVITED),
          platformRole,
          roleId: dto.roleId || null,
          jobTitle: this.optionalString(dto.jobTitle),
          userType: dto.userType ?? this.userTypeFromPlatformRole(platformRole),
          avatarUrl: this.optionalString(dto.avatarUrl),
          avatar: this.optionalString(dto.avatarUrl),
          timezone: this.optionalString(dto.timezone),
          createdBy: user.id,
          updatedBy: user.id,
        },
        include: this.userInclude(),
      })
      return this.toResponse(item)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already exists for this tenant')
      }
      throw error
    }
  }

  async update(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, dto: SaveUserDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureUser(id, tenantId)
    await this.validateRole(tenantId, dto.roleId)
    const platformRole = dto.platformRole ? this.resolvePlatformRole(user, dto.platformRole, dto.userType) : undefined

    const item = await this.prisma.user.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        email: dto.email?.trim().toLowerCase(),
        phone: this.optionalString(dto.phone),
        status: dto.status ? this.toPrismaStatus(dto.status) : undefined,
        platformRole,
        roleId: dto.roleId || null,
        jobTitle: this.optionalString(dto.jobTitle),
        userType: dto.userType ?? (platformRole ? this.userTypeFromPlatformRole(platformRole) : undefined),
        avatarUrl: this.optionalString(dto.avatarUrl),
        avatar: this.optionalString(dto.avatarUrl),
        timezone: this.optionalString(dto.timezone),
        updatedBy: user.id,
      },
      include: this.userInclude(),
    })
    return this.toResponse(item)
  }

  async updateStatus(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, dto: UpdateUserStatusDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureUser(id, tenantId)
    const item = await this.prisma.user.update({
      where: { id },
      data: { status: this.toPrismaStatus(dto.status), updatedBy: user.id },
      include: this.userInclude(),
    })
    return this.toResponse(item)
  }

  async softDelete(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureUser(id, tenantId)
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: UserStatus.DELETED, updatedBy: user.id },
    })
    return { id, deleted: true }
  }

  private async ensureUser(id: string, tenantId: string) {
    const item = await this.prisma.user.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } })
    if (!item) throw new NotFoundException('User not found')
  }

  private async validateRole(tenantId: string, roleId?: string | null) {
    if (!roleId) return
    const role = await this.prisma.role.findFirst({ where: { id: roleId, tenantId, deletedAt: null }, select: { id: true } })
    if (!role) throw new BadRequestException('Role must belong to the selected tenant')
  }

  private resolvePlatformRole(user: AuthenticatedUser, requestedRole?: PlatformRole, userType?: UserType) {
    if (requestedRole === PlatformRole.SUPER_ADMIN && user.platformRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Super Admin role is platform-only')
    }
    if (requestedRole) return requestedRole
    if (userType === UserType.COMPANY_ADMIN) return PlatformRole.COMPANY_ADMIN
    return PlatformRole.COMPANY_USER
  }

  private userTypeFromPlatformRole(platformRole: PlatformRole) {
    if (platformRole === PlatformRole.COMPANY_ADMIN || platformRole === PlatformRole.SUPER_ADMIN) return UserType.COMPANY_ADMIN
    return UserType.AGENT
  }

  private parseUserTypes(value: string) {
    const allowed = new Set(Object.values(UserType))
    const userTypes = value
      .split(',')
      .map((item) => item.trim())
      .filter((item): item is UserType => allowed.has(item as UserType))
    return userTypes.length ? userTypes : Array.from(allowed)
  }

  private toPrismaStatus(status: UserStatusDto | string) {
    if (status === UserStatusDto.INACTIVE) return UserStatus.SUSPENDED
    if (status === UserStatusDto.INVITED) return UserStatus.INVITED
    return UserStatus.ACTIVE
  }

  private fromPrismaStatus(status: UserStatus) {
    if (status === UserStatus.SUSPENDED || status === UserStatus.DELETED) return UserStatusDto.INACTIVE
    if (status === UserStatus.INVITED) return UserStatusDto.INVITED
    return UserStatusDto.ACTIVE
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null
  }

  private userInclude() {
    return {
      role: { select: { id: true, name: true } },
      _count: {
        select: {
          assigned: { where: { deletedAt: null, status: { notIn: ['RESOLVED', 'CLOSED'] } } },
          tickets: { where: { deletedAt: null, status: { notIn: ['RESOLVED', 'CLOSED'] } } },
          appointments: { where: { deletedAt: null, status: { in: ['SCHEDULED', 'CONFIRMED'] }, startAt: { gte: new Date() } } },
        },
      },
    } satisfies Prisma.UserInclude
  }

  private toResponse(item: Prisma.UserGetPayload<{ include: ReturnType<UsersService['userInclude']> }>) {
    return {
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      email: item.email,
      phone: item.phone ?? '',
      platformRole: item.platformRole,
      roleId: item.roleId,
      role: item.role,
      jobTitle: item.jobTitle ?? '',
      userType: item.userType,
      status: this.fromPrismaStatus(item.status),
      avatarUrl: item.avatarUrl ?? item.avatar ?? '',
      timezone: item.timezone ?? '',
      lastLoginAt: item.lastLoginAt,
      assignedConversationsCount: item._count.assigned,
      openTicketsCount: item._count.tickets,
      upcomingAppointmentsCount: item._count.appointments,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  }
}
