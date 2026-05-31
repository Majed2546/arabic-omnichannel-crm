import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { PlatformRole, UserType } from '@prisma/client'

export enum UserStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  INVITED = 'INVITED',
}

export class UserQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  roleId?: string

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType

  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto
}

export class SaveUserDto {
  @IsString()
  @MaxLength(120)
  name!: string

  @IsEmail()
  @MaxLength(180)
  email!: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string

  @IsOptional()
  @IsString()
  roleId?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType

  @IsOptional()
  @IsEnum(UserStatusDto)
  status?: UserStatusDto

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  timezone?: string

  @IsOptional()
  @IsEnum(PlatformRole)
  platformRole?: PlatformRole
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatusDto)
  status!: UserStatusDto
}
