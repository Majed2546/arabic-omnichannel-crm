import { create } from 'zustand'
import type { RealtimeConnectionState, RealtimeEnvelope } from './realtimeEvents'

type RealtimeState = {
  connectionState: RealtimeConnectionState
  reconnectAttempts: number
  latestEvents: RealtimeEnvelope[]
  lastEventAt: number | null
  setConnectionState: (connectionState: RealtimeConnectionState) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
  recordEvent: (event: RealtimeEnvelope) => void
  clearEvents: () => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connectionState: 'غير متصل',
  reconnectAttempts: 0,
  latestEvents: [],
  lastEventAt: null,
  setConnectionState: (connectionState) => set({ connectionState }),
  incrementReconnectAttempts: () => set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
  resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),
  recordEvent: (event) =>
    set((state) => ({
      latestEvents: [event, ...state.latestEvents].slice(0, 16),
      lastEventAt: event.timestamp,
    })),
  clearEvents: () => set({ latestEvents: [] }),
}))
