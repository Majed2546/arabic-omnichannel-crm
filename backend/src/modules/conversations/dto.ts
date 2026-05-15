import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
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
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number
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
