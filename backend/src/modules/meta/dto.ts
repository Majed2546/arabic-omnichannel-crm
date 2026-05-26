import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator'

export class UpdateMetaSettingsDto {
  @IsOptional()
  @IsString()
  appId?: string

  @IsOptional()
  @IsString()
  configId?: string

  @IsOptional()
  @IsString()
  redirectUri?: string

  @IsOptional()
  @IsString()
  webhookCallbackUrl?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredPermissions?: string[]

  @IsOptional()
  @IsIn(['NOT_STARTED', 'IN_REVIEW', 'APPROVED', 'REJECTED'])
  appReviewStatus?: 'NOT_STARTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'

  @IsOptional()
  @IsBoolean()
  embeddedSignupEnabled?: boolean

  @IsOptional()
  @IsBoolean()
  techProviderVerified?: boolean

  @IsOptional()
  @IsBoolean()
  appLive?: boolean

  @IsOptional()
  @IsBoolean()
  webhookConfigured?: boolean
}

export class EmbeddedSignupStartDto {
  @IsOptional()
  @IsString()
  tenantId?: string
}

export class EmbeddedSignupCallbackDto {
  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  tenantId?: string

  @IsOptional()
  @IsString()
  error?: string
}
