import { useCallback, useEffect, useRef, useState } from 'react'
import useDeployStore from '../../stores/useDeployStore'
import { toast } from '../../stores/useAppStore'
import { StatusBadge } from '../../components/common/StatusBadge'
import { HealthBar } from '../../components/common/HealthBar'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { MarkdownRenderer } from '../../components/common/MarkdownRenderer'
import XTerminal from '../../components/common/XTerminal'
import { DeployPipeline } from '../../components/deploy/DeployPipeline'
import { useResizablePanel } from '../../hooks/useResizablePanel'
import { useHealthPolling } from '../../hooks/useHealthPolling'
import { useIpcListener } from '../../hooks/useIpcListener'
import {
  Server, Folder, ChevronRight, ChevronDown, Plus, Pencil, Trash2,
  Terminal as TerminalIcon, Play, StopCircle, RefreshCw, Bot,
  Wifi, WifiOff, Globe, X, FileText, Upload, Download, FolderPlus,
  FilePlus, ToggleLeft, ToggleRight, Trash, Eye, EyeOff, ChevronLeft,
  File, FolderOpen, Save, AlertTriangle, Copy, Check, Shield, ListTree, Activity, Scissors, Pause
} from 'lucide-react'
import { cn, formatBytes } from '../../lib/utils'
import { DEPLOY_STEPS_PM2, DEPLOY_STEPS_STATIC } from '../../lib/constants'

const api = () => window.api

