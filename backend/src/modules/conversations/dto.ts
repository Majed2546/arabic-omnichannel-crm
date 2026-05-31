import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ConversationPriority, ConversationStatus } from '@prisma/client'

export class CreateConversationDto {
  @IsString()
  tenantId!: string

  @IsString()
  channelId!: string

  @IsString()
  customerId!: string

  @IsOptional()
  @IsString()
  assignedUserId?: string

  @IsOptional()
  @IsString()
  queueId?: string

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus

  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority

  @IsOptional()
  @IsDateString()
  slaDeadline?: string
}

export class ListConversationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number
}

export class UpdateConversationSummaryDto {
  @IsOptional()
  @IsString()
  lastMessagePreview?: string

  @IsOptional()
  @IsDateString()
  lastMessageAt?: string

  @IsOptional()
  @IsInt()
  unreadCount?: number

  @IsOptional()
  @IsDateString()
  slaDeadline?: string
}

export class AssignConversationDto {
  @IsOptional()
  @IsString()
  assignedUserId?: string

  @IsOptional()
  @IsString()
  assignedTeamId?: string
}
