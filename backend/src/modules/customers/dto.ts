import { Type } from 'class-transformer'
import { IsArray, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'
import { ChannelType } from '@prisma/client'

export enum CustomerStatusDto {
  ACTIVE = 'ACTIVE',
  NEW = 'NEW',
  VIP = 'VIP',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}

export class ListCustomersQueryDto {
  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto

  @IsOptional()
  @IsEnum(ChannelType)
  sourceChannel?: ChannelType

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

export class CreateCustomerDto {
  @IsString()
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsEnum(ChannelType)
  sourceChannel?: ChannelType

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string

  @IsOptional()
  @IsDateString()
  lastActivityAt?: string
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string

  @IsOptional()
  @IsEnum(CustomerStatusDto)
  status?: CustomerStatusDto

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]

  @IsOptional()
  @IsEnum(ChannelType)
  sourceChannel?: ChannelType

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string

  @IsOptional()
  @IsDateString()
  lastActivityAt?: string
}
