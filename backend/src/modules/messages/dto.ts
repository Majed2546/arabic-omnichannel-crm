import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { MessageSenderType, MessageStatus, MessageType } from '@prisma/client'

export class CreateMessageDto {
  @IsString()
  tenantId!: string

  @IsString()
  conversationId!: string

  @IsString()
  channelId!: string

  @IsEnum(MessageSenderType)
  senderType!: MessageSenderType

  @IsOptional()
  @IsString()
  senderId?: string

  @IsString()
  content!: string

  @IsEnum(MessageType)
  messageType!: MessageType

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus

  @IsOptional()
  @IsString()
  externalMessageId?: string

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>
}

export class UpdateMessageStatusDto {
  @IsString()
  tenantId!: string

  @IsEnum(MessageStatus)
  status!: MessageStatus
}

export class ListMessagesQueryDto {
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
