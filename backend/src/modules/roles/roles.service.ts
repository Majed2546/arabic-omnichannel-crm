import { ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { TenantAccessService } from '../../common/tenant-access.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CRM_PERMISSIONS, type CrmPermission } from '../auth/permissions'
import { CreateRoleDto, UpdateRoleDto } from './dto'
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_TENANT_ROLE_NAMES, categoryForPermission } from './role-permissions.catalog'

const SYSTEM_ROLE_NAMES = new Set(['SUPER_ADMIN', 'COMPANY_ADMIN', 'SUPERVISOR', 'AGENT', 'VIEWER'])

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultPermissions()
    await this.ensureDefaultTenantRoles()
  }

  async list(requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const roles = await this.prisma.role.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: this.roleInclude(),
    })

    const items = roles.map((role) => this.toResponse(role, false))
    return user.platformRole === 'SUPER_ADMIN' ? [this.platformSuperAdminRole(), ...items] : items
  }

  async findById(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    if (id === 'platform:SUPER_ADMIN') {
      if (user.platformRole !== 'SUPER_ADMIN') throw new ForbiddenException('Platform role access denied')
      return this.platformSuperAdminRole()
    }

    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.roleInclude(),
    })
    if (!role) throw new NotFoundException('Role not found')
    return this.toResponse(role, false)
  }

  async create(requestedTenantId: string | undefined, user: AuthenticatedUser, dto: CreateRoleDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const name = dto.name.trim()
    if (!name) throw new ConflictException('Role name is required')

    try {
      const role = await this.prisma.role.create({
        data: {
          tenantId,
          name,
          description: dto.description?.trim() || null,
          createdBy: user.id,
          updatedBy: user.id,
        },
        include: this.roleInclude(),
      })
      return this.toResponse(role, false)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Role name already exists')
      }
      throw error
    }
  }

  async update(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, dto: UpdateRoleDto) {
    if (id === 'platform:SUPER_ADMIN') return this.systemRolePlaceholder(user)
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTenantRole(id, tenantId)

    const role = await this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined,
        description: typeof dto.description === 'string' ? dto.description.trim() : undefined,
        updatedBy: user.id,
      },
      include: this.roleInclude(),
    })
    return this.toResponse(role, false)
  }

  async softDelete(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    if (id === 'platform:SUPER_ADMIN') return this.systemRolePlaceholder(user)
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const role = await this.ensureTenantRole(id, tenantId)
    if (SYSTEM_ROLE_NAMES.has(role.name)) {
      return { ...this.toResponse(role, false), systemLocked: true, message: 'System roles cannot be deleted in this release.' }
    }

    await this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: user.id },
    })
    return { id, deleted: true }
  }

  async listPermissions() {
    await this.ensureDefaultPermissions()
    const permissions = await this.prisma.permission.findMany({ orderBy: { key: 'asc' } })
    return permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      category: permission.category,
    }))
  }

  async updatePermissions(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, permissions: CrmPermission[]) {
    if (id === 'platform:SUPER_ADMIN') return this.systemRolePlaceholder(user)
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const role = await this.ensureTenantRole(id, tenantId)
    if (role.name === 'COMPANY_ADMIN') {
      return { ...this.toResponse(role, false), systemLocked: true, message: 'System roles cannot be modified in this release.' }
    }

    const allowed = new Set(CRM_PERMISSIONS)
    const keys = Array.from(new Set(permissions.filter((permission) => allowed.has(permission))))
    await this.ensureDefaultPermissions()
    const permissionRows = await this.prisma.permission.findMany({ where: { key: { in: keys } }, select: { id: true, key: true } })

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } })
      if (permissionRows.length) {
        await tx.rolePermission.createMany({
          data: permissionRows.map((permission) => ({
            roleId: id,
            permissionId: permission.id,
            createdBy: user.id,
          })),
          skipDuplicates: true,
        })
      }
      await tx.role.update({ where: { id }, data: { updatedBy: user.id } })
    })

    return this.findById(id, tenantId, user)
  }

  private async ensureTenantRole(id: string, tenantId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: this.roleInclude(),
    })
    if (!role) throw new NotFoundException('Role not found')
    return role
  }

  private async ensureDefaultPermissions() {
    for (const key of CRM_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { key },
        create: { key, category: categoryForPermission(key) },
        update: { category: categoryForPermission(key) },
      })
    }
  }

  private async ensureDefaultTenantRoles() {
    const tenants = await this.prisma.tenant.findMany({ where: { deletedAt: null }, select: { id: true } })
    for (const tenant of tenants) {
      for (const roleName of DEFAULT_TENANT_ROLE_NAMES) {
        const role = await this.prisma.role.upsert({
          where: { tenantId_name: { tenantId: tenant.id, name: roleName } },
          create: {
            tenantId: tenant.id,
            name: roleName,
            description: this.defaultRoleDescription(roleName),
            createdBy: 'system',
            updatedBy: 'system',
          },
          update: { deletedAt: null, updatedBy: 'system' },
        })
        await this.replaceRolePermissions(role.id, DEFAULT_ROLE_PERMISSIONS[roleName], 'system')
      }
    }
  }

  private async replaceRolePermissions(roleId: string, keys: CrmPermission[], createdBy: string) {
    const permissionRows = await this.prisma.permission.findMany({ where: { key: { in: keys } }, select: { id: true } })
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } })
      if (permissionRows.length) {
        await tx.rolePermission.createMany({
          data: permissionRows.map((permission) => ({ roleId, permissionId: permission.id, createdBy })),
          skipDuplicates: true,
        })
      }
    })
  }

  private roleInclude() {
    return {
      _count: { select: { users: true, rolePermissions: true } },
      rolePermissions: { include: { permission: true } },
    } satisfies Prisma.RoleInclude
  }

  private toResponse(role: Prisma.RoleGetPayload<{ include: ReturnType<RolesService['roleInclude']> }>, platform: boolean) {
    const permissions = role.rolePermissions.map((item) => item.permission.key).sort()
    return {
      id: role.id,
      tenantId: role.tenantId,
      name: role.name,
      description: role.description ?? this.defaultRoleDescription(role.name),
      scope: platform ? 'PLATFORM' : 'TENANT',
      usersCount: role._count.users,
      permissionsCount: permissions.length,
      status: role.deletedAt ? 'INACTIVE' : 'ACTIVE',
      permissions,
      systemLocked: SYSTEM_ROLE_NAMES.has(role.name),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }
  }

  private platformSuperAdminRole() {
    return {
      id: 'platform:SUPER_ADMIN',
      tenantId: null,
      name: 'SUPER_ADMIN',
      description: this.defaultRoleDescription('SUPER_ADMIN'),
      scope: 'PLATFORM',
      usersCount: 1,
      permissionsCount: CRM_PERMISSIONS.length,
      status: 'ACTIVE',
      permissions: [...CRM_PERMISSIONS].sort(),
      systemLocked: true,
      createdAt: null,
      updatedAt: null,
    }
  }

  private systemRolePlaceholder(user: AuthenticatedUser) {
    if (user.platformRole !== 'SUPER_ADMIN') throw new ForbiddenException('Platform role access denied')
    return {
      ...this.platformSuperAdminRole(),
      message: 'System roles cannot be modified in this release.',
    }
  }

  private defaultRoleDescription(roleName: string) {
    const descriptions: Record<string, string> = {
      SUPER_ADMIN: 'مالك المنصة بصلاحيات كاملة على المنصة والشركات.',
      COMPANY_ADMIN: 'مدير الشركة بصلاحيات إدارة مستخدمي وإعدادات الشركة.',
      SUPERVISOR: 'مشرف تشغيلي يدير الوارد والعملاء والتذاكر اليومية.',
      AGENT: 'موظف خدمة يتعامل مع المحادثات والعملاء والمهام التشغيلية.',
      VIEWER: 'مشاهد للبيانات والتقارير دون صلاحيات تعديل حساسة.',
    }
    return descriptions[roleName] ?? 'دور مخصص ضمن الشركة الحالية.'
  }
}
