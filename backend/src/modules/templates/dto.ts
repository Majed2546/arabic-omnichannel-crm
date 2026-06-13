import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { ChannelType } from '@prisma/client'

export enum WhatsAppTemplateStatusDto {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class ListQuickRepliesQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsEnum(ChannelType)
  channelType?: ChannelType

  @IsOptional()
  @IsString()
  isActive?: string
}

export class SaveQuickReplyDto {
  @IsString()
  @MaxLength(160)
  title!: string

  @IsString()
  @MaxLength(2000)
  content!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string

  @IsOptional()
  @IsEnum(ChannelType)
  channelType?: ChannelType

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class ListWhatsAppTemplatesQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(WhatsAppTemplateStatusDto)
  status?: WhatsAppTemplateStatusDto
}

export class SaveWhatsAppTemplateDto {
  @IsString()
  @MaxLength(180)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(12)
  language?: string

  @IsString()
  @MaxLength(120)
  category!: string

  @IsString()
  @MaxLength(4000)
  body!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[]
}
