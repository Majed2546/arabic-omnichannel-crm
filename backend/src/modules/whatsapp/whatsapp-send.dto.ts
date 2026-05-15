import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export enum WhatsAppOutboundMessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  IMAGE = 'image',
  DOCUMENT = 'document',
}

export class SendWhatsAppMessageDto {
  @IsString()
  tenantId!: string

  @IsString()
  conversationId!: string

  @IsString()
  recipient!: string

  @IsString()
  message!: string

  @IsEnum(WhatsAppOutboundMessageType)
  messageType!: WhatsAppOutboundMessageType

  @IsOptional()
  @IsBoolean()
  testMode?: boolean
}

export class DirectWhatsAppTestDto {
  @IsString()
  to!: string

  @IsString()
  message!: string
}
