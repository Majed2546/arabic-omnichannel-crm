import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator'
import { ConversationPriority, TicketPriority } from '@prisma/client'

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  companyDisplayName?: string

  @IsOptional()
  @IsString()
  logoUrl?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  language?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[]

  @IsOptional()
  @IsObject()
  workingHours?: { start?: string; end?: string; slaWarningBeforeMinutes?: number }

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  slaFirstResponseMinutes?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  slaResolutionMinutes?: number

  @IsOptional()
  @IsObject()
  notificationSettings?: {
    newMessage?: boolean
    newTicket?: boolean
    upcomingAppointment?: boolean
    slaBreached?: boolean
    messageSendFailed?: boolean
  }

  @IsOptional()
  @IsEnum(ConversationPriority)
  defaultConversationPriority?: ConversationPriority

  @IsOptional()
  @IsEnum(TicketPriority)
  defaultTicketPriority?: TicketPriority

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  defaultAppointmentDurationMinutes?: number

  @IsOptional()
  @IsString()
  messageSignature?: string
}

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  companyDisplayName?: string

  @IsOptional()
  @IsString()
  logoUrl?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  language?: string
}

export class UpdateSlaSettingsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workingDays?: string[]

  @IsOptional()
  @IsObject()
  workingHours?: { start?: string; end?: string; slaWarningBeforeMinutes?: number }

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10080)
  slaFirstResponseMinutes?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(43200)
  slaResolutionMinutes?: number
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  newMessage?: boolean

  @IsOptional()
  @IsBoolean()
  newTicket?: boolean

  @IsOptional()
  @IsBoolean()
  upcomingAppointment?: boolean

  @IsOptional()
  @IsBoolean()
  slaBreached?: boolean

  @IsOptional()
  @IsBoolean()
  messageSendFailed?: boolean
}
