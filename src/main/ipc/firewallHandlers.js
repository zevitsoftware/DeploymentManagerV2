/**
 * src/main/ipc/firewallHandlers.js
 * GCP / DigitalOcean / MongoDB Atlas firewall IPC handlers.
 * Migrated from legacy main.js firewall section.
 *
 * Channels: fw:load-targets, fw:save-targets, fw:get-interfaces, fw:get-public-ip,
 *           fw:get-gcloud-account, fw:list-gcloud-projects, fw:list-gcp-rules,
 *           fw:list-gcp-sql, fw:update-gcp, fw:update-gcpsql, fw:get-do-account,
 *           fw:list-do-firewalls, fw:update-do, fw:list-atlas-access,
 *           fw:update-atlas, fw:get-allowed-ips
 */
'use strict'

const { execFile } = require('child_process')
const os    = require('os')
const axios = require('axios')
const DigestAuth = require('@mhoc/axios-digest-auth').default
const ch    = require('../../shared/channels')
const { readFullConfig, writeFullConfig } = require('../services/configStore')

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Node.js v20+ requires shell:true to spawn .cmd/.bat files, otherwise EINVAL
function run(cmd, args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, shell: true }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

function atlasDigest(publicKey, privateKey) {
  return new DigestAuth({ username: publicKey, password: privateKey })
}

