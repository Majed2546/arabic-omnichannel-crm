import { Type } from 'class-transformer'
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator'
import { TenantPlan, TenantStatus } from '@prisma/client'

export class CompanyAdminDto {
  @IsString()
  @IsNotEmpty()
  name!: string

  @IsEmail()
  @IsNotEmpty()
  email!: string
}

export class CreateTenantDto {
  @IsString()
  name!: string

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string

  @IsOptional()
  @IsString()
  logoUrl?: string

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan

  @IsOptional()
  @IsISO8601()
  subscriptionStart?: string

  @IsOptional()
  @IsISO8601()
  subscriptionEnd?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsers?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxChannels?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthlyConversationLimit?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyAdminDto)
  admin?: CompanyAdminDto

  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyAdminDto)
  companyAdmin?: CompanyAdminDto
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string

  @IsOptional()
  @IsString()
  logoUrl?: string

  @IsOptional()
  @IsEnum(TenantPlan)
  plan?: TenantPlan

  @IsOptional()
  @IsISO8601()
  subscriptionStart?: string

  @IsOptional()
  @IsISO8601()
  subscriptionEnd?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxUsers?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxChannels?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthlyConversationLimit?: number
}

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatus)
  status!: TenantStatus
}
