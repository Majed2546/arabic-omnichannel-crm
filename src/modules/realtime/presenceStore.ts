import { create } from 'zustand'
import type { AgentPresence } from '../../features/inbox/inboxMock'

type AgentPresenceRecord = {
  agentId: string
  presence: AgentPresence
  updatedAt: number
  source: string
}

type PresenceState = {
  agents: Record<string, AgentPresenceRecord>
  setAgentPresence: (agentId: string, presence: AgentPresence, source: string) => void
  clearPresence: () => void
}

export const usePresenceStore = create<PresenceState>((set) => ({
  agents: {},
  setAgentPresence: (agentId, presence, source) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          agentId,
          presence,
          updatedAt: Date.now(),
          source,
        },
      },
    })),
  clearPresence: () => set({ agents: {} }),
}))
