import { create } from 'zustand'
import { toast } from './useAppStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const api = () => window.api  // safe accessor — preload guards this

const useFirewallStore = create((set, get) => ({
  // ─── State ───────────────────────────────────────────────────────────────
  targets:    [],
  interfaces: [],
  logLines:   [],
  selectedIds: [],
  isUpdating:  false,
  isLoading:   false,

  // ─── Actions ─────────────────────────────────────────────────────────────

  loadTargets: async () => {
    try {
      set({ isLoading: true })
      const res = await api().firewall.loadTargets()
      if (res.ok) {
        set({ targets: res.targets ?? [], isLoading: false })
      } else {
        toast.error(res.error ?? 'Failed to load targets')
        set({ isLoading: false })
      }
    } catch (err) {
      toast.error(err.message)
      set({ isLoading: false })
    }
  },

  saveTargets: async (targets) => {
    try {
      const res = await api().firewall.saveTargets(targets)
      if (res.ok) {
        set({ targets })
      } else {
        toast.error(res.error ?? 'Failed to save targets')
      }
    } catch (err) {
      toast.error(err.message)
    }
  },

  refreshIPs: async () => {
    try {
      const res = await api().firewall.getInterfaces()
      if (!res.ok) { toast.error(res.error ?? 'Failed to get interfaces'); return }
      // For each interface, try to detect public IP
      const withPublic = await Promise.all(
        (res.interfaces ?? []).map(async (iface) => {
          try {
            const pub = await api().firewall.getPublicIP(iface.local)
            return { name: iface.label, localIp: iface.local, publicIp: pub.ok ? pub.ip : '—' }
          } catch {
            return { name: iface.label, localIp: iface.local, publicIp: '—' }
          }
        })
      )
      set({ interfaces: withPublic })
    } catch (err) {
      toast.error(err.message)
    }
  },

  updateAllFirewalls: async () => {
    const { targets, selectedIds, interfaces, appendLog, clearLog, saveTargets: save } = get()
    clearLog()
    set({ isUpdating: true })

    // V1 behavior: filter by `enabled` field + optional manual selection
    let toUpdate
    if (selectedIds.length > 0) {
      // User explicitly picked specific targets
      toUpdate = targets.filter(t => selectedIds.includes(t.id))
    } else {
      // Default: only enabled targets (V1 uses enabled checkbox)
      toUpdate = targets.filter(t => t.enabled !== false)
    }

    if (toUpdate.length === 0) {
      appendLog({ ts: new Date().toLocaleTimeString(), type: 'warning', text: 'No enabled targets to update.' })
      set({ isUpdating: false })
      return
    }

    const label = selectedIds.length > 0 ? `${toUpdate.length} selected target(s)` : `${toUpdate.length} enabled target(s)`
    appendLog({ ts: new Date().toLocaleTimeString(), type: 'info', text: `Starting firewall update for ${label}…` })

    const ips = interfaces.map(i => i.publicIp).filter(ip => ip && ip !== '—')
    if (ips.length === 0) {
      appendLog({ ts: new Date().toLocaleTimeString(), type: 'warning', text: '⚠ No public IPs detected. Refresh IPs first.' })
      set({ isUpdating: false })
      return
    }

    appendLog({ ts: new Date().toLocaleTimeString(), type: 'info', text: `Using IPs: [${ips.join(', ')}]` })

    let successCount = 0
    for (const target of toUpdate) {
      const tDesc = target.description ?? target.desc ?? target.provider
      appendLog({ ts: new Date().toLocaleTimeString(), type: 'section', text: `─── ${tDesc} ──────────────────────` })
      try {
        let res
        const prov = (target.provider ?? '').toLowerCase()
        if (prov === 'gcp') {
          res = await api().firewall.updateGcp({ projectId: target.project ?? target.projectId, ruleName: target.ruleNames?.[0] ?? target.ruleName, ips })
        } else if (prov === 'gcpsql') {
          res = await api().firewall.updateGcpSQL({ projectId: target.project ?? target.projectId, instanceName: target.firewallName ?? target.sqlInstance, ifaces: interfaces.map(i => ({ label: i.name, publicIP: i.publicIp })) })
        } else if (prov === 'do') {
          res = await api().firewall.updateDo({ firewallId: target.firewallId ?? target.firewallName, token: target.doToken ?? target.token, ips })
        } else if (prov === 'atlas') {
          res = await api().firewall.updateAtlas({ publicKey: target.atlasPublicKey, privateKey: target.atlasPrivateKey, groupId: target.atlasGroupId, ips, comment: `Auto-update ${tDesc}` })
        }

        if (res?.ok) {
          // Persist status + lastUpdated back to config (same as V1)
          target.status = 'ok'
          target.statusMsg = ''
          target.lastUpdated = new Date().toISOString()
          if (res.skipped) {
            appendLog({ ts: new Date().toLocaleTimeString(), type: 'warning', text: `⏭ ${tDesc} — no change needed` })
            if (res.reason) appendLog({ ts: '', type: 'info', text: `  ${res.reason}` })
          } else {
            appendLog({ ts: new Date().toLocaleTimeString(), type: 'success', text: `✓ ${tDesc} — updated` })
          }
          if (res.changes?.length) res.changes.forEach(c => appendLog({ ts: '', type: 'info', text: `  ${c}` }))
          successCount++
        } else {
          target.status = 'error'
          target.statusMsg = res?.error ?? 'unknown error'
          appendLog({ ts: new Date().toLocaleTimeString(), type: 'error', text: `✗ ${tDesc} — ${res?.error ?? 'unknown error'}` })
        }
      } catch (err) {
        target.status = 'error'
        target.statusMsg = err.message
        appendLog({ ts: new Date().toLocaleTimeString(), type: 'error', text: `✗ ${tDesc} — ${err.message}` })
      }

      // Persist after each target (V1 saves after each iteration)
      const updated = targets.map(t => t.id === target.id ? { ...target } : t)
      set({ targets: updated })
      await save(updated)
    }

    appendLog({ ts: new Date().toLocaleTimeString(), type: 'info', text: `─── Done. ${successCount}/${toUpdate.length} targets updated ──────────` })
    set({ isUpdating: false })
  },

  addTarget: (target) => {
    const id = String(Date.now())
    const next = [...get().targets, { ...target, id, status: 'ok', lastUpdated: Date.now() }]
    get().saveTargets(next)
  },

  updateTarget: async (id, patch) => {
    const next = get().targets.map(t => t.id === id ? { ...t, ...patch } : t)
    await get().saveTargets(next)
  },

  deleteTarget: async (id) => {
    const next = get().targets.filter(t => t.id !== id)
    await get().saveTargets(next)
  },

  toggleSelect: (id) => {
    set(s => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter(i => i !== id)
        : [...s.selectedIds, id]
    }))
  },

  selectAll: () => set(s => ({ selectedIds: s.targets.map(t => t.id) })),
  clearSelection: () => set({ selectedIds: [] }),

  appendLog: (line) => set(s => ({ logLines: [...s.logLines, line] })),
  clearLog: () => set({ logLines: [] }),
}))

export default useFirewallStore
