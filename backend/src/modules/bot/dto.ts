export type UpdateBotSettingsDto = {
  isEnabled?: boolean
  welcomeMessage?: string
  handoffMessage?: string
  appointmentEnabled?: boolean
  ticketEnabled?: boolean
  workingHoursOnly?: boolean
  defaultAppointmentDurationMinutes?: number
  defaultAssignedTeamId?: string
  defaultAssignedUserId?: string
}

export type TestBotMessageDto = {
  message: string
  conversationId?: string
}

export type InboundBotMessage = {
  tenantId: string
  conversationId: string
  customerId?: string | null
  customerPhone: string
  content: string
  externalMessageId: string
}
