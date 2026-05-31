import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { TeamMemberRole, TeamType } from '@prisma/client'

export class SaveTeamDto {
  @IsString()
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsEnum(TeamType)
  type?: TeamType
}

export class UpdateTeamStatusDto {
  @IsBoolean()
  isActive!: boolean
}

export class AddTeamMemberDto {
  @IsString()
  userId!: string

  @IsOptional()
  @IsEnum(TeamMemberRole)
  role?: TeamMemberRole
}
