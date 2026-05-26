import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export enum AppointmentStatusDto {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentMeetingTypeDto {
  IN_PERSON = 'IN_PERSON',
  PHONE = 'PHONE',
  ONLINE = 'ONLINE',
}

export class ListAppointmentsQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsEnum(AppointmentStatusDto)
  status?: AppointmentStatusDto

  @IsOptional()
  @IsString()
  customerId?: string

  @IsOptional()
  @IsString()
  assignedUserId?: string
}

export class SaveAppointmentDto {
  @IsString()
  customerId!: string

  @IsOptional()
  @IsString()
  conversationId?: string

  @IsOptional()
  @IsString()
  assignedUserId?: string

  @IsString()
  @MaxLength(180)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string

  @IsDateString()
  startAt!: string

  @IsDateString()
  endAt!: string

  @IsOptional()
  @IsEnum(AppointmentStatusDto)
  status?: AppointmentStatusDto

  @IsEnum(AppointmentMeetingTypeDto)
  meetingType!: AppointmentMeetingTypeDto

  @IsOptional()
  @IsString()
  @MaxLength(500)
  meetingLink?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatusDto)
  status!: AppointmentStatusDto
}
