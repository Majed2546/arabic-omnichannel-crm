import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ChannelStatus, OnboardingOperationMode } from '@prisma/client'

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
