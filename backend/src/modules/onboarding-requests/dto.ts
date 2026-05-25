import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator'
import { OnboardingOperationMode, OnboardingRequestStatus, TenantPlan } from '@prisma/client'

export class CreateOnboardingRequestDto {
  @IsString()
  @IsNotEmpty()
  organizationName!: string

  @IsOptional()
  @IsString()
  website?: string

  @IsString()
  @IsNotEmpty()
  contactName!: string

  @IsEmail()
  contactEmail!: string

  @IsString()
  @IsNotEmpty()
  contactPhone!: string

  @IsEnum(TenantPlan)
  requestedPlan!: TenantPlan

  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedUsers!: number

  @IsArray()
  @IsString({ each: true })
  requestedChannels!: string[]

  @IsOptional()
  @IsString()
  whatsappNumber?: string

  @IsBoolean()
  hasMetaBusiness!: boolean

  @IsBoolean()
  hasWhatsAppBusinessApp!: boolean

  @IsEnum(OnboardingOperationMode)
  operationMode!: OnboardingOperationMode

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateOnboardingRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  organizationName?: string

  @IsOptional()
  @IsString()
  website?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contactName?: string

  @IsOptional()
  @IsEmail()
  contactEmail?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  contactPhone?: string

  @IsOptional()
  @IsEnum(TenantPlan)
  requestedPlan?: TenantPlan

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedUsers?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requestedChannels?: string[]

  @IsOptional()
  @IsString()
  whatsappNumber?: string

  @IsOptional()
  @IsBoolean()
  hasMetaBusiness?: boolean

  @IsOptional()
  @IsBoolean()
  hasWhatsAppBusinessApp?: boolean

  @IsOptional()
  @IsEnum(OnboardingOperationMode)
  operationMode?: OnboardingOperationMode

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateOnboardingRequestStatusDto {
  @IsEnum(OnboardingRequestStatus)
  status!: OnboardingRequestStatus
}