// ─── Register handlers ────────────────────────────────────────────────────────
function registerFirewallHandlers(ipcMain) {

  // ── Config persistence ────────────────────────────────────────────────────
  ipcMain.handle(ch.FW_LOAD_TARGETS, () => {
    try {
      return { ok: true, targets: readFullConfig().firewalls ?? [] }
    } catch (err) {
      return { ok: false, targets: [], error: err.message }
    }
  })

  ipcMain.handle(ch.FW_SAVE_TARGETS, (e, targets) => {
    try {
      const config = readFullConfig()
      config.firewalls = targets
      writeFullConfig(config)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // ── Network detection ─────────────────────────────────────────────────────
  ipcMain.handle(ch.FW_GET_INTERFACES, () => {
    const nets = os.networkInterfaces()
    const result = []
    const skipPatterns = /loopback|pseudo|isatap|teredo|6to4|vethernet|hyper-v|wsl/i
    for (const [name, addrs] of Object.entries(nets)) {
      if (skipPatterns.test(name)) continue
      for (const addr of addrs) {
        if (addr.family !== 'IPv4' || addr.internal) continue
        if (addr.address.startsWith('169.254.')) continue
        result.push({ label: name, local: addr.address })
        break
      }
    }
    return { ok: true, interfaces: result }
  })

  ipcMain.handle(ch.FW_GET_PUBLIC_IP, async (e, localIP) => {
    try {
      const result = await run('curl.exe', ['-s', '--interface', localIP, '--max-time', '6', 'ifconfig.me'])
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(result)) return { ok: true, ip: result }
      return { ok: false, ip: null }
    } catch (err) {
      return { ok: false, ip: null, error: err.message }
    }
  })

  // ── GCP ───────────────────────────────────────────────────────────────────
  ipcMain.handle(ch.FW_GET_GCLOUD_ACCOUNT, async () => {
    try {
      const email = await run('gcloud.cmd', ['config', 'get-value', 'account'])
      return { ok: true, email: email.trim() }
    } catch { return { ok: false, email: null } }
  })

  ipcMain.handle(ch.FW_LIST_GCLOUD_PROJECTS, async () => {
    try {
      const out  = await run('gcloud.cmd', ['projects', 'list', '--format=json'])
      const list = JSON.parse(out)
      return { ok: true, projects: list.map(p => ({ id: p.projectId, name: p.name })) }
    } catch { return { ok: true, projects: [] } }
  })

  ipcMain.handle(ch.FW_LIST_GCP_RULES, async (e, projectId) => {
    try {
      const out  = await run('gcloud.cmd', ['compute', 'firewall-rules', 'list', '--project=' + projectId, '--format=json'])
      const list = JSON.parse(out)
      return { ok: true, rules: list.map(r => ({ name: r.name, direction: r.direction, sourceRanges: r.sourceRanges || [] })) }
    } catch { return { ok: true, rules: [] } }
  })

  ipcMain.handle(ch.FW_LIST_GCP_SQL, async (e, projectId) => {
    try {
      const out  = await run('gcloud.cmd', ['sql', 'instances', 'list', '--project=' + projectId, '--format=json'])
      const raw  = out.trim()
      const list = (raw === '' || raw === 'null') ? [] : JSON.parse(raw)
      return { ok: true, instances: list.map(i => ({ name: i.name, region: i.region, dbVersion: i.databaseVersion, state: i.state })) }
    } catch (err) { return { ok: false, instances: [], error: err.message } }
  })

  ipcMain.handle(ch.FW_UPDATE_GCP, async (e, { projectId, ruleName, ips }) => {
    if (!projectId || !ruleName) return { ok: false, error: 'Missing projectId or ruleName' }
    const wanted = ips.map(ip => ip.includes('/') ? ip : ip + '/32')
    try {
      const descOut = await run('gcloud.cmd', ['compute', 'firewall-rules', 'describe', ruleName, '--project=' + projectId, '--format=json'])
      const rule    = JSON.parse(descOut)
      const current = (rule.sourceRanges || []).map(r => r.includes('/') ? r : r + '/32')
      const wantedSet  = new Set(wanted)
      const currentSet = new Set(current)
      const alreadyMatch = wanted.every(ip => currentSet.has(ip)) && current.every(ip => wantedSet.has(ip))
      if (alreadyMatch) return { ok: true, skipped: true, reason: `sourceRanges already [${current.join(', ')}]` }
      await run('gcloud.cmd', ['compute', 'firewall-rules', 'update', ruleName, '--source-ranges=' + wanted.join(','), '--project=' + projectId])
      return { ok: true, skipped: false, changes: [`↻ ${ruleName}: [${current.join(', ')}] → [${wanted.join(', ')}]`] }
    } catch (err) { return { ok: false, error: err.message } }
  })

  ipcMain.handle(ch.FW_UPDATE_GCPSQL, async (e, { projectId, instanceName, ifaces }) => {
    if (!projectId || !instanceName) return { ok: false, error: 'Missing projectId or instanceName for GCPSQL update' }
    try {
      const descOut = await run('gcloud.cmd', ['sql', 'instances', 'describe', instanceName, '--project=' + projectId, '--format=json'], 30000)
      const inst    = JSON.parse(descOut)
      const current = (inst.settings?.ipConfiguration?.authorizedNetworks || []).map(n => ({ ...n }))
      const updated = [...current]
      const changes = []

      for (const iface of ifaces) {
        const wanted = iface.publicIP + '/32'
        const idx    = updated.findIndex(n => n.name?.toLowerCase() === iface.label.toLowerCase())
        if (idx >= 0) {
          if (updated[idx].value === wanted) { changes.push(`✓ ${iface.label}: already ${wanted}`) }
          else { const old = updated[idx].value; updated[idx] = { ...updated[idx], value: wanted }; changes.push(`↻ ${iface.label}: ${old} → ${wanted}`) }
        } else {
          updated.push({ kind: 'sql#aclEntry', name: iface.label, value: wanted })
          changes.push(`+ ${iface.label}: added ${wanted}`)
        }
      }

      const hasChanges = changes.some(c => c.startsWith('↻') || c.startsWith('+'))
      if (!hasChanges) return { ok: true, skipped: true, changes, reason: 'All interface IPs already match.' }

      const token = (await run('gcloud.cmd', ['auth', 'print-access-token'])).trim()
      const url   = `https://sqladmin.googleapis.com/v1/projects/${projectId}/instances/${instanceName}`
      await axios.patch(url, { settings: { ipConfiguration: { authorizedNetworks: updated } } }, {
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
      })
      return { ok: true, skipped: false, changes }
    } catch (err) { return { ok: false, error: err.message } }
  })

  // ── DigitalOcean ──────────────────────────────────────────────────────────
  ipcMain.handle(ch.FW_GET_DO_ACCOUNT, async (e, token) => {
    try {
      const actualToken = token || readFullConfig().digitalocean?.token;
      const { data } = await axios.get('https://api.digitalocean.com/v2/account', { headers: { Authorization: 'Bearer ' + actualToken } })
      return { ok: true, email: data.account?.email, uuid: data.account?.uuid }
    } catch (err) { return { ok: false, error: err.response?.data?.message || err.message } }
  })

  ipcMain.handle(ch.FW_LIST_DO_FIREWALLS, async (e, token) => {
    try {
      const actualToken = token || readFullConfig().digitalocean?.token;
      const { data } = await axios.get('https://api.digitalocean.com/v2/firewalls?per_page=50', { headers: { Authorization: 'Bearer ' + actualToken } })
      return { ok: true, firewalls: (data.firewalls || []).map(fw => ({ id: fw.id, name: fw.name, dropletCount: (fw.droplet_ids || []).length })) }
    } catch (err) { return { ok: false, error: err.response?.data?.message || err.message } }
  })

  ipcMain.handle(ch.FW_UPDATE_DO, async (e, { firewallId, token, ips }) => {
    const actualToken = token || readFullConfig().digitalocean?.token;
    const headers    = { Authorization: 'Bearer ' + actualToken, 'Content-Type': 'application/json' }
    const ALL_TRAFFIC = new Set(['0.0.0.0/0', '::/0'])
    const isAllTraffic = (rule) => { const addrs = rule.sources?.addresses || []; return addrs.length > 0 && addrs.every(a => ALL_TRAFFIC.has(a)) }
    try {
      let fId = firewallId;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fId)) {
        const { data: listData } = await axios.get('https://api.digitalocean.com/v2/firewalls?per_page=100', { headers })
        const found = (listData.firewalls || []).find(f => f.name === fId)
        if (!found) return { ok: false, error: 'Firewall not found by name: ' + fId }
        fId = found.id
      }

      const { data }   = await axios.get(`https://api.digitalocean.com/v2/firewalls/${fId}`, { headers })
      const fw         = data.firewall
      const affected   = fw.inbound_rules.filter(r => !isAllTraffic(r) && (r.sources?.addresses || []).length > 0)
      const allPresent = affected.every(rule => ips.every(ip => (rule.sources?.addresses || []).includes(ip)))
      if (allPresent && affected.length > 0) return { ok: true, skipped: true, reason: 'All IPs already set.' }

      const changes = []
      const inboundRules = fw.inbound_rules.map(rule => {
        if (isAllTraffic(rule) || !(rule.sources?.addresses || []).length) return rule
        const label = `TCP:${rule.ports}`; const old = (rule.sources?.addresses || []).join(', '); const nw = ips.join(', ')
        if (old !== nw) changes.push(`↻ ${label}: [${old}] → [${nw}]`); else changes.push(`✓ ${label}: already correct`)
        return { ...rule, sources: { addresses: ips } }
      })
      const outboundRules = fw.outbound_rules.map(r => ({ protocol: r.protocol, ports: r.ports, destinations: { addresses: r.destinations?.addresses || [] } }))
      await axios.put(`https://api.digitalocean.com/v2/firewalls/${fId}`, { name: fw.name, inbound_rules: inboundRules, outbound_rules: outboundRules, droplet_ids: fw.droplet_ids || [], tags: fw.tags || [] }, { headers })
      return { ok: true, skipped: false, changes }
    } catch (err) { return { ok: false, error: err.response?.data?.message || err.message } }
  })

  // ── MongoDB Atlas ─────────────────────────────────────────────────────────
  ipcMain.handle(ch.FW_LIST_ATLAS_ACCESS, async (e, { publicKey, privateKey, groupId }) => {
    try {
      const digest  = atlasDigest(publicKey, privateKey)
      const url     = `https://cloud.mongodb.com/api/atlas/v2/groups/${groupId}/accessList`
      const res     = await digest.request({ method: 'GET', url, headers: { Accept: 'application/vnd.atlas.2023-02-01+json' } })
      const entries = (res.data.results || []).map(e => ({ ip: e.ipAddress || e.cidrBlock, comment: e.comment || '' }))
      return { ok: true, entries }
    } catch (err) { return { ok: false, error: err.response?.data?.detail || err.message } }
  })

  ipcMain.handle(ch.FW_UPDATE_ATLAS, async (e, { publicKey, privateKey, groupId, ips, comment }) => {
    try {
      const digest  = atlasDigest(publicKey, privateKey)
      const url     = `https://cloud.mongodb.com/api/atlas/v2/groups/${groupId}/accessList`
      const listRes = await digest.request({ method: 'GET', url, headers: { Accept: 'application/vnd.atlas.2023-02-01+json' } })
      const currentIPs = new Set((listRes.data.results || []).map(e => e.ipAddress || e.cidrBlock))
      const toAdd   = ips.filter(ip => { const cidr = ip.includes('/') ? ip : ip + '/32'; const plain = ip.replace('/32', ''); return !currentIPs.has(cidr) && !currentIPs.has(plain) })
      if (toAdd.length === 0) return { ok: true, skipped: true, reason: `All IPs already in access list: [${ips.join(', ')}]` }
      const body = toAdd.map(ip => ({ ipAddress: ip.includes('/') ? undefined : ip, cidrBlock: ip.includes('/') ? ip : undefined, comment: comment || `Auto-update ${new Date().toISOString().slice(0, 10)}` }))
      await digest.request({ method: 'POST', url, headers: { Accept: 'application/vnd.atlas.2023-02-01+json', 'Content-Type': 'application/json' }, data: body })
      return { ok: true, skipped: false, changes: toAdd.map(ip => `+ Added ${ip}`) }
    } catch (err) { return { ok: false, error: err.response?.data?.detail || err.message } }
  })

  // ── Unified allowed-IP checker ────────────────────────────────────────────
  ipcMain.handle(ch.FW_GET_ALLOWED_IPS, async (e, target) => {
    try {
      if (target.provider === 'GCP') {
        const ruleName = target.firewallName || target.ruleName || target.ruleNames?.[0]
        if (!ruleName) throw new Error('Missing rule name')
        const descOut = await run('gcloud.cmd', ['compute', 'firewall-rules', 'describe', ruleName, '--project=' + target.projectId, '--format=json'])
        const rule = JSON.parse(descOut)
        return { ok: true, ips: (rule.sourceRanges || []).map(ip => ({ ip, label: '' })) }
      }
      if (target.provider === 'GCPSQL') {
        const sqlInstance = target.firewallName || target.sqlInstance || target.ruleName || target.ruleNames?.[0]
        if (!sqlInstance) throw new Error('Missing instance name')
        const descOut = await run('gcloud.cmd', ['sql', 'instances', 'describe', sqlInstance, '--project=' + target.projectId, '--format=json'])
        const inst = JSON.parse(descOut)
        return { ok: true, ips: (inst.settings?.ipConfiguration?.authorizedNetworks || []).map(n => ({ ip: n.value, label: n.name || '' })) }
      }
      if (target.provider === 'DO') {
        const actualToken = target.token || target.doToken || readFullConfig().digitalocean?.token;
        const headers = { Authorization: 'Bearer ' + actualToken, 'Content-Type': 'application/json' }
        let fId = target.firewallId || target.firewallName
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fId)) {
          const { data: listData } = await axios.get('https://api.digitalocean.com/v2/firewalls?per_page=100', { headers })
          const found = (listData.firewalls || []).find(f => f.name === fId)
          if (!found) throw new Error('Firewall not found by name: ' + fId)
          fId = found.id
        }
        const { data } = await axios.get(`https://api.digitalocean.com/v2/firewalls/${fId}`, { headers })
        const ips = []
        for (const rule of (data.firewall.inbound_rules || [])) for (const addr of (rule.sources?.addresses || [])) ips.push({ ip: addr, label: `TCP:${rule.ports}` })
        return { ok: true, ips }
      }
      if (target.provider === 'ATLAS') {
        const digest  = atlasDigest(target.atlasPublicKey, target.atlasPrivateKey)
        const url     = `https://cloud.mongodb.com/api/atlas/v2/groups/${target.atlasGroupId}/accessList`
        const res     = await digest.request({ method: 'GET', url, headers: { Accept: 'application/vnd.atlas.2023-02-01+json' } })
        return { ok: true, ips: (res.data.results || []).map(e => ({ ip: e.ipAddress || e.cidrBlock, label: e.comment || '' })) }
      }
      return { ok: false, error: 'Unknown provider' }
    } catch (err) { return { ok: false, error: err.response?.data?.detail || err.message } }
  })
}

module.exports = registerFirewallHandlers
