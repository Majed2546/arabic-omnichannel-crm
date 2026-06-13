import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ChannelStatus, OnboardingOperationMode } from '@prisma/client'

export type TenantWhatsAppConnectionStatus = 'NOT_CONNECTED' | 'PENDING' | 'CONNECTED' | 'REVIEW_REQUIRED' | 'ERROR'

export class TenantWhatsAppOnboardingDto {
  @IsOptional()
  @IsString()
  whatsappNumber?: string

  @IsOptional()
  @IsEnum(OnboardingOperationMode)
  operationMode?: OnboardingOperationMode

  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateTenantChannelStatusDto {
  @IsEnum(ChannelStatus)
  status!: ChannelStatus
}

export class UpdateTenantWhatsAppStatusDto {
  @IsEnum(['NOT_CONNECTED', 'PENDING', 'CONNECTED', 'REVIEW_REQUIRED', 'ERROR'])
  status!: TenantWhatsAppConnectionStatus

  @IsOptional()
  @IsString()
  notes?: string
}
