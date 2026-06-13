import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator'
import type { CrmPermission } from '../auth/permissions'

export class CreateRoleDto {
  @IsString()
  @MaxLength(80)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: CrmPermission[]
}
