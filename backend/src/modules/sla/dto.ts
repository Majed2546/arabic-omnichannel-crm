export type SlaItemsQueryDto = {
  type?: 'conversation' | 'ticket' | 'all'
  status?: string
  assignedUserId?: string
  assignedTeamId?: string
  from?: string
  to?: string
}
