import { create } from 'zustand'
import { toast } from './useAppStore'

const api = () => window.api

const useCloudflareStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────────────────────────────
  accounts:          [],
  selectedAccountId: null,
  selectedZoneId:    null,
  dnsRecords:        [],
  tunnels:           [],
  tunnelConfigs:     {},       // { [tunnelId]: { ingress: [...] } }
  selectedTunnelId:  null,
  whoisCache:        {},
  serverIpMap:       {},       // { 'ip': 'serverName' } — from deploy servers
  activeTab:         'dns',
  dnsFilter:         '',
  isLoadingDns:      false,
  isLoadingTunnels:  false,
  isLoadingWhois:    false,

  // ─── Right panel state ────────────────────────────────────────────────────
  zoneDetails:       null,     // { id, name, status, plan, ... }
  zoneSettings:      null,     // { ssl, minify, ... }
  zoneAnalytics:     null,     // CF analytics dashboard data
  isDevMode:         false,
  isLoadingDetails:  false,
  isLoadingAnalytics:false,

  // ─── Derived ──────────────────────────────────────────────────────────────
  get selectedAccount() {
    const { accounts, selectedAccountId } = get()
    return accounts.find(a => a.id === selectedAccountId) ?? null
  },
  get selectedZone() {
    const { accounts, selectedAccountId, selectedZoneId } = get()
    const acc = accounts.find(a => a.id === selectedAccountId)
    return acc?.zones?.find(z => z.id === selectedZoneId) ?? null
  },
  get filteredDnsRecords() {
    const { dnsRecords, dnsFilter } = get()
    if (!dnsFilter) return dnsRecords
    const q = dnsFilter.toLowerCase()
    return dnsRecords.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q)
    )
  },

  // ─── Actions ─────────────────────────────────────────────────────────────

  // Load accounts — does NOT auto-expand zones (lazy: expand on click)
  loadAccounts: async () => {
    try {
      const [raw, whoisCache, servers] = await Promise.all([
        api().cf.getAccounts(),
        api().cf.getWhoisCache().catch(() => ({})),
        api().deploy.getServers().catch(() => []),
      ])
      const accounts = Array.isArray(raw) ? raw : (raw?.accounts ?? raw ?? [])
      // Build IP → server name map
      const serverIpMap = {}
      for (const s of (servers ?? [])) {
        if (s.host) serverIpMap[s.host] = s.name
      }
      set({ accounts, selectedAccountId: null, selectedZoneId: null, whoisCache: whoisCache ?? {}, serverIpMap })
    } catch (err) {
      toast.error('Failed to load accounts: ' + err.message)
    }
  },

  // Lazy-load zones + CF account ID when user expands an account in sidebar
  loadZonesForAccount: async (accountId) => {
    const accounts = get().accounts
    const acc = accounts.find(a => a.id === accountId)
    if (!acc) return
    // If zones already loaded, skip API call
    if (acc.zones) return
    try {
      const [zonesRes, cfAccRes] = await Promise.all([
        api().cf.listZones(acc),
        api().cf.listCfAccounts(acc),
      ])
      const cfAccountId = cfAccRes?.ok && cfAccRes.cfAccounts?.length > 0
        ? cfAccRes.cfAccounts[0].id : null
      const zones = zonesRes?.ok ? (zonesRes.zones ?? []) : []
      set(s => ({
        accounts: s.accounts.map(a => a.id === accountId ? { ...a, zones, cfAccountId } : a),
      }))
    } catch (err) {
      toast.error('Failed to load zones: ' + err.message)
    }
  },

  selectAccount: async (id) => {
    set({ selectedAccountId: id, selectedZoneId: null, dnsRecords: [], tunnels: [],
           zoneDetails: null, zoneSettings: null, zoneAnalytics: null, tunnelConfigs: {} })
  },

  selectZone: (id, accountId) => {
    const acctId = accountId ?? get().selectedAccountId
    if (accountId) set({ selectedAccountId: acctId })
    set({ selectedZoneId: id })
    get().loadDnsRecords({ accountId: acctId, zoneId: id })
    get().loadZoneDetails(id)
    get().loadZoneAnalytics(id)
  },

  // ─── Zone Details / Settings / Analytics ──────────────────────────────────

  loadZoneDetails: async (zoneId) => {
    const zId = zoneId ?? get().selectedZoneId
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account || !zId) return
    try {
      set({ isLoadingDetails: true })
      const [detailsRes, settingsRes] = await Promise.all([
        api().cf.zoneDetails({ account, zoneId: zId }),
        api().cf.zoneSettings({ account, zoneId: zId }),
      ])
      if (detailsRes?.ok) set({ zoneDetails: detailsRes.zone })
      if (settingsRes?.ok) {
        set({
          zoneSettings: settingsRes.settings,
          isDevMode: settingsRes.settings?.development_mode === 'on',
        })
      }
      set({ isLoadingDetails: false })
    } catch (err) {
      set({ isLoadingDetails: false })
    }
  },

  loadZoneAnalytics: async (zoneId, since) => {
    const zId = zoneId ?? get().selectedZoneId
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account || !zId) return
    try {
      set({ isLoadingAnalytics: true })
      const payload = { account, zoneId: zId }
      if (since) payload.since = since
      const res = await api().cf.zoneAnalytics(payload)
      if (res?.ok) set({ zoneAnalytics: res.analytics, isLoadingAnalytics: false })
      else {
        console.warn('[CF Analytics] Failed:', res?.error)
        set({ isLoadingAnalytics: false })
      }
    } catch (err) {
      console.warn('[CF Analytics] Exception:', err)
      set({ isLoadingAnalytics: false })
    }
  },

  fetchZoneAnalytics: async (account, zoneId, since) => {
    if (!account || !zoneId) return
    try {
      set({ isLoadingAnalytics: true })
      const res = await api().cf.zoneAnalytics({ account, zoneId, since })
      if (res?.ok) set({ zoneAnalytics: res.analytics, isLoadingAnalytics: false })
      else {
        console.warn('[CF Analytics] Failed:', res?.error)
        set({ isLoadingAnalytics: false })
      }
    } catch (err) {
      console.warn('[CF Analytics] Exception:', err)
      set({ isLoadingAnalytics: false })
    }
  },

  toggleDevMode: async () => {
    const { selectedAccountId, selectedZoneId, accounts, isDevMode } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account || !selectedZoneId) return
    try {
      const res = await api().cf.devMode({ account, zoneId: selectedZoneId, enabled: !isDevMode })
      if (res?.ok) {
        set({ isDevMode: !isDevMode })
        toast.success(`Dev mode ${!isDevMode ? 'enabled' : 'disabled'}`)
      } else {
        toast.error(res?.error ?? 'Failed to toggle dev mode')
      }
    } catch (err) { toast.error(err.message) }
  },

  loadDnsRecords: async ({ accountId, zoneId } = {}) => {
    const acctId = accountId ?? get().selectedAccountId
    const zId    = zoneId    ?? get().selectedZoneId
    const account = get().accounts.find(a => a.id === acctId)
    try {
      set({ isLoadingDns: true })
      const res = await api().cf.listDns({ account, zoneId: zId })
      if (res?.ok) set({ dnsRecords: res.records ?? [], isLoadingDns: false })
      else { toast.error(res?.error ?? 'Failed to load DNS records'); set({ isLoadingDns: false }) }
    } catch (err) {
      toast.error(err.message)
      set({ isLoadingDns: false })
    }
  },

  // ─── Tunnels ──────────────────────────────────────────────────────────────

  loadTunnels: async () => {
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account) return
    const cfAccountId = account.cfAccountId
    if (!cfAccountId) {
      toast.error('Cloudflare Account ID not available — ensure token has Account:Read permission')
      return
    }
    try {
      set({ isLoadingTunnels: true })
      const res = await api().cf.listTunnels({ account, accountId: cfAccountId })
      if (res?.ok) {
        const tunnelList = res.tunnels ?? []
        set({ tunnels: tunnelList, isLoadingTunnels: false })
        // Fetch ingress config for each tunnel in parallel
        const configs = {}
        await Promise.allSettled(
          tunnelList.map(async t => {
            try {
              const configRes = await api().cf.tunnelConfig({ account, accountId: cfAccountId, tunnelId: t.id })
              if (configRes?.ok) configs[t.id] = configRes.config
            } catch { /* ignore */ }
          })
        )
        set(s => ({ tunnelConfigs: { ...s.tunnelConfigs, ...configs } }))
      } else {
        toast.error(res?.error ?? 'Failed to load tunnels')
        set({ isLoadingTunnels: false })
      }
    } catch (err) {
      toast.error(err.message)
      set({ isLoadingTunnels: false })
    }
  },

  selectTunnel: (id) => set({ selectedTunnelId: id }),
  setActiveTab: (tab)  => {
    set({ activeTab: tab })
    if (tab === 'tunnels') get().loadTunnels()
    if (tab === 'analytics') get().loadZoneAnalytics()
  },
  setDnsFilter: (v)    => set({ dnsFilter: v }),

  // ─── Tunnel CRUD ────────────────────────────────────────────────────────────

  createTunnel: async (name) => {
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account?.cfAccountId) { toast.error('No CF account ID'); return null }
    try {
      const secretBytes = new Uint8Array(32)
      crypto.getRandomValues(secretBytes)
      const tunnelSecret = btoa(String.fromCharCode(...secretBytes))
      const res = await api().cf.createTunnel({
        account, accountId: account.cfAccountId, name, tunnelSecret,
      })
      if (res?.ok) {
        toast.success(`Tunnel "${res.tunnel.name}" created`)
        await get().loadTunnels()
        return res
      } else {
        toast.error(res?.error ?? 'Failed to create tunnel')
        return res
      }
    } catch (err) { toast.error(err.message); return null }
  },

  deleteTunnel: async (tunnelId, tunnelName) => {
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account?.cfAccountId) return
    try {
      const res = await api().cf.deleteTunnel({
        account, accountId: account.cfAccountId, tunnelId,
      })
      if (res?.ok) {
        toast.success(`Tunnel "${tunnelName}" deleted`)
        set(s => ({
          tunnels: s.tunnels.filter(t => t.id !== tunnelId),
          selectedTunnelId: s.selectedTunnelId === tunnelId ? null : s.selectedTunnelId,
        }))
      } else {
        toast.error(res?.error ?? 'Failed to delete tunnel')
      }
    } catch (err) { toast.error(err.message) }
  },

  updateTunnelConfig: async (tunnelId, config) => {
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account?.cfAccountId) return
    try {
      const res = await api().cf.updateTunnelConfig({
        account, accountId: account.cfAccountId, tunnelId, config,
      })
      if (res?.ok) {
        const updatedConfig = res.config ?? config
        set(s => ({ tunnelConfigs: { ...s.tunnelConfigs, [tunnelId]: updatedConfig } }))
        toast.success('Tunnel config saved')
      } else {
        toast.error(res?.error ?? 'Failed to save tunnel config')
      }
    } catch (err) { toast.error(err.message) }
  },

  // ─── Inline DNS Proxy Toggle ──────────────────────────────────────────────

  toggleDnsProxy: async (recordId) => {
    const { selectedAccountId, selectedZoneId, accounts, dnsRecords } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    const r = dnsRecords.find(x => x.id === recordId)
    if (!account || !r || !r.proxiable) return
    try {
      const res = await api().cf.updateDns({
        account, zoneId: selectedZoneId, recordId,
        record: { type: r.type, name: r.name, content: r.content, ttl: r.ttl, proxied: !r.proxied },
      })
      if (res?.ok) {
        set(s => ({
          dnsRecords: s.dnsRecords.map(d => d.id === recordId ? { ...d, proxied: !d.proxied } : d),
        }))
        toast.success(`Proxy ${!r.proxied ? 'enabled' : 'disabled'} for ${r.name}`)
      } else {
        toast.error(res?.error ?? 'Failed to toggle proxy')
      }
    } catch (err) { toast.error(err.message) }
  },

  // ─── WHOIS Key Management ─────────────────────────────────────────────────

  getWhoisKey: async () => {
    try { return await api().cf.getWhoisKey() } catch { return '' }
  },

  saveWhoisKey: async (key) => {
    try {
      await api().cf.saveWhoisKey(key)
      toast.success(key ? 'WhoisXML API key saved' : 'WhoisXML API key cleared')
    } catch (err) { toast.error(err.message) }
  },

  loadWhoisCache: async () => {
    try {
      const cache = await api().cf.getWhoisCache()
      if (cache) set({ whoisCache: cache })
    } catch { /* ignore */ }
  },

  createDnsRecord: async (record) => {
    const { selectedAccountId, selectedZoneId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    try {
      const res = await api().cf.createDns({ account, zoneId: selectedZoneId, record })
      if (res?.ok) {
        toast.success('DNS record created')
        await get().loadDnsRecords()
      } else {
        toast.error(res?.error ?? 'Failed to create DNS record')
      }
    } catch (err) { toast.error(err.message) }
  },

  updateDnsRecord: async (id, patch) => {
    const { selectedAccountId, selectedZoneId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    try {
      const res = await api().cf.updateDns({ account, zoneId: selectedZoneId, recordId: id, record: patch })
      if (res?.ok) {
        toast.success('DNS record updated')
        await get().loadDnsRecords()
      } else {
        toast.error(res?.error ?? 'Failed to update DNS record')
      }
    } catch (err) { toast.error(err.message) }
  },

  deleteDnsRecord: async (id) => {
    const { selectedAccountId, selectedZoneId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    try {
      const res = await api().cf.deleteDns({ account, zoneId: selectedZoneId, recordId: id })
      if (res?.ok) {
        toast.success('DNS record deleted')
        set(s => ({ dnsRecords: s.dnsRecords.filter(r => r.id !== id) }))
      } else {
        toast.error(res?.error ?? 'Failed to delete DNS record')
      }
    } catch (err) { toast.error(err.message) }
  },

  purgeCache: async () => {
    const { selectedAccountId, selectedZoneId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    try {
      const res = await api().cf.purgeCache({ account, zoneId: selectedZoneId })
      if (res?.ok) toast.success('Cache purged successfully')
      else toast.error(res?.error ?? 'Cache purge failed')
    } catch (err) { toast.error(err.message) }
  },

  // ─── Zone CRUD ──────────────────────────────────────────────────────────────

  addZone: async (domain) => {
    const { selectedAccountId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account) { toast.error('No account selected'); return null }
    try {
      const res = await api().cf.addZone({ account, domain, accountId: account.cfAccountId })
      if (res?.ok) {
        toast.success(`Domain "${res.zone.name}" added! Status: ${res.zone.status}`)
        // Refresh zones for this account
        set(s => ({
          accounts: s.accounts.map(a => a.id === selectedAccountId ? { ...a, zones: null } : a),
        }))
        await get().loadZonesForAccount(selectedAccountId)
        return res
      } else {
        toast.error(res?.error ?? 'Failed to add domain')
        return res
      }
    } catch (err) { toast.error(err.message); return null }
  },

  deleteZone: async (zoneId, zoneName) => {
    const { selectedAccountId, selectedZoneId, accounts } = get()
    const account = accounts.find(a => a.id === selectedAccountId)
    if (!account) return
    try {
      const res = await api().cf.deleteZone({ account, zoneId })
      if (res?.ok) {
        toast.success(`Domain "${zoneName}" deleted`)
        // Clear selection if this zone was selected
        if (selectedZoneId === zoneId) {
          set({ selectedZoneId: null, dnsRecords: [], zoneDetails: null, zoneSettings: null, zoneAnalytics: null })
        }
        // Refresh zones
        set(s => ({
          accounts: s.accounts.map(a => a.id === selectedAccountId ? { ...a, zones: null } : a),
        }))
        await get().loadZonesForAccount(selectedAccountId)
      } else {
        toast.error(res?.error ?? 'Failed to delete domain')
      }
    } catch (err) { toast.error(err.message) }
  },

  lookupWhois: async (domain, forceRefresh = false) => {
    try {
      if (!forceRefresh) {
        const cached = get().whoisCache[domain]
        if (cached) return cached
      }
      set({ isLoadingWhois: true })
      // Backend expects { domainName, cfAccountId } — use the CF account ID (not local)
      const { selectedAccountId, accounts } = get()
      const account = accounts.find(a => a.id === selectedAccountId)
      const cfAccountId = account?.cfAccountId ?? selectedAccountId
      const res = await api().cf.whoisLookup({ domainName: domain, cfAccountId })
      set({ isLoadingWhois: false })
      if (res?.ok) {
        set(s => ({ whoisCache: { ...s.whoisCache, [domain]: res } }))
        return res
      }
      toast.error(res?.error ?? 'WHOIS lookup failed')
      return null
    } catch {
      set({ isLoadingWhois: false })
      return null
    }
  },

  refreshAllWhois: async () => {
    const { accounts } = get()
    // Collect all domains from all expanded accounts
    const domains = []
    for (const acc of accounts) {
      if (!acc.zones) continue
      for (const z of acc.zones) {
        domains.push({ domain: z.name, cfAccountId: acc.cfAccountId ?? acc.id })
      }
    }
    if (domains.length === 0) {
      toast.info('Expand at least one account to refresh WHOIS data')
      return
    }
    set({ isLoadingWhois: true })
    toast.info(`Refreshing WHOIS for ${domains.length} domain(s)…`)
    let success = 0
    // Process sequentially to avoid rate-limiting
    for (const { domain, cfAccountId } of domains) {
      try {
        const res = await api().cf.whoisLookup({ domainName: domain, cfAccountId })
        if (res?.ok) {
          set(s => ({ whoisCache: { ...s.whoisCache, [domain]: res } }))
          success++
        }
      } catch { /* continue */ }
    }
    set({ isLoadingWhois: false })
    toast.success(`WHOIS refreshed: ${success}/${domains.length} domains`)
  },

  saveAccount: async (account) => {
    try {
      const res = await api().cf.saveAccount(account)
      if (res?.ok) {
        toast.success(account.id ? 'Account updated' : 'Account added')
        await get().loadAccounts()
      } else {
        toast.error(res?.error ?? 'Failed to save account')
      }
    } catch (err) { toast.error(err.message) }
  },

  deleteAccount: async (id) => {
    try {
      await api().cf.deleteAccount(id)
      await get().loadAccounts()
    } catch (err) { toast.error(err.message) }
  },
}))

export default useCloudflareStore
