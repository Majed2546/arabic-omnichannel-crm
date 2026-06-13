import { IsEnum, IsOptional, IsString } from 'class-validator'
import { TenantPlan, TenantStatus } from '@prisma/client'

export class UpdateTenantPlanDto {
  @IsEnum(TenantPlan)
  plan!: TenantPlan

  @IsOptional()
  @IsString()
  subscriptionEnd?: string
}

export class UpdateTenantBillingStatusDto {
  @IsEnum(TenantStatus)
  status!: TenantStatus
}
