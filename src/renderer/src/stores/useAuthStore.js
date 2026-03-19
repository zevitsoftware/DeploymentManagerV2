import { create } from 'zustand'
import { AI_MODES, AI_MODELS } from '../lib/constants'
import { toast } from './useAppStore'

const api = () => window.api

const useAuthStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  isAuthenticated: false,
  user: null,
  isLoading: false,
  authError: null,

  // AI Config
  aiConfig: {
    mode:       AI_MODES.GEMINI_CLI,
    model:      AI_MODELS[0],
    cliReady:   false,
    groqKeys:   [],
    geminiKeys: [],
  },

  // ─── Actions ─────────────────────────────────────────────────────────────

  checkAuth: async () => {
    try {
      set({ isLoading: true, authError: null })
      const res = await api().auth.checkSavedAuth()
      if (res.ok) {
        set({ isAuthenticated: true, user: { email: res.email, provider: 'Google' }, isLoading: false })
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false })
      }
    } catch (err) {
      set({ isAuthenticated: false, isLoading: false, authError: err.message })
    }
  },

  checkGcloud: async () => {
    try {
      const res = await api().auth.checkGcloud()
      return res
    } catch (err) {
      return { ok: false, error: err.message }
    }
  },

  installGcloud: async () => {
    try {
      const res = await api().auth.installGcloud()
      return res
    } catch (err) {
      return { ok: false, error: err.message }
    }
  },

  login: async () => {
    try {
      set({ isLoading: true, authError: null })
      const res = await api().auth.login()
      if (res.ok) {
        set({ isLoading: false, isAuthenticated: true, user: { email: res.email, provider: 'Google' } })
        toast.success(`Logged in as ${res.email}`)
      } else {
        set({ isLoading: false, authError: res.error ?? 'Login failed' })
        toast.error(res.error ?? 'Login failed')
      }
    } catch (err) {
      set({ isLoading: false, authError: err.message })
      toast.error(err.message)
    }
  },

  switchAccount: async () => {
    try {
      set({ isLoading: true, authError: null })
      const res = await api().auth.switchAccount()
      if (res.ok) {
        set({ isLoading: false, isAuthenticated: true, user: { email: res.email, provider: 'Google' } })
        toast.success(`Switched to ${res.email}`)
      } else {
        set({ isLoading: false, authError: res.error ?? 'Switch failed' })
        toast.error(res.error ?? 'Switch failed')
      }
    } catch (err) {
      set({ isLoading: false, authError: err.message })
      toast.error(err.message)
    }
  },

  logout: async () => {
    try {
      await api().auth.logout()
      set({ isAuthenticated: false, user: null })
      toast.info('Logged out')
    } catch (err) {
      toast.error(err.message)
    }
  },

  // ── AI Config ─────────────────────────────────────────────────────────────

  loadAiConfig: async () => {
    try {
      const res = await api().ai.getConfig()
      if (res?.ok) set({ aiConfig: { ...get().aiConfig, ...res.config } })
    } catch { /* ignore */ }
  },

  saveAiConfig: async (config) => {
    try {
      const res = await api().ai.saveConfig(config)
      if (res?.ok) {
        set({ aiConfig: config })
        toast.success('AI config saved')
      } else {
        toast.error(res?.error ?? 'Failed to save AI config')
      }
    } catch (err) { toast.error(err.message) }
  },

  checkCliStatus: async () => {
    try {
      const res = await api().ai.checkCli()
      set(s => ({ aiConfig: { ...s.aiConfig, cliReady: res?.ok ?? false } }))
      return res ?? { ok: false }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  },

  testAi: async (prompt = 'Hello! Reply with: AI is working correctly.') => {
    try {
      const res = await api().ai.test(prompt)
      return res
    } catch (err) {
      return { ok: false, error: err.message }
    }
  },
}))

export default useAuthStore
