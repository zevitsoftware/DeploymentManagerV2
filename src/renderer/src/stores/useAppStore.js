import { create } from 'zustand'
import { PAGES } from '../lib/constants'

const useAppStore = create((set, get) => ({
  // ─── Active page ─────────────────────────────────────────────────────────
  activePage: PAGES.FIREWALL,
  setActivePage: (page) => set({ activePage: page }),

  // ─── Toast queue ─────────────────────────────────────────────────────────
  toasts: [],

  addToast: (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random()
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => get().removeToast(id), duration)
  },

  removeToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

  // ─── Theme ───────────────────────────────────────────────────────────────
  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  // ─── Window state ────────────────────────────────────────────────────────
  isMaximized: false,
  setMaximized: (v) => set({ isMaximized: v }),
}))

// Helper shortcut
export const toast = {
  success: (msg) => useAppStore.getState().addToast(msg, 'success'),
  error:   (msg) => useAppStore.getState().addToast(msg, 'error'),
  info:    (msg) => useAppStore.getState().addToast(msg, 'info'),
  warning: (msg) => useAppStore.getState().addToast(msg, 'warning'),
}

export default useAppStore