// ─── Server Form Modal ────────────────────────────────────────────────────────
function ServerFormModal({ server, onSave, onClose }) {
  const [form, setForm] = useState(server ?? {
    name: '', host: '', port: 22, username: 'root', authType: 'password', password: '',
    provider: 'digitalocean', keyPath: '', passphrase: '', useSudo: false, sudoPassword: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [showSudoPwd, setShowSudoPwd] = useState(false)
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  // Scan state
  const [tempServerId, setTempServerId] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanLog, setScanLog] = useState([])
  const [scanResults, setScanResults] = useState(null) // { pm2, static, systemd }
  const [scanChecked, setScanChecked] = useState({}) // { 'pm2-0': true, ... }
  const scanLogRef = useRef(null)
  const { loadServers } = useDeployStore()

  const PROVIDERS = [
    { v: 'digitalocean', l: 'DigitalOcean' },
    { v: 'gcp', l: 'Google Cloud' },
    { v: 'cloudflare', l: 'Cloudflare (Wrangler)' },
    { v: 'other', l: 'Other / VPS' },
  ]

  // Cleanup temp connection on close
  const handleClose = async () => {
    if (tempServerId) {
      try { await api().deploy.disconnectServer(tempServerId) } catch (_) {}
      // Only delete if it was a temp server (not editing existing)
      if (!server) try { await api().deploy.deleteServer(tempServerId) } catch (_) {}
    }
    onClose()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    setScanResults(null)
    setScanLog([])
    try {
      const saveRes = await api().deploy.saveServer(form)
      if (!saveRes?.ok) { setTestResult({ ok: false, msg: saveRes?.error ?? 'Failed to save' }); return }
      const savedId = saveRes.server?.id ?? form.id
      const connectRes = await api().deploy.connectServer(savedId)
      if (connectRes?.ok) {
        setTestResult({ ok: true, msg: 'Connection successful!' })
        if (!form.id) setForm(f => ({ ...f, id: savedId }))
        setTempServerId(savedId)
        // Keep connection alive for scanning — do NOT disconnect
      } else {
        setTestResult({ ok: false, msg: connectRes?.error ?? 'Connection failed' })
        // Cleanup on failure
        try { await api().deploy.disconnectServer(savedId) } catch (_) {}
        if (!server) try { await api().deploy.deleteServer(savedId) } catch (_) {}
      }
    } catch (err) {
      setTestResult({ ok: false, msg: err.message })
    } finally {
      setTesting(false)
    }
  }

  const handleScan = async () => {
    if (!tempServerId) return
    setScanning(true)
    setScanLog([])
    setScanResults(null)
    setScanChecked({})

    const logHandler = (e, msg) => {
      setScanLog(prev => [...prev, msg])
      // Auto-scroll
      setTimeout(() => { if (scanLogRef.current) scanLogRef.current.scrollTop = scanLogRef.current.scrollHeight }, 50)
    }
    api().deploy.onScanLog(logHandler)

    try {
      const r = await api().deploy.scanProjects(tempServerId)
      if (r?.ok === false) throw new Error(r.error ?? 'Scan failed')
      const pm2 = r.pm2 ?? []
      const staticSites = r.static ?? []
      const systemd = r.systemd ?? []
      setScanResults({ pm2, static: staticSites, systemd })
      // Check all importable by default
      const checks = {}
      pm2.forEach((_, i) => { checks[`pm2-${i}`] = true })
      staticSites.forEach((_, i) => { checks[`static-${i}`] = true })
      setScanChecked(checks)
    } catch (err) {
      setScanLog(prev => [...prev, `❌ ${err.message}`])
    } finally {
      api().deploy.offScanLog(logHandler)
      setScanning(false)
    }
  }

  const handleImport = async () => {
    if (!scanResults || !tempServerId) return
    // Make sure the server itself is saved properly (with real ID if needed)
    const serverData = { ...form, id: tempServerId }
    try {
      const sr = await api().deploy.saveServer(serverData)
      if (sr?.ok === false) throw new Error(sr.error)
      const serverId = tempServerId

      let importCount = 0
      for (const [key, checked] of Object.entries(scanChecked)) {
        if (!checked) continue
        const [type, idxStr] = key.split('-')
        const idx = parseInt(idxStr, 10)
        let project = null

        if (type === 'pm2' && scanResults.pm2[idx]) {
          const app = scanResults.pm2[idx]
          project = {
            id: `prj_${Date.now()}_${importCount}`, name: app.name, type: 'pm2',
            remotePath: app.cwd, repo: app.repo || '', branch: app.branch || 'main',
            pm2Config: app.pm2Config || 'ecosystem.config.js', buildCommand: '',
            localPath: '', distFolder: '', webRoot: '', backup: false, cfProjectName: '',
          }
        } else if (type === 'static' && scanResults.static[idx]) {
          const site = scanResults.static[idx]
          project = {
            id: `prj_${Date.now()}_${importCount}`, name: site.name, type: 'static',
            webRoot: site.webRoot, localPath: '', distFolder: 'dist', backup: true,
            buildCommand: '', repo: site.repo || '', branch: site.branch || 'main',
            remotePath: '', pm2Config: '', cfProjectName: '',
          }
        }

        if (project) {
          await api().deploy.saveProject(serverId, project)
          importCount++
        }
      }

      if (importCount > 0) {
        toast.success(`Imported ${importCount} project(s)`)
        await loadServers()
        setTempServerId(null) // Don't cleanup on close since we want to keep the server
        onClose()
      } else {
        toast.warn('No projects selected — check at least one to import.')
      }
    } catch (err) {
      toast.error('Import failed: ' + err.message)
    }
  }

  const toggleCheck = (key) => setScanChecked(prev => ({ ...prev, [key]: !prev[key] }))
  const checkAll = (val) => setScanChecked(prev => Object.fromEntries(Object.keys(prev).map(k => [k, val])))
  const checkedCount = Object.values(scanChecked).filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-lg mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">{server ? 'Edit Server' : 'Add Server'}</h3>
          <button onClick={handleClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); setTempServerId(null); onClose() }} className="p-5 space-y-3">
          {/* Server Name + Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Server Name</label>
              <input value={form.name ?? ''} placeholder="e.g. VPS-1 DigitalOcean" onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Provider</label>
              <select value={form.provider ?? 'digitalocean'} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none">
                {PROVIDERS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </div>
          </div>

          {/* SSH-specific fields — hidden for Cloudflare */}
          {form.provider !== 'cloudflare' && (
            <>
              {/* Host + Port */}
              <div className="grid grid-cols-[3fr_1fr] gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Host / IP Address</label>
                  <input value={form.host ?? ''} placeholder="e.g. 164.90.xxx.xxx or example.com" onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                    className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Port</label>
                  <input value={form.port ?? 22} type="number" onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 22 }))}
                    className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none" />
                </div>
              </div>

              {/* Username + Auth Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">SSH Username</label>
                  <input value={form.username ?? 'root'} placeholder="e.g. root" onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Auth Type</label>
                  <div className="flex items-center gap-4 h-[38px]">
                    <label className="flex items-center gap-1.5 text-sm text-text-primary cursor-pointer">
                      <input type="radio" name="srv-auth" value="password" checked={form.authType === 'password'}
                        onChange={() => setForm(f => ({ ...f, authType: 'password' }))} className="accent-indigo-500" />
                      Password
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-text-primary cursor-pointer">
                      <input type="radio" name="srv-auth" value="sshkey" checked={form.authType === 'sshkey'}
                        onChange={() => setForm(f => ({ ...f, authType: 'sshkey' }))} className="accent-indigo-500" />
                      SSH Key
                    </label>
                  </div>
                </div>
              </div>

              {/* Password field */}
              {form.authType === 'password' && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Password</label>
                  <div className="flex gap-1">
                    <input value={form.password ?? ''} type={showPwd ? 'text' : 'password'} placeholder="Server password" onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="px-2 text-text-dim hover:text-text-primary border border-border-base rounded-md">
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {/* SSH Key fields */}
              {form.authType === 'sshkey' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">SSH Key File (.pem / .ppk)</label>
                    <div className="flex gap-1">
                      <input value={form.keyPath ?? ''} readOnly placeholder="~/.ssh/id_rsa"
                        className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono" />
                      <button type="button" onClick={async () => {
                        const path = await api().deploy.browseFile({ title: 'Select SSH Key', filters: [{ name: 'Key Files', extensions: ['pem', 'ppk', 'key'] }, { name: 'All Files', extensions: ['*'] }] })
                        if (path) setForm(f => ({ ...f, keyPath: path }))
                      }} className="px-3 text-xs text-text-muted border border-border-base rounded-md hover:text-text-primary">Browse…</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Key Passphrase <span className="text-text-dim font-normal">(optional)</span></label>
                    <div className="flex gap-1">
                      <input value={form.passphrase ?? ''} type={showPassphrase ? 'text' : 'password'} placeholder="Leave blank if key has no passphrase" onChange={e => setForm(f => ({ ...f, passphrase: e.target.value }))}
                        className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
                      <button type="button" onClick={() => setShowPassphrase(v => !v)} className="px-2 text-text-dim hover:text-text-primary border border-border-base rounded-md">
                        {showPassphrase ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Use Sudo */}
              <div>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input type="checkbox" checked={form.useSudo ?? false} onChange={e => setForm(f => ({ ...f, useSudo: e.target.checked }))} className="accent-indigo-500" />
                  Use <code className="px-1.5 py-0.5 bg-bg-primary border border-border-base rounded text-xs font-mono">sudo</code> for privileged operations
                </label>
              </div>

              {form.useSudo && (
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Sudo Password <span className="text-text-dim font-normal">(leave blank for NOPASSWD)</span></label>
                  <div className="flex gap-1">
                    <input value={form.sudoPassword ?? ''} type={showSudoPwd ? 'text' : 'password'} placeholder="Leave blank if sudo doesn't require a password" onChange={e => setForm(f => ({ ...f, sudoPassword: e.target.value }))}
                      className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
                    <button type="button" onClick={() => setShowSudoPwd(v => !v)} className="px-2 text-text-dim hover:text-text-primary border border-border-base rounded-md">
                      {showSudoPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cloudflare hint */}
          {form.provider === 'cloudflare' && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Globe size={16} className="text-blue-400 flex-shrink-0" />
              <p className="text-xs text-text-muted">
                Cloudflare deployments use the <code className="px-1 py-0.5 bg-bg-primary border border-border-base rounded text-[10px] font-mono">wrangler</code> CLI locally. No SSH connection needed.
              </p>
            </div>
          )}

          {/* Test Connection Result */}
          {testResult && (
            <div className={cn('px-3 py-2 rounded-lg text-xs', testResult.ok ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20')}>
              {testResult.ok ? '✓' : '✗'} {testResult.msg}
            </div>
          )}

          {/* ── Scan Projects Section ─────────────────────────────────── */}
          {testResult?.ok && tempServerId && (
            <div className="border border-indigo-500/20 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-indigo-500/10">
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Project Scanner</span>
                <button type="button" onClick={handleScan} disabled={scanning}
                  className="text-xs flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md font-medium hover:bg-indigo-500/30 disabled:opacity-50">
                  {scanning ? <><LoadingSpinner size={11} color="#818cf8" />Scanning…</> : <>🔍 Scan Projects</>}
                </button>
              </div>

              {/* Scan log */}
              {scanLog.length > 0 && (
                <div ref={scanLogRef} className="max-h-28 overflow-y-auto bg-bg-primary/60 px-3 py-2 border-b border-border-base/40">
                  {scanLog.map((line, i) => (
                    <p key={i} className="text-[10px] font-mono text-text-dim leading-tight">{line}</p>
                  ))}
                </div>
              )}

              {/* Scan results */}
              {scanResults && (
                <div className="max-h-60 overflow-y-auto">
                  {(scanResults.pm2.length + scanResults.static.length + scanResults.systemd.length) === 0 ? (
                    <p className="text-xs text-text-dim text-center py-4">No projects discovered on this server.</p>
                  ) : (
                    <>
                      {/* PM2 */}
                      {scanResults.pm2.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/5">PM2 Processes ({scanResults.pm2.length})</div>
                          {scanResults.pm2.map((app, i) => {
                            const key = `pm2-${i}`
                            return (
                              <label key={key} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-bg-hover/40 transition-colors border-b border-border-base/20">
                                <input type="checkbox" checked={scanChecked[key] ?? false} onChange={() => toggleCheck(key)} className="accent-indigo-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-text-primary">📦 {app.name}</span>
                                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded', app.status === 'online' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>{app.status}</span>
                                    {app.port && <span className="text-[9px] text-text-dim">:{app.port}</span>}
                                  </div>
                                  <p className="text-[10px] font-mono text-text-dim truncate mt-0.5">{app.cwd}</p>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {app.domain
                                      ? <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded">🌐 {app.domain}{app.ssl ? ' 🔒' : ''}</span>
                                      : <span className="text-[10px] text-text-dim">No domain detected</span>}
                                    {app.repo && <span className="text-[10px] text-text-dim truncate">📂 {app.repo.replace(/^https?:\/\//, '').replace(/\.git$/, '')}</span>}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </>
                      )}

                      {/* Static sites */}
                      {scanResults.static.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-green-400 bg-green-500/5">Static Sites ({scanResults.static.length})</div>
                          {scanResults.static.map((site, i) => {
                            const key = `static-${i}`
                            return (
                              <label key={key} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-bg-hover/40 transition-colors border-b border-border-base/20">
                                <input type="checkbox" checked={scanChecked[key] ?? false} onChange={() => toggleCheck(key)} className="accent-indigo-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-text-primary">🌐 {site.name}</span>
                                    {site.ssl && <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded">SSL 🔒</span>}
                                  </div>
                                  <p className="text-[10px] font-mono text-text-dim truncate mt-0.5">Root: {site.webRoot}</p>
                                </div>
                              </label>
                            )
                          })}
                        </>
                      )}

                      {/* Systemd info only */}
                      {scanResults.systemd.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/5">Systemd Services — info only ({scanResults.systemd.length})</div>
                          {scanResults.systemd.map((svc, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 opacity-60">
                              <span className="text-[10px]">⚙️</span>
                              <span className="text-[11px] font-mono text-text-muted">{svc.name}</span>
                              <span className="text-[9px] bg-green-500/15 text-green-400 px-1.5 py-0.5 rounded">{svc.status}</span>
                              <span className="text-[10px] text-text-dim flex-1 truncate">{svc.description}</span>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Import controls */}
                      {(scanResults.pm2.length + scanResults.static.length) > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border-base/40 bg-bg-primary/40">
                          <button type="button" onClick={() => checkAll(false)} className="text-[10px] text-text-dim hover:text-text-muted">☐ Uncheck All</button>
                          <button type="button" onClick={() => checkAll(true)} className="text-[10px] text-text-dim hover:text-text-muted">☑ Check All</button>
                          <div className="flex-1" />
                          <button type="button" onClick={handleImport} disabled={checkedCount === 0}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-accent-deploy text-white rounded-md font-medium hover:bg-green-600 disabled:opacity-50 transition-colors">
                            📥 Import Selected ({checkedCount})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:text-text-primary">Cancel</button>
            <button type="button" onClick={handleTest} disabled={testing || !form.host}
              className="px-4 py-1.5 text-sm bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-md font-medium hover:bg-indigo-500/30 disabled:opacity-50 flex items-center gap-1.5">
              {testing ? <><LoadingSpinner size={11} color="#818cf8" />Testing…</> : <>→ Test Connection</>}
            </button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-accent-deploy hover:bg-green-600 text-white rounded-md font-medium flex items-center gap-1.5">
              <Save size={13} /> Save Server
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Server Dir Browser (for browsing remote directories via SFTP) ────────────
function ServerDirBrowser({ serverId, initialPath, onSelect, onClose }) {
  const [currentPath, setCurrentPath] = useState(initialPath || '/')
  const [dirs, setDirs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadDir = useCallback(async (dirPath) => {
    setLoading(true)
    setError(null)
    try {
      const r = await api().deploy.browseServerDir(serverId, dirPath)
      if (r?.ok === false) throw new Error(r.error)
      setDirs(r.dirs ?? [])
      setCurrentPath(dirPath)
    } catch (e) {
      setError(e.message)
      setDirs([])
    } finally {
      setLoading(false)
    }
  }, [serverId])

  useEffect(() => { loadDir(currentPath) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goUp = () => {
    const parts = currentPath.replace(/\/$/, '').split('/')
    parts.pop()
    loadDir(parts.join('/') || '/')
  }

  return (
    <div className="border border-border-base rounded-lg bg-bg-primary overflow-hidden mt-1">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-base text-xs">
        <Folder size={12} className="text-yellow-400 flex-shrink-0" />
        <span className="flex-1 font-mono text-text-muted text-[11px] truncate">{currentPath}</span>
        <button type="button" onClick={goUp} className="px-2 py-0.5 text-[10px] border border-border-base text-text-muted rounded hover:bg-bg-hover">⬆ Up</button>
        <button type="button" onClick={() => onSelect(currentPath)} className="px-2 py-0.5 text-[10px] bg-accent-deploy text-white rounded font-medium">✔ Select</button>
        <button type="button" onClick={onClose} className="px-1.5 py-0.5 text-[10px] text-text-dim hover:text-text-primary">✕</button>
      </div>
      <div className="max-h-40 overflow-y-auto py-1">
        {loading && <p className="text-[11px] text-text-dim px-3 py-2">Loading…</p>}
        {error && <p className="text-[11px] text-red-400 px-3 py-2">{error}</p>}
        {!loading && !error && dirs.length === 0 && <p className="text-[11px] text-text-dim px-3 py-2">No subdirectories.</p>}
        {!loading && dirs.map(d => (
          <button key={d} type="button" onClick={() => loadDir((currentPath === '/' ? '' : currentPath) + '/' + d)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs font-mono text-text-primary hover:bg-bg-hover transition-colors">
            <span className="text-yellow-400">📁</span>{d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Project Form Modal ───────────────────────────────────────────────────────
function ProjectFormModal({ serverId, project, server, onSave, onClose }) {
  const isEdit = !!project
  const isCfServer = server?.provider === 'cloudflare'

  const [form, setForm] = useState(() => {
    if (project) {
      return {
        id: project.id,
        name: project.name ?? '',
        type: project.type ?? 'pm2',
        remotePath: project.remotePath ?? '',
        repo: project.repo ?? project.repoUrl ?? '',
        branch: project.branch ?? 'main',
        pm2Config: project.pm2Config ?? 'ecosystem.config.js',
        localPath: project.localPath ?? '',
        distFolder: project.distFolder ?? 'dist',
        webRoot: project.webRoot ?? '',
        backup: project.backup !== false,
        buildCommand: project.buildCommand ?? '',
        cfProjectName: project.cfProjectName ?? '',
      }
    }
    return {
      name: '', type: isCfServer ? 'cf-pages' : 'pm2', remotePath: '', repo: '', branch: 'main',
      pm2Config: 'ecosystem.config.js', localPath: '', distFolder: 'dist', webRoot: '',
      backup: true, buildCommand: '', cfProjectName: '',
    }
  })

  const [showDirBrowser, setShowDirBrowser] = useState(null) // field id to receive the path
  const [readingGit, setReadingGit] = useState(false)

  // Use a ref to track current form state for async callbacks (avoids stale closure)
  const formRef = useRef(form)
  useEffect(() => { formRef.current = form }, [form])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const type = form.type
  const isPM2 = type === 'pm2'
  const isStatic = type === 'static'
  const isCF = type === 'cf-pages' || type === 'cf-workers'

  // Auto-read git remote from server (mirrors V1's autoReadGitRemote logic)
  const autoReadGitRemote = useCallback(async (dirPath) => {
    if (!serverId || !dirPath) return
    setReadingGit(true)
    try {
      const r = await api().deploy.readGitRemote(serverId, dirPath)
      if (r?.ok && r.remoteUrl) {
        // Only fill if field is currently empty (don't overwrite user's input)
        // Use ref to read latest form state, not stale closure
        const currentForm = formRef.current
        if (!currentForm.repo || !currentForm.repo.trim()) {
          setForm(f => ({ ...f, repo: r.remoteUrl }))
          toast.info('Git remote detected: ' + r.remoteUrl)
        }
        // Branch: fill if it's still the default "main" or empty
        if (r.branch && r.branch !== 'HEAD' && (!currentForm.branch || !currentForm.branch.trim() || currentForm.branch === 'main')) {
          setForm(f => ({ ...f, branch: r.branch }))
        }
      }
    } catch (_) { /* Silent — not every dir is a git repo */ }
    finally { setReadingGit(false) }
  }, [serverId])

  const handleDirSelect = (fieldKey, path) => {
    setForm(f => ({ ...f, [fieldKey]: path }))
    setShowDirBrowser(null)
    if (fieldKey === 'remotePath') autoReadGitRemote(path)
  }

  const handleBrowseLocal = async (fieldKey) => {
    try {
      const p = await api().deploy.browseFolder({ title: 'Select Local Project Folder' })
      if (p) set(fieldKey, p)
    } catch (_) { /* cancelled */ }
  }

  const collectProject = () => {
    if (!form.name.trim()) { toast.warn('Project name is required.'); return null }
    const base = { id: form.id ?? `prj_${Date.now()}`, name: form.name.trim(), type: form.type, buildCommand: form.buildCommand.trim() }

    if (isPM2) {
      if (!form.remotePath.trim()) { toast.warn('Remote path is required.'); return null }
      if (!form.repo.trim()) { toast.warn('Git repo URL is required.'); return null }
      return { ...base, remotePath: form.remotePath.trim(), repo: form.repo.trim(), branch: form.branch.trim() || 'main',
        pm2Config: form.pm2Config.trim() || 'ecosystem.config.js', localPath: '', distFolder: '', webRoot: '', backup: false, cfProjectName: '' }
    }
    if (isCF) {
      if (!form.localPath.trim()) { toast.warn('Local path is required.'); return null }
      return { ...base, localPath: form.localPath.trim(), cfProjectName: form.cfProjectName.trim(),
        distFolder: form.distFolder.trim() || 'dist', remotePath: '', repo: '', branch: '', pm2Config: '', webRoot: '', backup: false }
    }
    // static
    if (!form.localPath.trim()) { toast.warn('Local path is required.'); return null }
    if (!form.webRoot.trim()) { toast.warn('Web root is required.'); return null }
    return { ...base, localPath: form.localPath.trim(), webRoot: form.webRoot.trim(),
      distFolder: form.distFolder.trim() || 'dist', backup: form.backup, remotePath: '', repo: '', branch: '', pm2Config: '', cfProjectName: '' }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const p = collectProject()
    if (!p) return
    onSave(serverId, p)
    onClose()
  }

  const inputCls = 'w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-lg mx-4 animate-slide-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">{isEdit ? 'Edit Project' : 'Add Project'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Name + Type */}
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Project Name</label>
              <input value={form.name} placeholder="e.g. My Backend API" onChange={e => set('name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
              <div className="flex flex-col gap-1 mt-0.5">
                {!isCfServer && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs text-text-primary cursor-pointer">
                      <input type="radio" name="prj-type" value="pm2" checked={type === 'pm2'} onChange={() => set('type', 'pm2')} className="accent-green-500" /> PM2
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-text-primary cursor-pointer">
                      <input type="radio" name="prj-type" value="static" checked={type === 'static'} onChange={() => set('type', 'static')} className="accent-green-500" /> Static
                    </label>
                  </>
                )}
                {isCfServer && (
                  <>
                    <label className="flex items-center gap-1.5 text-xs text-text-primary cursor-pointer">
                      <input type="radio" name="prj-type" value="cf-pages" checked={type === 'cf-pages'} onChange={() => set('type', 'cf-pages')} className="accent-green-500" /> CF Pages
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-text-primary cursor-pointer">
                      <input type="radio" name="prj-type" value="cf-workers" checked={type === 'cf-workers'} onChange={() => set('type', 'cf-workers')} className="accent-green-500" /> CF Workers
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── PM2 Fields ── */}
          {isPM2 && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Remote Path</label>
                <div className="flex gap-1">
                  <input value={form.remotePath} placeholder="/var/www/node/myBackend"
                    onChange={e => set('remotePath', e.target.value)}
                    onBlur={() => { if (form.remotePath.startsWith('/')) autoReadGitRemote(form.remotePath) }}
                    className={cn(inputCls, 'flex-1 font-mono text-xs')} />
                  <button type="button" onClick={() => setShowDirBrowser(showDirBrowser === 'remotePath' ? null : 'remotePath')}
                    className="px-2.5 text-xs text-text-muted border border-border-base rounded-md hover:text-text-primary hover:bg-bg-hover flex-shrink-0">📂</button>
                </div>
                {showDirBrowser === 'remotePath' && (
                  <ServerDirBrowser serverId={serverId} initialPath={form.remotePath || '/'}
                    onSelect={(p) => handleDirSelect('remotePath', p)} onClose={() => setShowDirBrowser(null)} />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">
                  Git Repo URL {readingGit && <span className="text-text-dim font-normal">🔍 Reading…</span>}
                </label>
                <input value={form.repo} placeholder="github.com/user/repo.git" onChange={e => set('repo', e.target.value)} className={cn(inputCls, 'font-mono text-xs')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Branch</label>
                  <input value={form.branch} onChange={e => set('branch', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">PM2 Config File</label>
                  <input value={form.pm2Config} onChange={e => set('pm2Config', e.target.value)} className={cn(inputCls, 'font-mono text-xs')} />
                </div>
              </div>
            </>
          )}

          {/* ── Static Fields ── */}
          {isStatic && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Local Project Path</label>
                <div className="flex gap-1">
                  <input value={form.localPath} readOnly placeholder="D:\PROJECT\admin-panel" className={cn(inputCls, 'flex-1 font-mono text-xs')} />
                  <button type="button" onClick={() => handleBrowseLocal('localPath')}
                    className="px-2.5 text-xs text-text-muted border border-border-base rounded-md hover:text-text-primary hover:bg-bg-hover flex-shrink-0">Browse…</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Dist Folder</label>
                  <input value={form.distFolder} onChange={e => set('distFolder', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">Remote Web Root</label>
                  <div className="flex gap-1">
                    <input value={form.webRoot} placeholder="/var/www/html/domain.com"
                      onChange={e => set('webRoot', e.target.value)}
                      className={cn(inputCls, 'flex-1 font-mono text-xs')} />
                    <button type="button" onClick={() => setShowDirBrowser(showDirBrowser === 'webRoot' ? null : 'webRoot')}
                      className="px-2 text-xs text-text-muted border border-border-base rounded-md hover:text-text-primary hover:bg-bg-hover flex-shrink-0">📂</button>
                  </div>
                </div>
              </div>
              {showDirBrowser === 'webRoot' && (
                <ServerDirBrowser serverId={serverId} initialPath={form.webRoot || '/'}
                  onSelect={(p) => handleDirSelect('webRoot', p)} onClose={() => setShowDirBrowser(null)} />
              )}
              <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                <input type="checkbox" checked={form.backup} onChange={e => set('backup', e.target.checked)} className="accent-green-500" />
                Backup old files before deploy <code className="px-1.5 py-0.5 bg-bg-primary border border-border-base rounded text-[10px] font-mono">.bak</code>
              </label>
            </>
          )}

          {/* ── Cloudflare Fields ── */}
          {isCF && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Local Project Path (Root directory)</label>
                <div className="flex gap-1">
                  <input value={form.localPath} readOnly placeholder="D:\PROJECT\my-app" className={cn(inputCls, 'flex-1 font-mono text-xs')} />
                  <button type="button" onClick={() => handleBrowseLocal('localPath')}
                    className="px-2.5 text-xs text-text-muted border border-border-base rounded-md hover:text-text-primary hover:bg-bg-hover flex-shrink-0">Browse…</button>
                </div>
              </div>
              {type === 'cf-pages' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Output Directory (Pages only)</label>
                    <input value={form.distFolder} onChange={e => set('distFolder', e.target.value)} placeholder="dist" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">
                      Cloudflare Project Name <span className="text-text-dim font-normal">(optional)</span>
                    </label>
                    <input value={form.cfProjectName} onChange={e => set('cfProjectName', e.target.value)} placeholder="auto-generated if empty" className={inputCls} />
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Shared: Build Command ── */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">
              Build Command <span className="text-text-dim font-normal">(leave blank to skip)</span>
            </label>
            <input value={form.buildCommand} onChange={e => set('buildCommand', e.target.value)}
              placeholder="npm run build" className={cn(inputCls, 'font-mono text-xs')} />
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:text-text-primary">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-accent-deploy text-white rounded-md font-medium flex items-center gap-1.5">
              <Save size={13} />{isEdit ? 'Save Project' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Server Tree ──────────────────────────────────────────────────────────────
function ServerTree({ servers, connectedServers, selectedServerId, selectedProjectId,
  onEditProject, onDeleteProject,
  onSelectServer, onSelectProject, onEditServer, onDeleteServer, onAddServer, onAddProject, onConnect, onDisconnect }) {
  const [expanded, setExpanded] = useState(Object.fromEntries(servers.map(s => [s.id, false])))
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-base flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Servers</span>
        <button onClick={onAddServer} className="text-xs text-accent-deploy font-medium flex items-center gap-1"><Plus size={12} />Add</button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {servers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
            <Server size={28} className="text-text-dim mb-2" />
            <p className="text-xs text-text-dim">No servers yet</p>
            <button onClick={onAddServer} className="mt-2 text-xs text-accent-deploy hover:underline">+ Add Server</button>
          </div>
        )}
        {servers.map(server => {
          const isConn = connectedServers.has(server.id)
          const isSel = selectedServerId === server.id
          const isExp = expanded[server.id] ?? false
          return (
            <div key={server.id}>
              <div className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer group transition-colors hover:bg-bg-hover/60', isSel && 'bg-bg-hover border-l-2 border-accent-deploy')}
                onClick={() => onSelectServer(server.id)}>
                <button onClick={e => { e.stopPropagation(); setExpanded(ex => ({ ...ex, [server.id]: !ex[server.id] })) }} className="text-text-dim">
                  {isExp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0 transition-colors', isConn ? 'bg-accent-deploy animate-pulse-soft' : 'bg-slate-500')} />
                <span className="flex-1 text-sm font-medium text-text-primary truncate">{server.name}</span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); onEditServer(server) }} className="p-0.5 text-text-dim hover:text-text-primary"><Pencil size={11} /></button>
                  <button onClick={e => { e.stopPropagation(); onDeleteServer(server.id) }} className="p-0.5 text-text-dim hover:text-red-400"><Trash2 size={11} /></button>
                </div>
              </div>
              {isSel && (
                <div className="px-9 pb-1 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-dim">{server.host}:{server.port}</span>
                  <button onClick={() => isConn ? onDisconnect(server.id) : onConnect(server.id)}
                    className={cn('text-[10px] px-2 py-0.5 rounded font-medium transition-colors', isConn ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-accent-deploy')}>
                    {isConn ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              )}
              {isExp && server.projects?.map(proj => (
                <div key={proj.id}
                  className={cn('flex items-center gap-2 pl-9 pr-3 py-1.5 cursor-pointer transition-colors hover:bg-bg-hover/60 group/proj', selectedProjectId === proj.id && 'bg-indigo-500/10 border-l-2 border-indigo-400')}
                  onClick={() => { onSelectServer(server.id); onSelectProject(proj.id) }}>
                  <Folder size={12} className="text-text-dim" />
                  <span className="flex-1 text-xs text-text-muted truncate">{proj.name}</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded', proj.type === 'pm2' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400')}>{proj.type}</span>
                  {isConn && (
                    <div className="hidden group-hover/proj:flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); onEditProject(server, proj) }} className="p-0.5 text-text-dim hover:text-text-primary"><Pencil size={10} /></button>
                      <button onClick={e => { e.stopPropagation(); onDeleteProject(server.id, proj) }} className="p-0.5 text-text-dim hover:text-red-400"><Trash2 size={10} /></button>
                    </div>
                  )}
                </div>
              ))}
              {isExp && isSel && isConn && (
                <button onClick={() => onAddProject(server.id)} className="w-full flex items-center gap-1.5 pl-9 py-1.5 text-xs text-text-dim hover:text-accent-deploy transition-colors">
                  <Plus size={11} />Add Project
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Deploy Step Dialog ───────────────────────────────────────────────────────
const PIPELINE_KEY = (pid) => `pipeline_cfg_${pid}`
const REQUIRED_STEPS = ['validate', 'complete', 'health_check']

const DEFAULT_CMDS_PM2 = {
  validate: null,
  git_pull: 'git pull origin main',
  npm_install: 'npm install --production',
  npm_build: null,
  pm2_restart: null,
  health_check: null,
  complete: null,
}
const DEFAULT_CMDS_STATIC = {
  validate: null,
  npm_build: null,
  upload: null,
  health_check: null,
  complete: null,
}

function DeployStepDialog({ project, steps, onConfirm, onCancel }) {
  const savedRaw = (() => { try { return JSON.parse(localStorage.getItem(PIPELINE_KEY(project.id)) ?? 'null') } catch { return null } })()
  const savedCustom = savedRaw?.customCommandsByStepId ?? {}
  const savedSkipped = new Set(savedRaw?.skippedIds ?? [])
  const defaultCmds = project.type === 'pm2' ? DEFAULT_CMDS_PM2 : DEFAULT_CMDS_STATIC

  const [enabled, setEnabled]   = useState(() => {
    const init = {}
    steps.forEach(s => { init[s.id] = REQUIRED_STEPS.includes(s.id) || !savedSkipped.has(s.id) })
    return init
  })
  const [cmds, setCmds] = useState(() => {
    const init = {}
    steps.forEach(s => { init[s.id] = savedCustom[s.id] ?? defaultCmds[s.id] ?? '' })
    return init
  })

  const save = () => {
    const skippedIds = steps.filter(s => !enabled[s.id]).map(s => s.id)
    const customCommandsByStepId = {}
    steps.forEach(s => { if (cmds[s.id] !== (defaultCmds[s.id] ?? '')) customCommandsByStepId[s.id] = cmds[s.id] })
    localStorage.setItem(PIPELINE_KEY(project.id), JSON.stringify({ skippedIds, customCommandsByStepId }))
    onConfirm({ skipSteps: new Set(skippedIds), customCommands: cmds })
  }

  const reset = () => {
    localStorage.removeItem(PIPELINE_KEY(project.id))
    setEnabled(() => { const o = {}; steps.forEach(s => { o[s.id] = true }); return o })
    setCmds(() => { const o = {}; steps.forEach(s => { o[s.id] = defaultCmds[s.id] ?? '' }); return o })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-bg-surface border border-border-base rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <div>
            <h3 className="font-semibold text-text-primary">Configure Deploy Pipeline</h3>
            <p className="text-xs text-text-dim mt-0.5">{project.name} · {project.type}</p>
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-text-primary"><X size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {steps.map((step, idx) => {
            const isRequired = REQUIRED_STEPS.includes(step.id)
            const hasCmd = defaultCmds[step.id] !== null && defaultCmds[step.id] !== undefined
            const isEnabled = enabled[step.id]
            return (
              <div key={step.id} className={cn('border rounded-lg p-3 transition-colors', isEnabled ? 'border-border-base bg-bg-primary' : 'border-border-base/40 bg-bg-primary/40 opacity-60')}>
                <div className="flex items-center gap-3">
                  <span className="text-text-dim text-xs font-mono w-5 text-center">{idx+1}</span>
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input type="checkbox" checked={isEnabled} disabled={isRequired}
                      onChange={e=>setEnabled(p=>({...p,[step.id]:e.target.checked}))}
                      className="w-3.5 h-3.5 accent-green-500"/>
                    <span className={cn('text-sm font-medium', isEnabled ? 'text-text-primary' : 'text-text-dim')}>{step.label}</span>
                  </label>
                  {isRequired && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-mono">required</span>}
                </div>
                {hasCmd && isEnabled && (
                  <div className="mt-2 ml-8">
                    <input value={cmds[step.id] ?? ''} onChange={e=>setCmds(p=>({...p,[step.id]:e.target.value}))}
                      placeholder="Custom command (leave blank to use default)"
                      className="w-full bg-bg-surface border border-border-base rounded-md px-2.5 py-1.5 text-xs font-mono text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
                    {defaultCmds[step.id] && cmds[step.id] !== defaultCmds[step.id] && (
                      <button onClick={()=>setCmds(p=>({...p,[step.id]:defaultCmds[step.id]??''}))}
                        className="text-[10px] text-text-dim hover:text-text-muted mt-1">↺ Reset to default</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-base">
          <button onClick={reset} className="text-xs text-text-dim hover:text-text-muted">↺ Reset all to defaults</button>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:bg-bg-hover">Cancel</button>
            <button onClick={save}
              className="px-4 py-1.5 text-sm text-white rounded-md font-medium transition-colors"
              style={{background:'linear-gradient(135deg,#22c55e,#16a34a)'}}>
              <Play size={13} className="inline mr-1.5"/>Deploy
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Input Dialog (replaces window.prompt which is blocked in Electron) ───────
function InputDialog({ title, placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-sm mx-4 p-5">
        <h3 className="font-semibold text-text-primary mb-3">{title}</h3>
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onConfirm(value.trim()) } else if (e.key === 'Escape') { onCancel() } }}
          placeholder={placeholder}
          className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono" />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs border border-border-base text-text-muted rounded-md hover:bg-bg-hover">Cancel</button>
          <button onClick={() => value.trim() && onConfirm(value.trim())} disabled={!value.trim()}
            className="px-3 py-1.5 text-xs bg-accent-deploy text-white rounded-md font-medium disabled:opacity-50">OK</button>
        </div>
      </div>
    </div>
  )
}

// ─── Process List Modal ───────────────────────────────────────────────────────
function ProcessListModal({ serverId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api().deploy.processList(serverId)
        if (res?.ok) setData(res)
        else setError(res?.error ?? 'Failed to load')
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [serverId])

  // Backend returns { ok, summary: "text", totalProcesses, zombieCount, hasPm2, hasDocker, hasFailedServices }
  // Render summary as preformatted terminal output with filter support
  const filteredSummary = (() => {
    if (!data?.summary) return ''
    if (!filter) return data.summary
    return data.summary.split('\n').filter(line => line.toLowerCase().includes(filter.toLowerCase())).join('\n')
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-bg-surface border border-border-base rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base flex-shrink-0">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-green-400" />
            <h3 className="font-semibold text-text-primary">Running Processes</h3>
            {data && (
              <div className="flex items-center gap-2 ml-3">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">{data.totalProcesses ?? 0} total</span>
                {(data.zombieCount ?? 0) > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 font-mono">💀 {data.zombieCount} zombie</span>}
                {data.hasPm2 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-mono">PM2</span>}
                {data.hasDocker && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 font-mono">Docker</span>}
                {data.hasFailedServices && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 font-mono">⚠ Failed</span>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter…"
              className="bg-bg-primary border border-border-base rounded-md px-2.5 py-1 text-xs text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim w-40" />
            <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="flex justify-center py-8"><LoadingSpinner size={20} /></div>}
          {error && <div className="text-red-400 text-xs text-center py-4">❌ {error}</div>}
          {data && !loading && (
            filteredSummary ? (
              <pre className="font-mono text-xs text-text-muted whitespace-pre-wrap leading-relaxed">{filteredSummary}</pre>
            ) : (
              <p className="text-xs text-text-dim text-center">No matching process data.</p>
            )
          )}
        </div>
        <div className="flex justify-end px-5 py-3 border-t border-border-base">
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:bg-bg-hover">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Health Panel ─────────────────────────────────────────────────────────────
function HealthPanel({ health, isLoading, onRefresh, onAiScan, isAiScanning, aiResult, serverId }) {
  const [secChecks, setSecChecks] = useState(null)
  const [secLoading, setSecLoading] = useState(false)
  const [showProcesses, setShowProcesses] = useState(false)
  const [aiCopied, setAiCopied] = useState(false)

  const runSecurityChecks = async () => {
    if (!serverId) return
    setSecLoading(true)
    try {
      const res = await api().deploy.securityScan(serverId)
      if (res?.ok) setSecChecks(res.checks ?? [])
      else toast.error(res?.error ?? 'Security check failed')
    } catch (err) { toast.error(err.message) }
    finally { setSecLoading(false) }
  }

  const copyAiResult = () => {
    if (aiResult?.summary) {
      navigator.clipboard.writeText(aiResult.summary)
      setAiCopied(true)
      setTimeout(() => setAiCopied(false), 1500)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Server Health</span>
        <button onClick={onRefresh} className="text-text-dim hover:text-text-muted" title="Refresh health">
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="flex items-center justify-around py-2">
        <HealthBar value={health.cpu?.value ?? 0} label="CPU" color="#ef4444" size={72} />
        <HealthBar value={health.ram?.value ?? 0} label="RAM" color="#6366f1" size={72} />
        <HealthBar value={health.disk?.value ?? 0} label="Disk" color="#f6821f" size={72} />
      </div>
      <div className="space-y-2">
        {[
          ['RAM', `${health.ram?.used ?? '—'}/${health.ram?.total ?? '—'}`],
          ['Disk', `${health.disk?.used ?? '—'}/${health.disk?.total ?? '—'}`],
          ['Uptime', health.uptime ?? '—'],
          ['Load Avg', health.loadAvg ?? '—'],
        ].map(([l, v]) => (
          <div key={l} className="flex justify-between gap-3 py-1 border-b border-border-base/40">
            <span className="text-xs text-text-muted flex-shrink-0">{l}</span>
            <span className="text-xs font-mono text-text-primary text-right">{v}</span>
          </div>
        ))}
      </div>

      {/* ─── Process List Button ──────────────────────────────────────────── */}
      <button onClick={() => setShowProcesses(true)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors">
        <ListTree size={13} />Show Processes
      </button>

      {/* ─── Security Checks ─────────────────────────────────────────────── */}
      <div className="border-t border-border-base pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Security Checks</span>
          <button onClick={runSecurityChecks} disabled={secLoading}
            className="text-xs flex items-center gap-1.5 text-text-muted hover:text-text-primary disabled:opacity-50">
            {secLoading ? <LoadingSpinner size={11} /> : <Shield size={12} />}
            {secLoading ? 'Checking…' : 'Run'}
          </button>
        </div>
        {secChecks && secChecks.length > 0 && (
          <div className="space-y-1">
            {secChecks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span>{c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : c.status === 'fail' ? '❌' : 'ℹ️'}</span>
                <span className="text-xs text-text-muted flex-1">{c.label}</span>
                <span className="text-[10px] font-mono text-text-dim max-w-[100px] truncate text-right" title={c.detail}>{c.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── AI Scan ─────────────────────────────────────────────────────── */}
      <div className="border-t border-border-base pt-3">
        <button onClick={onAiScan} disabled={isAiScanning}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10 transition-colors disabled:opacity-60">
          {isAiScanning ? <><LoadingSpinner size={12} color="#818cf8" />Scanning…</> : <><Bot size={13} />AI Security Scan</>}
        </button>
        {aiResult && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-text-dim">AI Analysis Result</span>
              <button onClick={copyAiResult}
                className="text-[10px] px-2 py-0.5 rounded border border-border-base text-text-muted hover:bg-bg-hover flex items-center gap-1 transition-colors">
                {aiCopied ? <><Check size={10} />Copied!</> : <><Copy size={10} />Copy</>}
              </button>
            </div>
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <MarkdownRenderer content={aiResult.summary} />
              {aiResult.provider && (
                <p className="mt-2 text-[10px] text-text-dim">via {aiResult.provider} · {aiResult.model}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Process List Modal */}
      {showProcesses && (
        <ProcessListModal serverId={serverId} onClose={() => setShowProcesses(false)} />
      )}
    </div>
  )
}

// ─── Nginx Config Modal (Add + Edit — unified like V1) ────────────────────────
function NginxConfigModal({ serverId, editDomain, onSave, onClose }) {
  const isEdit = !!editDomain
  const [fileName, setFileName] = useState(editDomain?.fileName ?? '')
  const [content, setContent] = useState('')
  const [enableAfterSave, setEnableAfterSave] = useState(!isEdit) // auto-enable for new domains
  const [loadingConfig, setLoadingConfig] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  // Pre-load config when editing
  useEffect(() => {
    if (!isEdit) return
    const fetchConfig = async () => {
      try {
        const res = await api().deploy.nginxGetConfig(serverId, editDomain.fileName)
        if (res?.ok !== false) setContent(res.content ?? '')
      } catch (err) { toast.error(err.message) }
      finally { setLoadingConfig(false) }
    }
    fetchConfig()
  }, [serverId, editDomain, isEdit])

  const handleSave = async () => {
    const name = fileName.trim()
    if (!name) { toast.warn('Filename is required.'); return }
    if (!content.trim()) { toast.warn('Config content is required.'); return }
    setSaving(true)
    try {
      const res = await api().deploy.nginxAdd(serverId, name, content)
      if (res?.ok === false) throw new Error(res.error)
      // Enable after save if checkbox is checked
      if (enableAfterSave) {
        const er = await api().deploy.nginxEnable(serverId, name)
        if (er?.ok === false) throw new Error(er.error)
      }
      toast.success(isEdit ? `Domain "${name}" updated` : `Domain "${name}" created`)
      onSave()
      onClose()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e) => { if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [content, fileName, enableAfterSave]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-2xl mx-4 animate-slide-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base flex-shrink-0">
          <h3 className="font-semibold text-text-primary">{isEdit ? 'Edit Domain' : 'Add Domain'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Filename</label>
            <input
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              readOnly={isEdit}
              placeholder="e.g. example.com or example.com.conf"
              className={cn(
                'w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none font-mono',
                isEdit && 'opacity-60 cursor-not-allowed'
              )}
            />
          </div>
          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-xs font-medium text-text-muted mb-1">Nginx Config</label>
            {loadingConfig ? (
              <div className="flex justify-center py-12"><LoadingSpinner size={20} /></div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                spellCheck={false}
                placeholder={'server {\n    listen 80;\n    server_name example.com;\n\n    location / {\n        proxy_pass http://localhost:3000;\n    }\n}'}
                className="w-full bg-[#0a0e14] border border-border-base rounded-md px-3 py-2 text-xs text-text-primary focus:border-border-focus outline-none font-mono resize-y leading-relaxed"
                style={{ minHeight: 280, tabSize: 4 }}
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={enableAfterSave}
              onChange={e => setEnableAfterSave(e.target.checked)}
              className="accent-accent-deploy"
            />
            Enable domain after saving (create symlink in sites-enabled)
          </label>
        </div>
        <div className="flex gap-2 justify-end px-5 py-3 border-t border-border-base flex-shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:text-text-primary">Cancel</button>
          <button onClick={handleSave} disabled={saving || !fileName.trim() || loadingConfig}
            className="px-4 py-1.5 text-sm bg-accent-deploy text-white rounded-md font-medium flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <><LoadingSpinner size={11} color="white" />Saving…</> : <><Save size={13} />Save Config</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Nginx Domain Row ─────────────────────────────────────────────────────────
function NginxDomainRow({ domain, type, actionLoading, onEdit, onToggle, onRemove }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border-base/50 hover:bg-bg-hover/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">{domain.serverName ?? domain.fileName}</span>
          {domain.ssl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-semibold">SSL</span>}
          {domain.listen && <span className="text-[10px] text-blue-400">{domain.listen}</span>}
        </div>
        {domain.proxyPass && <div className="text-[10px] text-text-dim font-mono mt-0.5">{domain.proxyPass}</div>}
        <div className="text-[10px] text-text-dim mt-0.5">{domain.configFile ?? ''}</div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => onEdit(domain)} className="p-1.5 text-text-dim hover:text-yellow-400 transition-colors rounded" title="Edit config">
          <Pencil size={12} />
        </button>
        {type === 'enabled' ? (
          <button onClick={() => onToggle(domain)} disabled={actionLoading === domain.fileName}
            className="p-1.5 text-text-dim hover:text-yellow-400 transition-colors rounded" title="Disable domain">
            {actionLoading === domain.fileName ? <LoadingSpinner size={12} /> : <Pause size={13} />}
          </button>
        ) : (
          <button onClick={() => onToggle(domain)} disabled={actionLoading === domain.fileName}
            className="p-1.5 text-text-dim hover:text-green-400 transition-colors rounded" title="Enable domain">
            {actionLoading === domain.fileName ? <LoadingSpinner size={12} /> : <Play size={13} />}
          </button>
        )}
        <button onClick={() => onRemove(domain)} disabled={actionLoading === domain.fileName}
          className="p-1.5 text-text-dim hover:text-red-400 transition-colors rounded" title="Remove domain">
          <Trash size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Nginx Manager Tab (V1 parity) ───────────────────────────────────────────
function NginxTab({ serverId, isConnected }) {
  const [domains, setDomains] = useState([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false) // true for add, domain object for edit
  const [confirmAction, setConfirmAction] = useState(null) // { type, domain }
  const [splitting, setSplitting] = useState(null) // fileName being split

  const load = useCallback(async () => {
    if (!serverId || !isConnected) return
    setLoading(true)
    try {
      const res = await api().deploy.nginxDomains(serverId)
      if (res?.ok) setDomains(res.domains ?? [])
      else if (res?.error && !/not connected/i.test(res.error)) {
        toast.error(res.error ?? 'Failed to load Nginx domains')
      }
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }, [serverId, isConnected])

  useEffect(() => { load() }, [load])

  // Separate enabled vs disabled (like V1)
  const enabled = domains.filter(d => d.enabled)
  const available = domains.filter(d => !d.enabled)
  const total = domains.length

  // Detect multi-domain files (files that contain more than one domain)
  const fileCount = new Map()
  for (const d of domains) {
    const fn = d.fileName ?? ''
    fileCount.set(fn, (fileCount.get(fn) ?? 0) + 1)
  }
  const multiDomainFiles = [...fileCount.entries()].filter(([, count]) => count > 1)

  const handleEdit = (domain) => setShowConfigModal(domain)
  const handleAdd = () => setShowConfigModal(true)

  const handleToggle = async (domain) => {
    if (domain.enabled) {
      // Confirm disable
      setConfirmAction({ type: 'disable', domain })
    } else {
      // Enable directly
      setActionLoading(domain.fileName)
      try {
        const res = await api().deploy.nginxEnable(serverId, domain.fileName)
        if (res?.ok) { toast.success(`${domain.fileName} is now active`); load() }
        else toast.error(res?.error ?? 'Enable failed')
      } catch (err) { toast.error(err.message) }
      finally { setActionLoading(null) }
    }
  }

  const handleRemove = (domain) => {
    setConfirmAction({ type: 'remove', domain })
  }

  const executeConfirm = async () => {
    if (!confirmAction) return
    const { type, domain } = confirmAction
    setConfirmAction(null)
    setActionLoading(domain.fileName)
    try {
      if (type === 'disable') {
        const res = await api().deploy.nginxDisable(serverId, domain.fileName)
        if (res?.ok) { toast.info(`${domain.fileName} moved to available`); load() }
        else toast.error(res?.error ?? 'Disable failed')
      } else if (type === 'remove') {
        const res = await api().deploy.nginxRemove(serverId, domain.fileName)
        if (res?.ok) { toast.success(`${domain.fileName} deleted`); load() }
        else toast.error(res?.error ?? 'Remove failed')
      }
    } catch (err) { toast.error(err.message) }
    finally { setActionLoading(null) }
  }

  const handleSplit = async (fileName) => {
    setSplitting(fileName)
    try {
      const res = await api().deploy.nginxSplit(serverId, fileName)
      if (res?.ok === false) throw new Error(res.error)
      toast.success(`Created ${res.splitCount} individual domain files`)
      load()
    } catch (err) { toast.error(err.message) }
    finally { setSplitting(null) }
  }

  if (!isConnected) return <EmptyState icon={WifiOff} title="Not connected" message="Connect to a server to manage Nginx domains." />

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">🌐 Nginx Domains</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-dim">{total} total</span>
          <button onClick={load} disabled={loading} className="p-1 text-text-dim hover:text-text-primary" title="Refresh">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleAdd} className="text-xs flex items-center gap-1.5 px-2.5 py-1 bg-accent-deploy text-white rounded-md font-medium hover:bg-accent-deploy/90 transition-colors">
            <Plus size={12} />Add Domain
          </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-6"><LoadingSpinner size={20} /></div>}

      {!loading && total === 0 && (
        <EmptyState icon={Globe} title="No domains found" message="No Nginx site configurations were found on this server." />
      )}

      {!loading && total > 0 && (
        <>
          {/* Multi-domain file split banner (V1 parity) */}
          {multiDomainFiles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 mb-2">
              <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
              <span className="text-[11px] text-yellow-400">Multi-domain file detected:</span>
              {multiDomainFiles.map(([fn, count]) => (
                <button key={fn} onClick={() => handleSplit(fn)} disabled={splitting === fn}
                  className="text-[11px] text-yellow-400 hover:text-yellow-300 font-medium flex items-center gap-1 disabled:opacity-50">
                  {splitting === fn ? <LoadingSpinner size={10} /> : <Scissors size={11} />}
                  Split <strong>{fn}</strong> ({count} domains)
                </button>
              ))}
            </div>
          )}

          {/* Enabled section */}
          <div className="rounded-lg border border-border-base overflow-hidden mb-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-green-400 bg-green-500/5 border-b border-border-base/50">
              🟢 Enabled ({enabled.length})
            </div>
            {enabled.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-dim">No enabled domains.</div>
            ) : (
              enabled.map(d => (
                <NginxDomainRow key={d.fileName + '-enabled-' + d.name} domain={d} type="enabled"
                  actionLoading={actionLoading} onEdit={handleEdit} onToggle={handleToggle} onRemove={handleRemove} />
              ))
            )}
          </div>

          {/* Available / Disabled section */}
          <div className="rounded-lg border border-border-base overflow-hidden">
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-dim bg-bg-hover/30 border-b border-border-base/50">
              📁 Available / Disabled ({available.length})
            </div>
            {available.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-dim">No disabled domains.</div>
            ) : (
              available.map(d => (
                <NginxDomainRow key={d.fileName + '-available-' + d.name} domain={d} type="available"
                  actionLoading={actionLoading} onEdit={handleEdit} onToggle={handleToggle} onRemove={handleRemove} />
              ))
            )}
          </div>
        </>
      )}

      {/* Nginx Config Modal (Add / Edit) */}
      {showConfigModal && (
        <NginxConfigModal
          serverId={serverId}
          editDomain={showConfigModal === true ? null : showConfigModal}
          onSave={load}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* Confirm Dialog for Disable / Remove */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          title={confirmAction.type === 'disable' ? 'Disable Domain' : 'Remove Domain'}
          message={confirmAction.type === 'disable'
            ? `Disable "${confirmAction.domain.fileName}"? It will be removed from sites-enabled.`
            : `Permanently remove "${confirmAction.domain.fileName}"? This will delete the config file.`
          }
          confirmLabel={confirmAction.type === 'disable' ? 'Disable' : 'Remove'}
          variant={confirmAction.type === 'remove' ? 'danger' : 'default'}
          onConfirm={executeConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}

// ─── File Editor Tab ──────────────────────────────────────────────────────────
function FilesTab({ serverId, isConnected, projectPath }) {
  const [currentPath, setCurrentPath] = useState('/')
  const [breadcrumbs, setBreadcrumbs] = useState(['/'])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [openFile, setOpenFile] = useState(null)   // { path, content, loading, dirty }
  const [saving, setSaving] = useState(false)
  const [sftpProgress, setSftpProgress] = useState(null)

  const loadDir = useCallback(async (dirPath) => {
    if (!serverId || !isConnected) return
    setLoading(true)
    setOpenFile(null)
    try {
      const res = await api().deploy.fileList(serverId, dirPath)
      if (res?.ok) {
        setEntries(res.entries ?? [])
        setCurrentPath(dirPath)
        // Rebuild breadcrumbs
        const parts = dirPath.split('/').filter(Boolean)
        setBreadcrumbs(['/', ...parts.map((_, i) => '/' + parts.slice(0, i + 1).join('/'))])
      } else {
        toast.error(res?.error ?? 'Failed to list directory')
      }
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }, [serverId, isConnected])

  const openFileForEdit = useCallback(async (filePath) => {
    setOpenFile({ path: filePath, content: '', loading: true, dirty: false })
    try {
      const res = await api().deploy.fileRead(serverId, filePath)
      if (res?.ok) {
        setOpenFile({ path: filePath, content: res.content ?? '', loading: false, dirty: false })
      } else {
        toast.error(res?.error ?? 'Failed to read file')
        setOpenFile(null)
      }
    } catch (err) {
      toast.error(err.message)
      setOpenFile(null)
    }
  }, [serverId])

  const saveFile = useCallback(async () => {
    if (!openFile || !openFile.dirty) return
    setSaving(true)
    try {
      const res = await api().deploy.fileWrite(serverId, openFile.path, openFile.content, true)
      if (res?.ok) {
        setOpenFile(f => ({ ...f, dirty: false }))
        toast.success('File saved')
      } else {
        toast.error(res?.error ?? 'Failed to save file')
      }
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }, [serverId, openFile])

  const handleUpload = useCallback(async () => {
    try {
      const res = await api().deploy.fileUpload(serverId, currentPath)
      if (res?.ok) { toast.success('Upload complete'); loadDir(currentPath) }
      else if (res?.error) toast.error(res.error)
    } catch (err) { toast.error(err.message) }
  }, [serverId, currentPath, loadDir])

  const handleDelete = useCallback(async (entry) => {
    try {
      const res = entry.type === 'directory'
        ? await api().deploy.fileRmdir(serverId, entry.path, true)
        : await api().deploy.fileDelete(serverId, entry.path)
      if (res?.ok) { toast.success(`${entry.name} deleted`); loadDir(currentPath) }
      else toast.error(res?.error ?? 'Delete failed')
    } catch (err) { toast.error(err.message) }
  }, [serverId, currentPath, loadDir])

  // State for InputDialog (replaces window.prompt which is blocked in Electron)
  const [inputDialog, setInputDialog] = useState(null) // { type: 'file'|'dir' }

  const handleMkdir = useCallback(async (name) => {
    if (!name) return
    try {
      const res = await api().deploy.fileMkdir(serverId, `${currentPath}/${name}`.replace('//', '/'))
      if (res?.ok) { toast.success('Folder created'); loadDir(currentPath) }
      else toast.error(res?.error ?? 'Failed to create folder')
    } catch (err) { toast.error(err.message) }
  }, [serverId, currentPath, loadDir])

  const handleNewFile = useCallback(async (name) => {
    if (!name) return
    const newPath = `${currentPath}/${name}`.replace('//', '/')
    try {
      const res = await api().deploy.fileCreate(serverId, newPath, '')
      if (res?.ok) { toast.success('File created'); openFileForEdit(newPath) }
      else toast.error(res?.error ?? 'Failed to create file')
    } catch (err) { toast.error(err.message) }
  }, [serverId, currentPath, openFileForEdit])

  // SFTP progress listener
  useIpcListener('deploy:sftp-progress', (e, data) => {
    setSftpProgress(data)
    if (data?.percent >= 100) setTimeout(() => setSftpProgress(null), 2000)
  })

  // Ctrl+S to save
  useEffect(() => {
    const handler = (e) => { if (e.ctrlKey && e.key === 's' && openFile) { e.preventDefault(); saveFile() } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openFile, saveFile])

  // Navigate to the project's remotePath when a project is selected, otherwise start at '/'
  useEffect(() => {
    if (isConnected && serverId) {
      const startDir = projectPath && projectPath.trim() ? projectPath.trim() : '/'
      loadDir(startDir)
    }
  }, [isConnected, serverId, projectPath, loadDir])

  if (!isConnected) return <EmptyState icon={WifiOff} title="Not connected" message="Connect to a server to browse files." />

  const FILE_ICON = (entry) => entry.type === 'directory' ? <FolderOpen size={13} className="text-yellow-400 flex-shrink-0" /> : <FileText size={13} className="text-text-dim flex-shrink-0" />

  // File editor view
  if (openFile) {
    return (
      <div className="flex flex-col h-full">
        {/* Editor header */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setOpenFile(null)} className="text-text-dim hover:text-text-primary flex-shrink-0">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono text-text-muted truncate">{openFile.path}</span>
            {openFile.dirty && <span className="text-[10px] text-yellow-400 flex-shrink-0">● unsaved</span>}
          </div>
          <button
            onClick={saveFile}
            disabled={!openFile.dirty || saving}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-accent-deploy text-white disabled:opacity-50"
          >
            {saving ? <LoadingSpinner size={11} color="white" /> : <Save size={12} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {openFile.loading ? (
          <div className="flex justify-center py-8"><LoadingSpinner size={20} /></div>
        ) : (
          <textarea
            className="flex-1 w-full bg-bg-primary border border-border-base rounded-lg px-3 py-2 font-mono text-xs text-text-primary focus:border-border-focus outline-none resize-none"
            value={openFile.content}
            onChange={e => setOpenFile(f => ({ ...f, content: e.target.value, dirty: true }))}
            spellCheck={false}
          />
        )}
        <p className="text-[10px] text-text-dim mt-1 flex-shrink-0">Ctrl+S to save</p>
      </div>
    )
  }

  // File browser view
  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1 flex items-center gap-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center">
              {i > 0 && <span className="text-text-dim mx-1">/</span>}
              <button
                onClick={() => loadDir(crumb)}
                className="text-xs font-mono text-text-muted hover:text-accent-deploy transition-colors truncate max-w-[80px]"
                title={crumb}
              >
                {crumb === '/' ? '~' : crumb.split('/').pop()}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setInputDialog({ type: 'file' })} title="New file" className="p-1.5 text-text-dim hover:text-text-primary border border-border-base rounded"><FilePlus size={13} /></button>
          <button onClick={() => setInputDialog({ type: 'dir' })} title="New folder" className="p-1.5 text-text-dim hover:text-text-primary border border-border-base rounded"><FolderPlus size={13} /></button>
          <button onClick={handleUpload}  title="Upload file" className="p-1.5 text-text-dim hover:text-text-primary border border-border-base rounded"><Upload size={13} /></button>
          <button onClick={() => loadDir(currentPath)} title="Refresh" className="p-1.5 text-text-dim hover:text-text-primary border border-border-base rounded">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SFTP progress bar */}
      {sftpProgress && (
        <div className="relative overflow-hidden h-6 rounded bg-bg-primary border border-border-base">
          <div
            className="absolute left-0 top-0 h-full bg-accent-deploy/30 transition-all duration-300"
            style={{ width: `${sftpProgress.percent ?? 0}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-text-primary">
            {sftpProgress.direction === 'upload' ? '⬆' : '⬇'} {sftpProgress.filename} — {sftpProgress.percent ?? 0}%
          </span>
        </div>
      )}

      {/* File list */}
      {loading && <div className="flex justify-center py-6"><LoadingSpinner size={20} /></div>}

      {!loading && entries.length === 0 && (
        <EmptyState icon={Folder} title="Empty directory" message="This directory has no files." />
      )}

      {!loading && entries.map(entry => (
        <div key={entry.path}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border-base bg-bg-primary hover:bg-bg-hover/40 transition-colors group cursor-pointer"
          onClick={() => entry.type === 'directory' ? loadDir(entry.path) : openFileForEdit(entry.path)}
        >
          {FILE_ICON(entry)}
          <span className="flex-1 text-xs font-mono text-text-primary truncate">{entry.name}</span>
          {entry.size > 0 && <span className="text-[10px] text-text-dim">{formatBytes(entry.size)}</span>}
          {entry.type !== 'directory' && (
            <div className="hidden group-hover:flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); api().deploy.fileDownload(serverId, entry.path) }}
                title="Download" className="p-1 text-text-dim hover:text-accent-deploy rounded">
                <Download size={12} />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(entry) }}
                title="Delete" className="p-1 text-text-dim hover:text-red-400 rounded">
                <Trash size={12} />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* InputDialog for creating file/dir */}
      {inputDialog && (
        <InputDialog
          title={inputDialog.type === 'dir' ? 'New Folder' : 'New File'}
          placeholder={inputDialog.type === 'dir' ? 'folder-name' : 'filename.txt'}
          onConfirm={(name) => {
            setInputDialog(null)
            if (inputDialog.type === 'dir') handleMkdir(name)
            else handleNewFile(name)
          }}
          onCancel={() => setInputDialog(null)}
        />
      )}
    </div>
  )
}

// ─── Main DeployPage ──────────────────────────────────────────────────────────
export default function DeployPage() {
  const {
    servers, connectedServers, selectedServerId, selectedProjectId,
    pm2Processes, serverHealth, deployInProgress, deployLog, deployStepStatuses,
    aiScanResult, isAiScanning, isLoadingHealth,
    loadServers, selectServer, selectProject,
    connectServer, disconnectServer, runDeploy, cancelDeploy,
    refreshPM2, pm2Restart, pm2Stop, fetchHealth, runAiScan,
    saveServer, deleteServer, saveProject, deleteProject,
  } = useDeployStore()

  const [terminalOpen, setTerminalOpen] = useState(false)
  const [serverModal, setServerModal] = useState(null)
  const [projectModal, setProjectModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [activeTab, setActiveTab] = useState('deploy')
  const [deployStepDialog, setDeployStepDialog] = useState(false)

  const termRef = useRef(null)

  // Resizable panels
  const leftPanel  = useResizablePanel({ initial: 240, min: 160, max: 400, direction: 'horizontal', side: 'start' })
  const rightPanel = useResizablePanel({ initial: 280, min: 200, max: 420, direction: 'horizontal', side: 'end' })
  const termPanel  = useResizablePanel({ initial: 180, min: 100, max: 400, direction: 'vertical',   side: 'end' })

  const selectedServer  = servers.find(s => s.id === selectedServerId)
  const selectedProject = selectedServer?.projects?.find(p => p.id === selectedProjectId)
  const isConnected     = connectedServers.has(selectedServerId)

  // Auto-refresh server health every 10s while connected
  useHealthPolling(selectedServerId, isConnected, fetchHealth, 10_000)

  useEffect(() => { loadServers() }, [])

  // Auto-refresh PM2 processes when server connects (or when switching to PM2 tab while connected)
  useEffect(() => {
    if (isConnected && selectedServerId && activeTab === 'pm2') {
      refreshPM2(selectedServerId)
    }
  }, [isConnected, selectedServerId, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wire terminal: ssh terminal data from main process
  useEffect(() => {
    if (!isConnected || !terminalOpen || !selectedServerId) return
    const unsub = api().deploy.onTerminalData((e, sid, data) => {
      if (sid === selectedServerId) {
        termRef.current?.write(data)
      }
    })
    api().deploy.terminalOpen(selectedServerId).catch(() => {})
    return () => {
      unsub?.()
      api().deploy.terminalClose(selectedServerId).catch(() => {})
    }
  }, [isConnected, terminalOpen, selectedServerId])

  // Write deploy log lines to terminal
  useEffect(() => {
    if (deployLog.length && termRef.current) {
      const last = deployLog[deployLog.length - 1]
      termRef.current.writeln(last)
    }
  }, [deployLog])

  const TABS = [
    { id: 'deploy', label: '🚀 Deploy' },
    { id: 'pm2',    label: '⚡ PM2' },
    { id: 'nginx',  label: '🌐 Nginx' },
    { id: 'files',  label: '📁 Files' },
  ]

  const steps = selectedProject?.type === 'static' ? DEPLOY_STEPS_STATIC : DEPLOY_STEPS_PM2

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Main 3-panel area */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT: Server Tree */}
        <div className="flex flex-col bg-bg-surface border-r border-border-base overflow-hidden flex-shrink-0"
          style={{ width: leftPanel.size }}>
          <ServerTree
            servers={servers} connectedServers={connectedServers}
            selectedServerId={selectedServerId} selectedProjectId={selectedProjectId}
            onSelectServer={selectServer} onSelectProject={selectProject}
            onEditServer={s => setServerModal({ mode: 'edit', server: s })}
            onDeleteServer={id => setConfirmDelete({ type: 'server', id })}
            onAddServer={() => setServerModal({ mode: 'add' })}
            onAddProject={sid => setProjectModal({ serverId: sid })}
            onEditProject={(srv, prj) => setProjectModal({ serverId: srv.id, project: prj, server: srv })}
            onDeleteProject={(sid, prj) => setConfirmDelete({ type: 'project', serverId: sid, project: prj })}
            onConnect={async id => { await connectServer(id) }}
            onDisconnect={async id => { await disconnectServer(id); toast.info('Disconnected') }}
          />
        </div>
        {/* Resizable divider */}
        <div {...leftPanel.dividerProps} />

        {/* CENTER: Tabbed content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-border-base bg-bg-surface/60 flex-shrink-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors', activeTab === t.id ? 'bg-accent-deploy/20 text-accent-deploy' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover')}>
                {t.label}
              </button>
            ))}
            <span className={cn('ml-auto text-xs flex items-center gap-1', isConnected ? 'text-accent-deploy' : 'text-yellow-400')}>
              {isConnected ? <><Wifi size={11} />Connected</> : <><WifiOff size={11} />Not connected</>}
            </span>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* DEPLOY TAB */}
            {activeTab === 'deploy' && (
              selectedProject ? (
                <div className="space-y-4">
                  {/* Project info card */}
                  <div className="border border-border-base rounded-lg p-4 bg-bg-primary">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm text-text-primary">{selectedProject.name}</span>
                      <div className="flex items-center gap-2">
                        {connectedServers.has(selectedServerId) && (
                          <button onClick={() => setProjectModal({ serverId: selectedServerId, project: selectedProject, server: selectedServer })}
                            className="text-xs flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors">
                            <Pencil size={11} />Edit
                          </button>
                        )}
                        <span className={cn('text-xs px-2 py-0.5 rounded', selectedProject.type === 'pm2' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-blue-400')}>{selectedProject.type}</span>
                      </div>
                    </div>
                    {[
                      ['Branch', selectedProject.branch],
                      ['Remote', selectedProject.remotePath],
                      ['Repo', selectedProject.repo ?? selectedProject.repoUrl],
                      ['PM2 Cfg', selectedProject.pm2Config],
                      ['Local', selectedProject.localPath],
                      ['Web Root', selectedProject.webRoot],
                      ['Dist', selectedProject.distFolder],
                      ['Build', selectedProject.buildCommand],
                      ['CF Proj', selectedProject.cfProjectName],
                    ].filter(([, v]) => v).map(([l, v]) => (
                      <div key={l} className="flex gap-2 text-xs mb-1">
                        <span className="text-text-dim w-16 flex-shrink-0">{l}</span>
                        <span className="font-mono text-text-muted truncate">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Animated deploy pipeline */}
                  <DeployPipeline
                    steps={steps}
                    stepStatuses={deployStepStatuses ?? {}}
                    logLines={deployLog}
                    isRunning={deployInProgress}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeployStepDialog(true)}
                      disabled={deployInProgress || !isConnected}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg text-white disabled:opacity-60 transition-all"
                      style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                      {deployInProgress ? <><LoadingSpinner size={14} color="white" />Deploying…</> : <><Play size={14} />Deploy…</>}
                    </button>
                    {deployInProgress && (
                      <button onClick={cancelDeploy}
                        className="px-4 py-2.5 text-sm font-medium rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>
                  {!isConnected && (
                    <p className="text-xs text-yellow-400/80 flex items-center gap-1.5">
                      <AlertTriangle size={12} />Connect to server before deploying
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState icon={Folder} title="No project selected" message="Select a project from the server tree to deploy." />
              )
            )}

            {/* PM2 TAB */}
            {activeTab === 'pm2' && (
              isConnected ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">PM2 Processes</span>
                    <button onClick={() => refreshPM2(selectedServerId)} className="text-xs flex items-center gap-1.5 text-text-muted hover:text-text-primary">
                      <RefreshCw size={12} />Refresh
                    </button>
                  </div>
                  {pm2Processes.length === 0 && (
                    <EmptyState icon={Server} title="No processes" message="Click Refresh to load PM2 processes from this server." />
                  )}
                  {pm2Processes.map(p => {
                    const status = p.pm2_env?.status ?? p.status ?? 'unknown'
                    const cpu = p.monit?.cpu ?? p.cpu ?? 0
                    const memBytes = p.monit?.memory ?? 0
                    const memMB = Math.round(memBytes / 1024 / 1024)
                    const restarts = p.pm2_env?.restart_time ?? 0
                    return (
                    <div key={p.pm_id ?? p.name} className="flex items-center gap-3 p-3 rounded-lg border border-border-base bg-bg-primary hover:bg-bg-hover/40 transition-colors">
                      <div className={cn('w-2 h-2 rounded-full flex-shrink-0', status === 'online' ? 'bg-accent-deploy animate-pulse-soft' : 'bg-slate-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono text-text-primary truncate">{p.name}</p>
                        <p className="text-[10px] text-text-dim">{p.pid ? `PID ${p.pid}` : '—'}</p>
                      </div>
                      <StatusBadge status={status} />
                      <span className="text-xs font-mono text-text-dim w-16 text-right">{cpu}% CPU</span>
                      <span className="text-xs font-mono text-text-dim w-16 text-right">{memMB}MB</span>
                      {restarts > 3 && <span className="text-[10px] text-red-400">↺{restarts}⚠️</span>}
                      <div className="flex items-center gap-1">
                        <button onClick={() => {
                          setTerminalOpen(true)
                          setTimeout(() => api().deploy.terminalInput(selectedServerId, `pm2 restart ${p.name}\r`), 300)
                          toast.success(`${p.name} restarting…`)
                          setTimeout(() => refreshPM2(selectedServerId), 2000)
                        }} className="p-1.5 text-text-dim hover:text-accent-deploy transition-colors rounded"><RefreshCw size={13} /></button>
                        <button onClick={() => {
                          setTerminalOpen(true)
                          setTimeout(() => api().deploy.terminalInput(selectedServerId, `pm2 stop ${p.name}\r`), 300)
                          toast.info(`${p.name} stopped`)
                          setTimeout(() => refreshPM2(selectedServerId), 2000)
                        }} className="p-1.5 text-text-dim hover:text-red-400 transition-colors rounded"><StopCircle size={13} /></button>
                        <button onClick={() => {
                          setTerminalOpen(true)
                          setTimeout(() => api().deploy.terminalInput(selectedServerId, `pm2 logs ${p.name} --lines 50\r`), 300)
                        }} title="View logs" className="p-1.5 text-text-dim hover:text-yellow-400 transition-colors rounded"><FileText size={13} /></button>
                      </div>
                    </div>
                    )
                  })}
                </div>
              ) : <EmptyState icon={WifiOff} title="Not connected" message="Connect to a server to view PM2 processes." />
            )}

            {/* NGINX TAB */}
            {activeTab === 'nginx' && (
              <NginxTab serverId={selectedServerId} isConnected={isConnected} />
            )}

            {/* FILES TAB */}
            {activeTab === 'files' && (
              <FilesTab serverId={selectedServerId} isConnected={isConnected} projectPath={selectedProject?.remotePath} />
            )}
          </div>
        </div>

        {/* RIGHT divider */}
        <div {...rightPanel.dividerProps} />

        {/* RIGHT: Health Panel */}
        <div className="flex flex-col bg-bg-surface border-l border-border-base overflow-y-auto flex-shrink-0"
          style={{ width: rightPanel.size }}>
          <div className="p-4">
            {isConnected && serverHealth ? (
              <HealthPanel
                health={serverHealth} isLoading={isLoadingHealth}
                onRefresh={() => fetchHealth(selectedServerId)}
                onAiScan={() => runAiScan(selectedServerId)}
                isAiScanning={isAiScanning} aiResult={aiScanResult}
                serverId={selectedServerId}
              />
            ) : (
              <EmptyState
                icon={Server}
                title={selectedServerId ? (isConnected ? 'Loading health…' : 'Server offline') : 'No server selected'}
                message="Connect to see health metrics."
                className="mt-8"
              />
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: xterm.js Terminal */}
      <div className="border-t border-border-base bg-bg-surface flex-shrink-0 flex flex-col"
        style={{ height: terminalOpen ? termPanel.size : 36 }}>
        <div className="flex items-center justify-between px-4 h-9 border-b border-border-base flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-text-muted font-semibold uppercase tracking-wider">
            <TerminalIcon size={12} />
            <span>Terminal</span>
            {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-accent-deploy animate-pulse-soft" />}
            {!isConnected && <span className="text-[10px] text-yellow-400 normal-case font-normal">(not connected)</span>}
          </div>
          <div className="flex items-center gap-2">
            {terminalOpen && (
              <>
                <button onClick={() => termRef.current?.clear()} className="text-[10px] text-text-dim hover:text-text-muted px-1.5 py-0.5 rounded border border-border-base">Clear</button>
                {/* Drag handle for terminal height resize */}
                <div {...termPanel.dividerProps} className="cursor-row-resize px-1 text-text-dim hover:text-text-muted" title="Drag to resize">⠿</div>
              </>
            )}
            <button onClick={() => setTerminalOpen(o => !o)} className="text-text-dim hover:text-text-muted text-xs px-2 py-0.5 rounded border border-border-base">
              {terminalOpen ? 'Collapse ∧' : 'Expand ∨'}
            </button>
          </div>
        </div>

        {terminalOpen && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <XTerminal
              ref={termRef}
              className="w-full h-full"
              style={{ padding: '8px' }}
              onData={data => {
                if (selectedServerId && isConnected) {
                  api().deploy.terminalInput(selectedServerId, data)
                }
              }}
              onResize={({ cols, rows }) => {
                if (selectedServerId) {
                  api().deploy.terminalResize(selectedServerId, { cols, rows })
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {serverModal && (
        <ServerFormModal
          server={serverModal.mode === 'edit' ? serverModal.server : null}
          onSave={s => { saveServer(s); toast.success('Server saved') }}
          onClose={() => setServerModal(null)}
        />
      )}
      {projectModal && (
        <ProjectFormModal
          serverId={projectModal.serverId}
          project={projectModal.project ?? null}
          server={projectModal.server ?? servers.find(s => s.id === projectModal.serverId)}
          onSave={(sid, p) => { saveProject(sid, p); toast.success(projectModal.project ? 'Project updated' : 'Project added') }}
          onClose={() => setProjectModal(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title={confirmDelete?.type === 'project' ? 'Delete Project' : 'Delete Server'}
        message={confirmDelete?.type === 'project'
          ? `Delete project "${confirmDelete?.project?.name}"? This cannot be undone.`
          : 'This will remove the server and all its projects. This cannot be undone.'}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirmDelete?.type === 'project') {
            deleteProject(confirmDelete.serverId, confirmDelete.project.id)
            toast.success(`Project "${confirmDelete.project.name}" deleted`)
          } else {
            deleteServer(confirmDelete.id)
            toast.success('Server deleted')
          }
          setConfirmDelete(null)
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      {deployStepDialog && selectedProject && (
        <DeployStepDialog
          project={selectedProject}
          steps={steps}
          onConfirm={({ skipSteps, customCommands }) => {
            setDeployStepDialog(false)
            runDeploy(selectedProject.id, { skipSteps, customCommands })
            toast.info('Deploying\u2026')
            setTerminalOpen(true)
          }}
          onCancel={() => setDeployStepDialog(false)}
        />
      )}
    </div>
  )
}
