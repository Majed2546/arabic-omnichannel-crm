import { IsArray, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export enum TicketStatusDto {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriorityDto {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export class ListTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatusDto)
  status?: TicketStatusDto

  @IsOptional()
  @IsEnum(TicketPriorityDto)
  priority?: TicketPriorityDto

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  assignedUserId?: string

  @IsOptional()
  @IsString()
  customerId?: string
}

export class SaveTicketDto {
  @IsOptional()
  @IsString()
  customerId?: string

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
  @MaxLength(4000)
  description?: string

  @IsOptional()
  @IsEnum(TicketStatusDto)
  status?: TicketStatusDto

  @IsOptional()
  @IsEnum(TicketPriorityDto)
  priority?: TicketPriorityDto

  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsDateString()
  dueAt?: string
}

export class UpdateTicketStatusDto {
  @IsEnum(TicketStatusDto)
  status!: TicketStatusDto
}
