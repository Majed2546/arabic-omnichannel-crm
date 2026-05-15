import { create } from 'zustand'

interface UiState {
  isPanelOpen: boolean
  currentRoute: string
  toast: { id: string; message: string; tone: 'success' | 'info' | 'warning' } | null
  setPanelOpen: (open: boolean) => void
  setCurrentRoute: (route: string) => void
  showToast: (message: string, tone?: 'success' | 'info' | 'warning') => void
  dismissToast: () => void
}

export const useUiStore = create<UiState>((set) => ({
  isPanelOpen: false,
  currentRoute: '/',
  toast: null,
  setPanelOpen: (open) => set({ isPanelOpen: open }),
  setCurrentRoute: (route) => set({ currentRoute: route }),
  showToast: (message, tone = 'info') => set({ toast: { id: crypto.randomUUID(), message, tone } }),
  dismissToast: () => set({ toast: null }),
}))
