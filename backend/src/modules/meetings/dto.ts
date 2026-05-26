import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export enum MeetingProviderDto {
  ZOOM = 'ZOOM',
  WEBEX = 'WEBEX',
  TEAMS = 'TEAMS',
  GOOGLE_MEET = 'GOOGLE_MEET',
  CUSTOM = 'CUSTOM',
}

export enum MeetingStatusDto {
  NOT_CREATED = 'NOT_CREATED',
  LINK_ADDED = 'LINK_ADDED',
  SENT = 'SENT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class ListMeetingsQueryDto {
  @IsOptional()
  @IsEnum(MeetingProviderDto)
  provider?: MeetingProviderDto

  @IsOptional()
  @IsEnum(MeetingStatusDto)
  status?: MeetingStatusDto

  @IsOptional()
  @IsString()
  customerId?: string
}

export class SaveMeetingDto {
  @IsString()
  appointmentId!: string

  @IsEnum(MeetingProviderDto)
  provider!: MeetingProviderDto

  @IsString()
  @MaxLength(800)
  meetingLink!: string

  @IsOptional()
  @IsString()
  @MaxLength(180)
  meetingId?: string

  @IsOptional()
  @IsEnum(MeetingStatusDto)
  status?: MeetingStatusDto

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}

export class UpdateMeetingStatusDto {
  @IsEnum(MeetingStatusDto)
  status!: MeetingStatusDto
}
