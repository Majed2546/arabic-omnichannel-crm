import { IsBoolean, IsDefined, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export enum AutomationTriggerTypeDto {
  NEW_MESSAGE = 'NEW_MESSAGE',
  CONVERSATION_UNASSIGNED = 'CONVERSATION_UNASSIGNED',
  SLA_BREACHED = 'SLA_BREACHED',
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_DUE_SOON = 'APPOINTMENT_DUE_SOON',
  TICKET_CREATED = 'TICKET_CREATED',
  TICKET_STATUS_CHANGED = 'TICKET_STATUS_CHANGED',
}

export enum AutomationLogStatusDto {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export class ListAutomationRulesQueryDto {
  @IsOptional()
  @IsEnum(AutomationTriggerTypeDto)
  triggerType?: AutomationTriggerTypeDto

  @IsOptional()
  @IsString()
  isActive?: string
}

export class ListAutomationLogsQueryDto {
  @IsOptional()
  @IsEnum(AutomationTriggerTypeDto)
  triggerType?: AutomationTriggerTypeDto

  @IsOptional()
  @IsEnum(AutomationLogStatusDto)
  status?: AutomationLogStatusDto

  @IsOptional()
  @IsString()
  ruleId?: string
}

export class SaveAutomationRuleDto {
  @IsString()
  @MaxLength(180)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsEnum(AutomationTriggerTypeDto)
  triggerType!: AutomationTriggerTypeDto

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>

  @IsDefined()
  actions!: unknown

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class ToggleAutomationRuleDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class TestAutomationRuleDto {
  @IsOptional()
  @IsString()
  targetType?: string

  @IsOptional()
  @IsString()
  targetId?: string
}
