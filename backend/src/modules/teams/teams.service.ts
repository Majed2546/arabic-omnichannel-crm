import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, TeamMemberRole, TeamType } from '@prisma/client'
import { TenantAccessService } from '../../common/tenant-access.service'
import { PrismaService } from '../../database/prisma.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AddTeamMemberDto, SaveTeamDto } from './dto'

@Injectable()
export class TeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  list(requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    return this.prisma.team.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: this.teamInclude(),
    }).then((teams) => teams.map((team) => this.toResponse(team)))
  }

  async findById(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    const team = await this.prisma.team.findFirst({ where: { id, tenantId, deletedAt: null }, include: this.teamInclude() })
    if (!team) throw new NotFoundException('Team not found')
    return this.toResponse(team)
  }

  async create(requestedTenantId: string | undefined, user: AuthenticatedUser, dto: SaveTeamDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    try {
      const team = await this.prisma.team.create({
        data: {
          tenantId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          type: dto.type ?? TeamType.SUPPORT,
        },
        include: this.teamInclude(),
      })
      return this.toResponse(team)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Team name already exists')
      throw error
    }
  }

  async update(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, dto: SaveTeamDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTeam(id, tenantId)
    const team = await this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: typeof dto.description === 'string' ? dto.description.trim() || null : undefined,
        type: dto.type,
      },
      include: this.teamInclude(),
    })
    return this.toResponse(team)
  }

  async updateStatus(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, isActive: boolean) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTeam(id, tenantId)
    const team = await this.prisma.team.update({ where: { id }, data: { isActive }, include: this.teamInclude() })
    return this.toResponse(team)
  }

  async softDelete(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTeam(id, tenantId)
    await this.prisma.team.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
    return { id, deleted: true }
  }

  async members(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTeam(id, tenantId)
    return this.prisma.teamMember.findMany({
      where: { tenantId, teamId: id },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      include: { user: { select: { id: true, name: true, email: true, userType: true, status: true } } },
    })
  }

  async addMember(id: string, requestedTenantId: string | undefined, user: AuthenticatedUser, dto: AddTeamMemberDto) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTeam(id, tenantId)
    await this.ensureUser(dto.userId, tenantId)
    const role = dto.role ?? TeamMemberRole.MEMBER

    if (role === TeamMemberRole.LEAD) {
      await this.prisma.teamMember.updateMany({ where: { tenantId, teamId: id, role: TeamMemberRole.LEAD }, data: { role: TeamMemberRole.MEMBER } })
    }

    await this.prisma.teamMember.upsert({
      where: { tenantId_teamId_userId: { tenantId, teamId: id, userId: dto.userId } },
      create: { tenantId, teamId: id, userId: dto.userId, role },
      update: { role },
    })
    return this.members(id, tenantId, user)
  }

  async removeMember(id: string, userId: string, requestedTenantId: string | undefined, user: AuthenticatedUser) {
    const tenantId = this.tenantAccess.requireTenantAccess({ requestedTenantId, user })
    await this.ensureTeam(id, tenantId)
    await this.prisma.teamMember.deleteMany({ where: { tenantId, teamId: id, userId } })
    return { removed: true, teamId: id, userId }
  }

  private async ensureTeam(id: string, tenantId: string) {
    const team = await this.prisma.team.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } })
    if (!team) throw new NotFoundException('Team not found')
  }

  private async ensureUser(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId, deletedAt: null }, select: { id: true } })
    if (!user) throw new BadRequestException('Team member must belong to current tenant')
  }

  private teamInclude() {
    return {
      members: {
        include: { user: { select: { id: true, name: true, email: true, userType: true, status: true } } },
      },
      _count: { select: { members: true } },
    } satisfies Prisma.TeamInclude
  }

  private toResponse(team: Prisma.TeamGetPayload<{ include: ReturnType<TeamsService['teamInclude']> }>) {
    const lead = team.members.find((member) => member.role === TeamMemberRole.LEAD)
    return {
      id: team.id,
      tenantId: team.tenantId,
      name: team.name,
      description: team.description ?? '',
      type: team.type,
      isActive: team.isActive,
      membersCount: team._count.members,
      lead: lead ? lead.user : null,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }
  }
}
