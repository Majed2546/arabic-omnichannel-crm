import { IsDateString, IsOptional, IsString } from 'class-validator'

export class ReportsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsString()
  tenantId?: string

  @IsOptional()
  @IsString()
  channelType?: string
}
