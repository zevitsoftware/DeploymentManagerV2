import { create } from 'zustand'
import { DEPLOY_STEPS_PM2, DEPLOY_STEPS_STATIC } from '../lib/constants.js'
import { toast } from './useAppStore'

const api = () => window.api

const useDeployStore = create((set, get) => ({
  // ─── State ───────────────────────────────────────────────────────────────
  servers:           [],
  connectedServers:  new Set(),
  selectedServerId:  null,
  selectedProjectId: null,
  pm2Processes:      [],
  serverHealth:      null,
  nginxDomains:      [],
  deployInProgress:    false,
  deployStepStatuses:  {},
  deployLog:           [],
  terminalServerId:    null,
  isLoadingHealth:     false,
  aiScanResult:        null,
  isAiScanning:        false,
  gitConfig:           null,

  // ─── Selectors ────────────────────────────────────────────────────────────
  get selectedServer() {
    const { servers, selectedServerId } = get()
    return servers.find(s => s.id === selectedServerId) ?? null
  },
  get selectedProject() {
    const { servers, selectedServerId, selectedProjectId } = get()
    const server = servers.find(s => s.id === selectedServerId)
    return server?.projects?.find(p => p.id === selectedProjectId) ?? null
  },

  // ─── Actions ─────────────────────────────────────────────────────────────

  loadServers: async () => {
    try {
      const servers = await api().deploy.getServers()
      const firstId = servers?.[0]?.id ?? null
      set({
        servers: servers ?? [],
        selectedServerId: firstId,
        selectedProjectId: servers?.[0]?.projects?.[0]?.id ?? null,
      })
    } catch (err) {
      toast.error('Failed to load servers: ' + err.message)
    }
  },

  selectServer: (id) => {
    const server = get().servers.find(s => s.id === id)
    set({ selectedServerId: id, selectedProjectId: server?.projects?.[0]?.id ?? null })
  },
  selectProject: (id) => set({ selectedProjectId: id }),

  connectServer: async (serverId) => {
    try {
      const res = await api().deploy.connectServer(serverId)
      if (res?.ok) {
        set(s => ({
          connectedServers: new Set([...s.connectedServers, serverId]),
          servers: s.servers.map(sv => sv.id === serverId ? { ...sv, status: 'online' } : sv)
        }))
        toast.success('Connected to server')
      } else {
        toast.error(res?.error ?? 'Connection failed')
      }
    } catch (err) {
      toast.error(err.message)
    }
  },

  disconnectServer: async (serverId) => {
    try {
      await api().deploy.disconnectServer(serverId)
      set(s => {
        const next = new Set(s.connectedServers)
        next.delete(serverId)
        return {
          connectedServers: next,
          servers: s.servers.map(sv => sv.id === serverId ? { ...sv, status: 'offline' } : sv)
        }
      })
    } catch (err) {
      toast.error(err.message)
    }
  },

  runDeploy: async (projectId, options = {}) => {
    const { selectedServerId, appendDeployLog, clearDeployLog } = get()
    if (!selectedServerId) return

    // Determine steps based on project type
    const project = get().selectedProject
    const steps   = project?.type === 'static' ? DEPLOY_STEPS_STATIC : DEPLOY_STEPS_PM2
    const statusMap = Object.fromEntries(steps.map(s => [s.id, 'pending']))
    set({ deployInProgress: true, deployStepStatuses: statusMap })
    clearDeployLog()

    // Subscribe to live deploy log events from main process
    const unsubLog  = api().deploy.onDeployLog((e, line) => appendDeployLog(line))

    // Backend sends stepIndex (number 0-7), frontend uses stepId (string).
    // Map backend indices → frontend step IDs per project type.
    const PM2_INDEX_MAP    = ['validate', null, 'git_pull', 'npm_install', 'npm_build', 'pm2_restart', 'health_check', 'complete']
    const STATIC_INDEX_MAP = ['validate', 'npm_build', null, 'upload', null, null, null, 'complete']
    const indexMap = project?.type === 'static' ? STATIC_INDEX_MAP : PM2_INDEX_MAP

    const unsubProg = api().deploy.onDeployProgress((e, data) => {
      // Support both stepId (string) and stepIndex (number) from backend
      let resolvedId = data?.stepId
      if (!resolvedId && data?.stepIndex != null) {
        resolvedId = indexMap[data.stepIndex] ?? null
      }
      if (resolvedId) {
        const status = { success: 'done', done: 'done', failed: 'error', error: 'error', complete: 'done' }[data.status] ?? data.status ?? 'running'
        set(s => ({ deployStepStatuses: { ...s.deployStepStatuses, [resolvedId]: status } }))
      }
    })

    try {
      const res = await api().deploy.runDeploy(selectedServerId, projectId, options.skipInstall, options.customCmds)
      if (!res?.ok) {
        appendDeployLog(`\x1b[31m✗ Deploy failed: ${res?.error ?? 'Unknown error'}\x1b[0m`)
      }
    } catch (err) {
      appendDeployLog(`\x1b[31m✗ ${err.message}\x1b[0m`)
    } finally {
      unsubLog()
      unsubProg()
      set({ deployInProgress: false })
    }
  },

  cancelDeploy: async () => {
    try {
      await api().deploy.cancelDeploy()
      set(s => ({
        deployInProgress: false,
        deployStepStatuses: Object.fromEntries(
          Object.entries(s.deployStepStatuses).map(([k, v]) => [k, v === 'running' ? 'error' : v])
        )
      }))
    } catch (err) {
      toast.error(err.message)
    }
  },

  refreshPM2: async (serverId) => {
    try {
      const res = await api().deploy.pm2Status(serverId ?? get().selectedServerId)
      if (res?.ok) set({ pm2Processes: res.processes ?? [] })
      else toast.error(res?.error ?? 'Failed to fetch PM2 status')
    } catch (err) {
      toast.error(err.message)
    }
  },

  pm2Restart: async (serverId, name) => {
    try {
      const res = await api().deploy.pm2Restart(serverId, name)
      if (res?.ok) { toast.success(`${name} restarted`); await get().refreshPM2(serverId) }
      else toast.error(res?.error ?? 'Restart failed')
    } catch (err) { toast.error(err.message) }
  },

  pm2Stop: async (serverId, name) => {
    try {
      const res = await api().deploy.pm2Stop(serverId, name)
      if (res?.ok) { toast.success(`${name} stopped`); await get().refreshPM2(serverId) }
      else toast.error(res?.error ?? 'Stop failed')
    } catch (err) { toast.error(err.message) }
  },

  fetchHealth: async (serverId) => {
    try {
      set({ isLoadingHealth: true })
      const res = await api().deploy.serverStats(serverId ?? get().selectedServerId)
      if (res?.ok) {
        // Backend returns { ok, cpu, ram, disk, uptime, loadAvg } at top-level
        set({
          serverHealth: {
            cpu: res.cpu,
            ram: res.ram,
            disk: res.disk,
            uptime: res.uptime,
            loadAvg: res.loadAvg,
          },
          isLoadingHealth: false,
        })
      } else { toast.error(res?.error ?? 'Failed to fetch server stats'); set({ isLoadingHealth: false }) }
    } catch (err) {
      toast.error(err.message)
      set({ isLoadingHealth: false })
    }
  },

  runAiScan: async (serverId) => {
    try {
      const sid = serverId ?? get().selectedServerId
      if (!sid) return
      set({ isAiScanning: true, aiScanResult: null })

      // Gather all context data in parallel — the AI handler needs these
      const [statsRes, checksRes, logRes, procRes] = await Promise.all([
        api().deploy.serverStats(sid).catch(() => null),
        api().deploy.securityScan(sid).catch(() => null),
        api().deploy.accessLogSummary(sid).catch(() => null),
        api().deploy.processList(sid).catch(() => null),
      ])

      const server = get().servers.find(s => s.id === sid)
      const res = await api().deploy.aiScan({
        serverName: server?.name ?? server?.host ?? sid,
        stats: statsRes?.ok ? statsRes : null,
        checks: checksRes?.ok ? checksRes.checks : null,
        accessLog: logRes?.ok ? logRes.summary : null,
        processInfo: procRes?.ok ? procRes.summary : null,
      })

      if (res?.ok) set({ isAiScanning: false, aiScanResult: { summary: res.analysis ?? '', provider: res.provider, model: res.model } })
      else { toast.error(res?.error ?? 'AI scan failed'); set({ isAiScanning: false }) }
    } catch (err) {
      toast.error(err.message)
      set({ isAiScanning: false })
    }
  },

  refreshNginx: async (serverId) => {
    try {
      const res = await api().deploy.nginxDomains(serverId ?? get().selectedServerId)
      if (res?.ok) set({ nginxDomains: res.domains ?? [] })
      else toast.error(res?.error ?? 'Failed to fetch Nginx domains')
    } catch (err) { toast.error(err.message) }
  },

  loadGitConfig: async () => {
    try {
      const config = await api().deploy.getGitConfig()
      set({ gitConfig: config })
    } catch { /* ignore */ }
  },

  saveGitConfig: async (config) => {
    try {
      await api().deploy.saveGitConfig(config)
      set({ gitConfig: config })
      toast.success('Git config saved')
    } catch (err) { toast.error(err.message) }
  },

  // ── Server CRUD ──────────────────────────────────────────────────────────
  saveServer: async (server) => {
    try {
      const res = await api().deploy.saveServer(server)
      if (res?.ok) await get().loadServers()
      else toast.error(res?.error ?? 'Failed to save server')
    } catch (err) { toast.error(err.message) }
  },

  deleteServer: async (id) => {
    try {
      await api().deploy.deleteServer(id)
      await get().loadServers()
    } catch (err) { toast.error(err.message) }
  },

  // ── Project CRUD ─────────────────────────────────────────────────────────
  saveProject: async (serverId, project) => {
    try {
      const res = await api().deploy.saveProject(serverId, project)
      if (res?.ok) await get().loadServers()
      else toast.error(res?.error ?? 'Failed to save project')
    } catch (err) { toast.error(err.message) }
  },

  deleteProject: async (serverId, projectId) => {
    try {
      await api().deploy.deleteProject(serverId, projectId)
      await get().loadServers()
    } catch (err) { toast.error(err.message) }
  },

  // ── Local-only helpers (don't touch IPC) ─────────────────────────────────
  appendDeployLog: (line) => set(s => ({ deployLog: [...s.deployLog, line] })),
  clearDeployLog: () => set({ deployLog: [] }),
}))

export default useDeployStore
