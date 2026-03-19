import { useEffect, useState, useCallback } from 'react'
import useCloudflareStore from '../../stores/useCloudflareStore'
import { toast } from '../../stores/useAppStore'
import { TypeBadge } from '../../components/common/StatusBadge'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { EmptyState } from '../../components/common/EmptyState'
import { DNS_TYPES } from '../../lib/constants'
import {
  Cloud, Plus, Pencil, Trash2, RefreshCw, Search,
  Globe, Shield, ChevronDown, ChevronRight, Link, X,
  BarChart3, Clock, ToggleLeft, ToggleRight, ArrowRight, Eye, EyeOff, Save, Key, Server, Copy, Check
} from 'lucide-react'
import { cn } from '../../lib/utils'

const api = () => window.api

// ─── Copy Button Helper ──────────────────────────────────────────────────────
function CopyBtn({ text, size = 11 }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="flex-shrink-0 p-0.5 text-text-dim hover:text-text-primary transition-colors opacity-0 group-hover/copy:opacity-100" title="Copy">
      {copied ? <Check size={size} className="text-green-400"/> : <Copy size={size}/>}
    </button>
  )
}

// ─── DNS Form Modal ─────────────────────────────────────────────────────────
function DnsFormModal({ type = 'create', record, zoneId, zoneName, onSave, onClose }) {
  const defaultForm = { type:'A', name:'', content:'', ttl:1, proxied:false, comment:'', priority:10 }
  const [form, setForm] = useState(() => {
    if (!record) return defaultForm
    // For edit, shorten the name (strip zone suffix)
    const shortName = record.name.replace('.' + zoneName, '').replace(zoneName, '@')
    return { ...defaultForm, ...record, name: shortName }
  })
  const showPriority = form.type === 'MX' || form.type === 'SRV'
  const showProxied = ['A', 'AAAA', 'CNAME'].includes(form.type)
  const contentLabels = { A:'IPv4 Address', AAAA:'IPv6 Address', CNAME:'Target Hostname', MX:'Mail Server', TXT:'TXT Value', NS:'Nameserver', SRV:'Target', CAA:'CAA Value' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">{type==='create'?'Add DNS Record':'Edit DNS Record'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16}/></button>
        </div>
        <form onSubmit={e=>{e.preventDefault();onSave(zoneId,form);onClose()}} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none">
              {Object.keys(DNS_TYPES).map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Name</label>
            <input value={form.name??''} placeholder="@ or subdomain" onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">{contentLabels[form.type] ?? 'Content / Value'}</label>
            <input value={form.content??''} placeholder="192.0.2.1" onChange={e=>setForm(f=>({...f,content:e.target.value}))}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">TTL</label>
              <select value={form.ttl} onChange={e=>setForm(f=>({...f,ttl:parseInt(e.target.value)}))}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none">
                <option value={1}>Auto</option>
                <option value={60}>1 min</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
                <option value={1800}>30 min</option>
                <option value={3600}>1 hour</option>
                <option value={7200}>2 hours</option>
                <option value={18000}>5 hours</option>
                <option value={43200}>12 hours</option>
                <option value={86400}>1 day</option>
              </select>
            </div>
            {showPriority && (
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Priority</label>
                <input type="number" value={form.priority??10} onChange={e=>setForm(f=>({...f,priority:parseInt(e.target.value)}))}
                  className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none"/>
              </div>
            )}
          </div>
          {showProxied && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.proxied} onChange={e=>setForm(f=>({...f,proxied:e.target.checked}))}
                  className="w-4 h-4 accent-[#f6821f]"/>
                <span className="text-sm text-text-muted">Proxied through Cloudflare</span>
              </label>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Comment <span className="text-text-dim">(optional)</span></label>
            <input value={form.comment??''} placeholder="Note about this record" onChange={e=>setForm(f=>({...f,comment:e.target.value}))}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md">Cancel</button>
            <button type="submit" className="px-4 py-1.5 text-sm text-white rounded-md font-medium" style={{background:'#f6821f'}}>
              {type==='create'?'Add Record':'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CF Account Modal ────────────────────────────────────────────────────────
function CfAccountModal({ account, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: account?.name ?? '',
    email: account?.email ?? '',
    apiToken: account?.apiToken ?? '',
  })
  const [showToken, setShowToken] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleVerify = async () => {
    if (!form.apiToken.trim()) { toast.warn('Enter an API Token first.'); return }
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await api().cf.verifyAccount({ email: form.email.trim(), apiToken: form.apiToken.trim() })
      setVerifyResult(res)
    } catch (err) {
      setVerifyResult({ ok: false, error: err.message })
    } finally { setVerifying(false) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.warn('Account name required.'); return }
    if (!form.apiToken.trim()) { toast.warn('API Token required.'); return }
    setSaving(true)
    try {
      const payload = {
        id: account?.id ?? crypto.randomUUID(),
        name: form.name.trim(),
        email: form.email.trim(),
        apiToken: form.apiToken.trim(),
      }
      await useCloudflareStore.getState().saveAccount(payload)
      onSaved?.()
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">{account ? 'Edit Cloudflare Account' : 'Add Cloudflare Account'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Account Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Zevisoft Main"
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@example.com"
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">API Token</label>
            <div className="flex gap-1">
              <input value={form.apiToken} type={showToken ? 'text' : 'password'}
                onChange={e => setForm(f => ({ ...f, apiToken: e.target.value }))}
                placeholder="Your Cloudflare API Token"
                className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-xs font-mono text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
              <button type="button" onClick={() => setShowToken(v => !v)}
                className="px-2 text-text-dim hover:text-text-primary border border-border-base rounded-md">
                {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Verify result */}
          {verifyResult && (
            <div className={cn('px-3 py-2 rounded-lg text-xs', verifyResult.ok
              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20')}>
              {verifyResult.ok
                ? `✓ Valid${verifyResult.tokenType ? ` (${verifyResult.tokenType})` : ''}! Status: ${verifyResult.status ?? 'active'}${verifyResult.accountName ? ` | ${verifyResult.accountName}` : ''}`
                : `✗ ${verifyResult.error ?? 'Verification failed'}`}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:text-text-primary">Cancel</button>
            <button type="button" onClick={handleVerify} disabled={verifying || !form.apiToken.trim()}
              className="px-4 py-1.5 text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-md font-medium hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-1.5">
              {verifying ? <><LoadingSpinner size={11} color="#60a5fa" />Verifying…</> : <><Key size={13} />Verify</>}
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-4 py-1.5 text-sm text-white rounded-md font-medium flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#f6821f' }}>
              <Save size={13} />{account ? 'Save' : 'Add Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Domain Modal ────────────────────────────────────────────────────────
function AddDomainModal({ onClose, onAdd }) {
  const [domain, setDomain] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const d = domain.trim()
    if (!d) { setError('Please enter a domain name'); return }
    setSaving(true)
    setError('')
    const res = await onAdd(d)
    setSaving(false)
    if (res?.ok) {
      const nsMsg = res.zone.nameservers?.length > 0
        ? `\n\nPoint your domain to:\n${res.zone.nameservers.join('\n')}` : ''
      if (nsMsg) toast.info(`Nameservers for ${res.zone.name}:${nsMsg}`)
      onClose()
    } else if (res) {
      setError(res.error ?? 'Failed to add domain')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-sm mx-4 animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">Add Domain to Cloudflare</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Domain Name</label>
            <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" autoFocus
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
          </div>
          {error && (
            <div className="px-3 py-2 rounded-lg text-xs bg-red-500/15 text-red-400 border border-red-500/20">{error}</div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md hover:text-text-primary">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 text-sm text-white rounded-md font-medium flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#f6821f' }}>
              {saving ? <><LoadingSpinner size={11} color="#fff" /> Adding…</> : <><Plus size={13} /> Add Domain</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Create Tunnel Modal ─────────────────────────────────────────────────────
function CreateTunnelModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!name.trim()) { setError('Please enter a tunnel name'); return }
    setSaving(true); setError('')
    const res = await onCreate(name.trim())
    setSaving(false)
    if (res?.ok) onClose()
    else if (res) setError(res.error ?? 'Failed to create tunnel')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-sm mx-4 animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">Create Tunnel</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Tunnel Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="my-tunnel" autoFocus
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim" />
          </div>
          {error && <div className="px-3 py-2 rounded-lg text-xs bg-red-500/15 text-red-400 border border-red-500/20">{error}</div>}
          <p className="text-[10px] text-text-dim">A random tunnel secret will be auto-generated.</p>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 text-sm text-white rounded-md font-medium flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#f6821f' }}>
              {saving ? <><LoadingSpinner size={11} color="#fff" /> Creating…</> : <><Plus size={13} /> Create</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Ingress Route Modal ─────────────────────────────────────────────────────
function IngressRouteModal({ tunnelId, rule, index, ingress, onSave, onClose }) {
  const isEdit = rule != null
  const [form, setForm] = useState({
    hostname: rule?.hostname ?? '',
    service: rule?.service ?? 'http://localhost:3000',
    path: rule?.path ?? '',
    noTLSVerify: rule?.originRequest?.noTLSVerify ?? false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!form.hostname.trim() || !form.service.trim()) return
    setSaving(true)
    const newRule = {
      hostname: form.hostname.trim(),
      service: form.service.trim(),
      ...(form.path ? { path: form.path } : {}),
      ...(form.noTLSVerify ? { originRequest: { noTLSVerify: true } } : {}),
    }
    let newIngress = [...ingress]
    // Ensure catch-all stays at end
    const catchAllIdx = newIngress.findIndex(r => !r.hostname)
    const catchAll = catchAllIdx >= 0 ? newIngress.splice(catchAllIdx, 1)[0] : { service: 'http_status:404' }

    if (isEdit) {
      // Find the route index among hostname-bearing rules
      newIngress[index] = newRule
    } else {
      newIngress.push(newRule)
    }
    newIngress.push(catchAll) // Re-add catch-all at end
    await onSave(tunnelId, { ingress: newIngress })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">{isEdit ? 'Edit Route' : 'Add Route'}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Hostname</label>
            <input value={form.hostname} onChange={e => setForm(f => ({...f, hostname: e.target.value}))} placeholder="app.example.com" autoFocus
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Service</label>
            <input value={form.service} onChange={e => setForm(f => ({...f, service: e.target.value}))} placeholder="http://localhost:3000"
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Path <span className="text-text-dim">(optional)</span></label>
            <input value={form.path} onChange={e => setForm(f => ({...f, path: e.target.value}))} placeholder="/api/*"
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"/>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.noTLSVerify} onChange={e => setForm(f => ({...f, noTLSVerify: e.target.checked}))}
              className="w-4 h-4 accent-[#f6821f]"/>
            <span className="text-sm text-text-muted">No TLS Verify</span>
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm border border-border-base text-text-muted rounded-md">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 text-sm text-white rounded-md font-medium flex items-center gap-1.5 disabled:opacity-50" style={{ background: '#f6821f' }}>
              {saving ? <><LoadingSpinner size={11} color="#fff" /> Saving…</> : <><Save size={13} /> {isEdit ? 'Save' : 'Add Route'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Zone Tree Sidebar (collapsed by default, lazy-load on expand) ──────────
function ZoneTree({ accounts, selectedAccountId, selectedZoneId, onSelectAccount, onSelectZone, onExpandAccount,
                    onAddAccount, onEditAccount, onDeleteAccount, onAddDomain, whoisCache, onRefreshWhois, isLoadingWhois }) {
  const [expanded, setExpanded] = useState({})
  const [sidebarFilter, setSidebarFilter] = useState('')

  const handleToggle = useCallback(async (accId) => {
    const isNowExpanding = !expanded[accId]
    setExpanded(ex => ({ ...ex, [accId]: isNowExpanding }))
    if (isNowExpanding) {
      await onExpandAccount(accId)
    }
  }, [expanded, onExpandAccount])

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border-base flex-shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">Accounts & Zones</span>
        <div className="flex items-center gap-1">
          <button onClick={onRefreshWhois} disabled={isLoadingWhois} title="Refresh All WHOIS"
            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-1 rounded-md text-text-dim hover:text-[#f6821f] transition-colors disabled:opacity-50">
            <RefreshCw size={11} className={isLoadingWhois ? 'animate-spin' : ''}/>
          </button>
          <button onClick={onAddAccount}
            className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md text-white transition-colors hover:opacity-90"
            style={{ background: '#f6821f' }}>
            <Plus size={11} />Add
          </button>
        </div>
      </div>
      {/* Domain filter */}
      <div className="px-3 py-2 border-b border-border-base/50 flex-shrink-0">
        <div className="flex items-center gap-2 bg-bg-primary border border-border-base rounded-md px-2 py-1">
          <Search size={11} className="text-text-dim flex-shrink-0"/>
          <input value={sidebarFilter} onChange={e => setSidebarFilter(e.target.value)} placeholder="Filter domains…"
            className="bg-transparent outline-none text-[11px] text-text-primary placeholder:text-text-dim w-full"/>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <Cloud size={24} className="text-text-dim mb-2"/>
            <p className="text-xs text-text-dim">No Cloudflare accounts.</p>
            <p className="text-[10px] text-text-dim mt-1">Click <strong>+ Add</strong> above to get started.</p>
          </div>
        )}
        {accounts.map(acc => {
          const isExp = expanded[acc.id] ?? false
          const isSelAcc = selectedAccountId === acc.id
          const hasZones = acc.zones != null
          const isLoading = isExp && !hasZones
          return (
            <div key={acc.id}>
              <div className={cn('group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-bg-hover/60', isSelAcc && 'bg-bg-hover')}
                onClick={() => { onSelectAccount(acc.id); if (!isExp) handleToggle(acc.id) }}>
                <button onClick={e => { e.stopPropagation(); handleToggle(acc.id) }} className="text-text-dim">
                  {isExp ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                </button>
                <Cloud size={14} className="text-[#f6821f] flex-shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{acc.name}</p>
                  <p className="text-[10px] text-text-dim truncate">{acc.email}</p>
                </div>
                {hasZones && <span className="text-[9px] text-text-dim">{acc.zones.length}</span>}
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); onEditAccount(acc) }} className="p-0.5 text-text-dim hover:text-text-primary"><Pencil size={10} /></button>
                  <button onClick={e => { e.stopPropagation(); onDeleteAccount(acc.id) }} className="p-0.5 text-text-dim hover:text-red-400"><Trash2 size={10} /></button>
                </div>
              </div>
              {isExp && (
                isLoading ? (
                  <div className="flex items-center gap-2 pl-9 pr-3 py-2">
                    <LoadingSpinner size={12} color="#f6821f"/>
                    <span className="text-[10px] text-text-dim">Loading domains…</span>
                  </div>
                ) : (
                  <>
                    {(acc.zones ?? [])
                      .filter(z => !sidebarFilter || z.name.toLowerCase().includes(sidebarFilter.toLowerCase()))
                      .map(zone => {
                      const isSel = selectedZoneId === zone.id
                      const wh = whoisCache?.[zone.name]
                      const expiryDays = wh?.expiresDate ? Math.ceil((new Date(wh.expiresDate) - Date.now()) / 86400000) : null
                      const expiryColor = expiryDays != null ? (expiryDays <= 30 ? 'text-red-400' : expiryDays <= 90 ? 'text-yellow-400' : 'text-green-400') : null
                      return (
                        <div key={zone.id}
                          className={cn('flex items-center gap-2 pl-9 pr-3 py-2 cursor-pointer transition-colors hover:bg-bg-hover/60',
                            isSel && 'bg-bg-hover border-l-2 border-[#f6821f]')}
                          onClick={() => onSelectZone(acc.id, zone.id)}>
                          <Globe size={12} className={isSel ? 'text-[#f6821f]' : 'text-text-dim'} style={{flexShrink:0}}/>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary truncate">{zone.name}</p>
                            <p className="text-[10px] text-text-dim">{zone.plan} · {zone.status}</p>
                          </div>
                          {expiryDays != null && (
                            <span className={cn('text-[9px] font-mono font-bold flex-shrink-0', expiryColor)} title={`Expires: ${new Date(wh.expiresDate).toLocaleDateString()}`}>
                              ⏳{expiryDays}d
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {/* Add Domain button at bottom of zone list */}
                    <div className="px-6 py-1.5 border-t border-border-base/30">
                      <button onClick={e => { e.stopPropagation(); onAddDomain() }}
                        className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-text-dim hover:text-text-primary py-1 rounded-md border border-dashed border-border-base hover:border-[#f6821f]/50 transition-colors">
                        <Plus size={10} /> Add Domain
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Right Panel ────────────────────────────────────────────────────────────
function RightPanel({ zone, zoneDetails, zoneAnalytics, isDevMode, onPurgeCache, onToggleDevMode,
                      whoisData, isLoadingWhois, onLookupWhois, isLoadingAnalytics }) {
  if (!zone) return (
    <div className="flex items-center justify-center h-full text-text-dim text-xs">
      Select a zone to view details
    </div>
  )

  const totalRequests  = zoneAnalytics?.totals?.requests?.all ?? 0
  const cachedRequests = zoneAnalytics?.totals?.requests?.cached ?? 0
  const threats        = zoneAnalytics?.totals?.threats?.all ?? 0
  const analyticsTs    = zoneAnalytics?.timeseries ?? []

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* ── Domain Info ─────────────────────────────────────────────── */}
      <div className="bg-bg-primary border border-border-base rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={14} className="text-[#f6821f]"/>
          <span className="text-sm font-semibold text-text-primary">Domain Info</span>
        </div>
        <div className="space-y-2 text-xs">
          <InfoRow label="Domain" value={zone.name} mono/>
          {zoneDetails?.plan && <InfoRow label="Plan" value={zoneDetails.plan}/>}
          <InfoRow label="Status" value={zone.status}
            valueClass={zone.status === 'active' ? 'text-green-400' : 'text-yellow-400'}/>
          {zoneDetails?.type && <InfoRow label="Type" value={zoneDetails.type}/>}
          {zoneDetails?.nameservers?.length > 0 && (
            <div>
              <span className="text-text-dim block mb-1">Nameservers</span>
              {zoneDetails.nameservers.map((ns,i)=>(
                <div key={i} className="text-text-muted font-mono text-[10px] truncate">{ns}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="bg-bg-primary border border-border-base rounded-lg p-4 space-y-3">
        <span className="text-xs font-semibold text-text-primary">Quick Actions</span>
        <button onClick={onPurgeCache}
          className="w-full flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
          <RefreshCw size={12}/>Purge Cache
        </button>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Dev Mode</span>
          <button onClick={onToggleDevMode} className="transition-colors">
            {isDevMode
              ? <ToggleRight size={24} className="text-[#f6821f]"/>
              : <ToggleLeft size={24} className="text-text-dim"/>}
          </button>
        </div>
      </div>

      {/* ── WHOIS ─────────────────────────────────────────────────────── */}
      <div className="bg-bg-primary border border-border-base rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[#f6821f]"/>
            <span className="text-xs font-semibold text-text-primary">WHOIS</span>
          </div>
          <button onClick={() => onLookupWhois(zone.name, true)}
            disabled={isLoadingWhois}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-border-base text-text-dim hover:text-text-primary hover:bg-bg-hover transition-colors disabled:opacity-50">
            {isLoadingWhois ? <LoadingSpinner size={10} color="#f6821f"/> : <RefreshCw size={10}/>}
            {whoisData ? 'Refresh' : 'Lookup'}
          </button>
        </div>
        {whoisData ? (
          <div className="space-y-1.5 text-xs">
            {whoisData.registrar && <InfoRow label="Registrar" value={whoisData.registrar} truncate/>}
            {(whoisData.registrant?.organization || whoisData.registrant?.name) && (
              <InfoRow label="Registrant" value={whoisData.registrant?.organization || whoisData.registrant?.name} truncate/>
            )}
            {whoisData.createdDate && <InfoRow label="Created" value={new Date(whoisData.createdDate).toLocaleDateString()}/>}
            {whoisData.updatedDate && <InfoRow label="Updated" value={new Date(whoisData.updatedDate).toLocaleDateString()}/>}
            {whoisData.expiresDate && (() => {
              const days = Math.ceil((new Date(whoisData.expiresDate) - Date.now()) / 86400000)
              const color = days <= 30 ? 'text-red-400' : days <= 90 ? 'text-yellow-400' : 'text-green-400'
              return (
                <>
                  <InfoRow label="Expires" value={new Date(whoisData.expiresDate).toLocaleDateString()}/>
                  <div className="flex items-center justify-between">
                    <span className="text-text-dim">Remaining</span>
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className={color}/>
                      <span className={cn('font-mono font-bold', color)}>{days}d</span>
                    </div>
                  </div>
                </>
              )
            })()}
            {whoisData.nameservers?.length > 0 && (
              <div>
                <span className="text-text-dim text-[10px]">Nameservers</span>
                <div className="mt-0.5 space-y-0.5">
                  {whoisData.nameservers.map((ns, i) => (
                    <p key={i} className="font-mono text-[10px] text-text-muted truncate">{ns}</p>
                  ))}
                </div>
              </div>
            )}
            {whoisData.estimatedDomainAge && <InfoRow label="Age" value={`${whoisData.estimatedDomainAge} days`}/>}
            {whoisData.fetchedAt && (
              <p className="text-[9px] text-text-dim italic pt-1">
                Cached: {new Date(whoisData.fetchedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-text-dim italic">
            {isLoadingWhois ? 'Loading WHOIS…' : 'Click "Lookup" to fetch WHOIS data.'}
          </p>
        )}
      </div>

      {/* ── Zone Analytics Mini ───────────────────────────────────────── */}
      <div className="bg-bg-primary border border-border-base rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={12} className="text-[#f6821f]"/>
            <span className="text-xs font-semibold text-text-primary">Zone Analytics</span>
          </div>
          <span className="text-[9px] text-text-dim">Last 24h</span>
        </div>
        {isLoadingAnalytics ? (
          <div className="flex justify-center py-3"><LoadingSpinner size={16} color="#f6821f"/></div>
        ) : zoneAnalytics ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Requests" value={formatMetric(totalRequests)} color="text-text-primary"/>
              <MiniStat label="Cached" value={formatMetric(cachedRequests)} color="text-green-400"/>
              <MiniStat label="Threats" value={formatMetric(threats)} color="text-red-400"/>
            </div>
            {analyticsTs.length > 0 && (
              <div className="flex items-end gap-px h-10">
                {analyticsTs.slice(-24).map((ts, i) => {
                  const val = ts.requests?.all ?? 0
                  const max = Math.max(...analyticsTs.slice(-24).map(t => t.requests?.all ?? 0), 1)
                  const h = Math.max(2, (val / max) * 40)
                  return <div key={i} className="flex-1 rounded-t-sm bg-[#f6821f]/60 hover:bg-[#f6821f] transition-colors"
                    style={{height: h}} title={`${val} requests`}/>
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-text-dim italic">No analytics data available.</p>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono, truncate, valueClass }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-text-dim flex-shrink-0">{label}</span>
      <span className={cn('text-text-primary', mono && 'font-mono', truncate && 'truncate max-w-[140px]', valueClass)}>
        {value}
      </span>
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-bg-surface rounded-md px-2 py-2">
      <div className={cn('text-sm font-bold', color)}>{value}</div>
      <div className="text-[9px] text-text-dim">{label}</div>
    </div>
  )
}

function formatMetric(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function formatBytes(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return bytes + ' B'
}

function SectionHeader({ title }) {
  return <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
    <BarChart3 size={14} className="text-[#f6821f]"/>{title}
  </h3>
}

// Area-style overview chart (Cloudflare-like) with label and big number
function OverviewAreaChart({ label, value, data, getValue, getLabel, color = '#3b82f6', formatVal }) {
  if (!data?.length) return null
  const values = data.map(getValue)
  const max = Math.max(...values, 1)
  // Build SVG area
  const w = 500, h = 60
  const step = w / Math.max(data.length - 1, 1)
  const points = values.map((v, i) => [i * step, h - (v / max) * (h - 4)])
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ')
  const areaPath = linePath + ` L${(data.length - 1) * step},${h} L0,${h} Z`

  return (
    <div className="bg-bg-primary border border-border-base rounded-lg p-4">
      <div className="flex items-start gap-6">
        <div className="flex-shrink-0 w-36">
          <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1">{label}</div>
          <div className="text-2xl font-bold text-text-primary font-mono">{value}</div>
        </div>
        <div className="flex-1 min-w-0">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-16" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`grad-${label.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.4"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#grad-${label.replace(/\s/g,'')})`}/>
            <path d={linePath} fill="none" stroke={color} strokeWidth="1.5"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

// Stacked bar chart for requests/bandwidth
function AnalyticsBarChart({ title, subtitle, data, getValue, getCached, getLabel, color, cachedColor, formatValue }) {
  if (!data?.length) return null
  const fmt = formatValue ?? formatMetric
  const maxVal = Math.max(...data.map(getValue), 1)
  return (
    <div className="bg-bg-primary border border-border-base rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-text-primary">{title}</span>
        <span className="text-[9px] text-text-dim">{subtitle}</span>
      </div>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d, i) => {
          const total = getValue(d)
          const cached = getCached?.(d) ?? 0
          const uncached = total - cached
          const totalH = Math.max(2, (total / maxVal) * 96)
          const cachedH = total > 0 ? (cached / total) * totalH : 0
          return (
            <div key={i} className="flex-1 flex flex-col justify-end cursor-default group relative"
              style={{ height: totalH }}
              title={`${getLabel?.(d) ?? i}: ${fmt(total)}${getCached ? ` (cached: ${fmt(cached)})` : ''}`}>
              {getCached && cachedH > 0 && (
                <div className="rounded-t-sm transition-colors" style={{
                  height: cachedH, background: cachedColor + '90',
                }}/>
              )}
              <div className="transition-colors group-hover:opacity-80" style={{
                height: totalH - cachedH, background: color + '90', borderRadius: cachedH > 0 ? 0 : '2px 2px 0 0',
              }}/>
            </div>
          )
        })}
      </div>
      {data.length > 1 && (
        <div className="flex justify-between mt-1 text-[9px] text-text-dim">
          <span>{getLabel?.(data[0])}</span>
          <span>{getLabel?.(data.at(-1))}</span>
        </div>
      )}
      {getCached && (
        <div className="flex items-center gap-4 mt-2 text-[9px] text-text-dim">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: color }}/> Uncached</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: cachedColor }}/> Cached</span>
        </div>
      )}
    </div>
  )
}

// Horizontal bar breakdown table
function BreakdownTable({ title, items, nameKey, valueKey, color, getColor }) {
  if (!items?.length) return null
  const maxVal = Math.max(...items.map(i => i[valueKey] ?? 0), 1)
  return (
    <div className="bg-bg-primary border border-border-base rounded-lg p-4">
      <span className="text-xs font-semibold text-text-primary block mb-3">{title}</span>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const val = item[valueKey] ?? 0
          const pct = (val / maxVal) * 100
          const barColor = getColor ? getColor(item) : color
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-text-muted truncate flex-shrink-0" style={{ width: '40%' }}>
                {item[nameKey]}
              </span>
              <div className="flex-1 h-4 bg-bg-surface rounded-sm overflow-hidden relative">
                <div className="h-full rounded-sm transition-all" style={{ width: `${pct}%`, background: barColor + '70' }}/>
              </div>
              <span className="text-text-primary font-mono text-[10px] flex-shrink-0 w-14 text-right">
                {formatMetric(val)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BandwidthStat({ label, bytes, color }) {
  return (
    <div className="text-center">
      <span className={cn('text-lg font-bold font-mono', color)}>{formatBytes(bytes ?? 0)}</span>
      <p className="text-[10px] text-text-dim mt-1">{label}</p>
    </div>
  )
}

function AnalyticsTimeRange({ onRangeChange }) {
  const [active, setActive] = useState('24h')
  const ranges = [
    { label: '24 Hours', key: '24h', mins: 1440 },
    { label: '7 Days', key: '7d', mins: 10080 },
    { label: '30 Days', key: '30d', mins: 43200 },
  ]
  return (
    <div className="flex items-center gap-1 bg-bg-primary border border-border-base rounded-md p-0.5">
      {ranges.map(r => (
        <button key={r.key}
          onClick={() => { setActive(r.key); onRangeChange(r.mins) }}
          className={cn('px-2.5 py-1 text-[10px] font-medium rounded transition-colors',
            active === r.key ? 'bg-[#f6821f]/20 text-[#f6821f]' : 'text-text-dim hover:text-text-primary')}>
          {r.label}
        </button>
      ))}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function CloudflarePage() {
  const {
    accounts, selectedAccountId, selectedZoneId, dnsRecords, tunnels, tunnelConfigs,
    activeTab, dnsFilter,
    isLoadingDns, isLoadingTunnels, isDevMode, isLoadingWhois,
    zoneDetails, zoneSettings, zoneAnalytics, isLoadingDetails, isLoadingAnalytics,
    whoisCache, serverIpMap,
    loadAccounts, selectAccount, selectZone, loadZonesForAccount,
    loadDnsRecords, loadTunnels,
    setActiveTab, setDnsFilter,
    createDnsRecord, updateDnsRecord, deleteDnsRecord, purgeCache, toggleDevMode, lookupWhois,
    addZone, deleteZone, toggleDnsProxy,
    createTunnel, deleteTunnel, updateTunnelConfig,
    refreshAllWhois,
  } = useCloudflareStore()

  const [dnsModal, setDnsModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [accountModal, setAccountModal] = useState(null)  // null = closed, {} = add, { ...acc } = edit
  const [addDomainModal, setAddDomainModal] = useState(false)
  const [createTunnelModal, setCreateTunnelModal] = useState(false)
  const [ingressModal, setIngressModal] = useState(null) // { tunnelId, rule?, index? }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)
  const selectedZone = selectedAccount?.zones?.find(z => z.id === selectedZoneId)

  // Helper: shorten DNS name
  const shortName = (name) => {
    if (!selectedZone) return name
    const z = selectedZone.name
    if (name === z) return '@'
    return name.endsWith('.' + z) ? name.slice(0, -(z.length + 1)) : name
  }

  const filteredDns = dnsFilter
    ? dnsRecords.filter(r =>
        r.name.toLowerCase().includes(dnsFilter.toLowerCase()) ||
        r.type.toLowerCase().includes(dnsFilter.toLowerCase()) ||
        r.content.toLowerCase().includes(dnsFilter.toLowerCase()))
    : dnsRecords

  useEffect(() => { loadAccounts() }, [])
  useEffect(() => {
    if (selectedZoneId && selectedAccountId)
      loadDnsRecords({ accountId: selectedAccountId, zoneId: selectedZoneId })
  }, [selectedZoneId, selectedAccountId])

  const whoisData = selectedZone ? whoisCache[selectedZone.name] : null

  const TABS = [
    { id: 'dns', label: 'DNS Records' },
    { id: 'tunnels', label: 'Tunnels' },
    { id: 'settings', label: 'Zone Settings' },
    { id: 'analytics', label: 'Analytics' },
  ]

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Zone Tree */}
      <div className="flex flex-col bg-bg-surface border-r border-border-base overflow-hidden" style={{width:240,minWidth:180}}>
        <ZoneTree
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          selectedZoneId={selectedZoneId}
          whoisCache={whoisCache}
          onSelectAccount={selectAccount}
          onSelectZone={(accId, zoneId) => selectZone(zoneId, accId)}
          onExpandAccount={loadZonesForAccount}
          onAddAccount={() => setAccountModal({})}
          onEditAccount={(acc) => setAccountModal(acc)}
          onDeleteAccount={async (id) => {
            if (!confirm('Delete this Cloudflare account? This cannot be undone.')) return
            await useCloudflareStore.getState().deleteAccount(id)
          }}
          onAddDomain={() => setAddDomainModal(true)}
          onRefreshWhois={refreshAllWhois}
          isLoadingWhois={isLoadingWhois}
        />
      </div>
      <div className="resize-divider"/>

      {/* Center: Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedZone && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-base bg-bg-surface/60 flex-shrink-0">
            <Globe size={16} className="text-[#f6821f]"/>
            <span className="font-semibold text-text-primary text-sm">{selectedZone.name}</span>
            <span className="badge bg-[#f6821f]/20 text-[#f6821f] border border-[#f6821f]/30 text-[10px]">{selectedZone.plan}</span>
            <span className="text-[10px] font-mono text-text-dim cursor-pointer hover:text-text-muted" title="Click to copy Zone ID"
              onClick={() => { navigator.clipboard.writeText(selectedZoneId); toast.success('Zone ID copied') }}>
              {selectedZoneId?.slice(0, 12)}…
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => loadDnsRecords()} title="Refresh DNS"
                className="p-1.5 text-text-dim hover:text-[#f6821f] transition-colors rounded"><RefreshCw size={13}/></button>
              <button onClick={purgeCache} title="Purge Cache"
                className="p-1.5 text-text-dim hover:text-[#f6821f] transition-colors rounded"><Trash2 size={13}/></button>
              <button title="Delete Domain" onClick={async () => {
                  if (!confirm(`Delete "${selectedZone.name}" from Cloudflare? This cannot be undone.`)) return
                  await deleteZone(selectedZoneId, selectedZone.name)
                }}
                className="p-1.5 text-text-dim hover:text-red-400 transition-colors rounded"><X size={13}/></button>
            </div>
          </div>
        )}
        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border-base bg-bg-surface/40 flex-shrink-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors',
                activeTab === t.id ? 'bg-[#f6821f]/20 text-[#f6821f]' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover')}>
              {t.label}
            </button>
          ))}
          {activeTab === 'dns' && (
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 bg-bg-primary border border-border-base rounded-md px-2.5 py-1">
                <Search size={12} className="text-text-dim"/>
                <input value={dnsFilter} onChange={e => setDnsFilter(e.target.value)} placeholder="Filter records…"
                  className="bg-transparent outline-none text-xs text-text-primary placeholder:text-text-dim w-36"/>
              </div>
              <button onClick={() => setDnsModal({ type: 'create' })}
                className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-md transition-colors" style={{background:'#f6821f'}}>
                <Plus size={12}/>Add Record
              </button>
            </div>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── DNS Records ─────────────────────────────────────────── */}
          {activeTab === 'dns' && (
            <>
              {isLoadingDns ? (
                <div className="flex items-center justify-center p-16"><LoadingSpinner size={24} color="#f6821f"/></div>
              ) : (
                <table className="data-table">
                  <thead className="sticky top-0 bg-bg-surface z-10">
                    <tr><th>Type</th><th>Name</th><th>Content/Value</th><th>Proxy</th><th>TTL</th><th className="w-20">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredDns.map(r => {
                      const dtype = DNS_TYPES[r.type] ?? {color:'#94a3b8',bg:'rgba(148,163,184,0.15)'}
                      return (
                        <tr key={r.id} title={r.comment || undefined}>
                          <td><TypeBadge label={r.type} color={dtype.color} bg={dtype.bg}/></td>
                          <td className="font-mono text-sm">{shortName(r.name)}</td>
                          <td className="font-mono text-xs text-text-muted">
                            <div className="flex items-center gap-1.5 max-w-xs group/copy">
                              <span className="truncate">{r.content}</span>
                              <CopyBtn text={r.content}/>
                              {serverIpMap[r.content] && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 whitespace-nowrap flex-shrink-0" title={`Server: ${serverIpMap[r.content]}`}>
                                  <Server size={9}/>{serverIpMap[r.content]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            {r.proxiable ? (
                              <button onClick={() => toggleDnsProxy(r.id)}
                                className="flex items-center gap-1 cursor-pointer group transition-colors" title={r.proxied ? 'Click to disable proxy' : 'Click to enable proxy'}>
                                {r.proxied
                                  ? <><Cloud size={14} className="text-[#f6821f] group-hover:text-orange-300"/><span className="text-[10px] text-[#f6821f]">Proxied</span></>
                                  : <><Cloud size={14} className="text-slate-500 group-hover:text-slate-300"/><span className="text-[10px] text-slate-400">DNS only</span></>}
                              </button>
                            ) : (
                              <span className="text-[10px] text-text-dim">—</span>
                            )}
                          </td>
                          <td className="text-xs text-text-dim">{r.ttl === 1 ? 'Auto' : r.ttl + 's'}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setDnsModal({type:'edit',record:r})} className="p-1 text-text-dim hover:text-text-primary transition-colors rounded"><Pencil size={13}/></button>
                              <button onClick={() => setConfirmDelete(r.id)} className="p-1 text-text-dim hover:text-red-400 transition-colors rounded"><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {!isLoadingDns && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-border-base text-[10px] text-text-dim">
                  <span>{dnsRecords.length} record{dnsRecords.length !== 1 ? 's' : ''}{dnsFilter ? ` (${filteredDns.length} matched)` : ''}</span>
                </div>
              )}
              {!filteredDns.length && !isLoadingDns && (
                <div className="py-16 text-center text-text-dim text-sm">No DNS records found.</div>
              )}
            </>
          )}

          {/* ── Tunnels (with Ingress Routes) ────────────────────────── */}
          {activeTab === 'tunnels' && (
            <div className="p-4 space-y-3">
              {/* Header with New Tunnel button */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted">{tunnels.length} Tunnel{tunnels.length !== 1 ? 's' : ''}</span>
                <button onClick={() => setCreateTunnelModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-md" style={{background:'#f6821f'}}>
                  <Plus size={12}/>New Tunnel
                </button>
              </div>
              {isLoadingTunnels ? (
                <div className="flex items-center justify-center p-16"><LoadingSpinner size={24} color="#f6821f"/></div>
              ) : tunnels.length > 0 ? (
                tunnels.map(tunnel => {
                  const config = tunnelConfigs[tunnel.id]
                  const ingress = config?.ingress ?? []
                  const routes = ingress.filter(r => r.hostname)
                  const catchAll = ingress.find(r => !r.hostname)
                  return (
                    <div key={tunnel.id} className="bg-bg-primary border border-border-base rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={cn('w-2 h-2 rounded-full', tunnel.status === 'healthy' ? 'bg-accent-deploy animate-pulse-soft' : 'bg-yellow-400')}/>
                        <span className="font-semibold text-sm text-text-primary">{tunnel.name}</span>
                        <span className={cn('badge text-xs', tunnel.status === 'healthy'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30')}>{tunnel.status}</span>
                        <span className="text-[10px] font-mono text-text-dim cursor-pointer hover:text-text-muted" title="Click to copy Tunnel ID"
                          onClick={() => { navigator.clipboard.writeText(tunnel.id); toast.success('Tunnel ID copied') }}>
                          {tunnel.id?.slice(0, 8)}…
                        </span>
                        <span className="ml-auto text-xs font-mono text-text-dim">{tunnel.connections?.[0]?.clientVersion ?? '—'}</span>
                        <button onClick={async () => {
                            if (!confirm(`Delete tunnel "${tunnel.name}"? This cannot be undone.`)) return
                            await deleteTunnel(tunnel.id, tunnel.name)
                          }} className="p-1 text-text-dim hover:text-red-400 transition-colors rounded" title="Delete Tunnel">
                          <Trash2 size={13}/>
                        </button>
                      </div>

                      {/* Active Connections */}
                      {tunnel.connections?.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim mb-1">
                            Active Connections ({tunnel.connections.length})
                          </p>
                          {tunnel.connections.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-bg-surface border border-border-base rounded-md px-3 py-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0"/>
                              <span className="font-mono text-text-muted">#{c.connIndex ?? i}</span>
                              <span className="font-mono text-text-primary">{c.originIp ?? '—'}</span>
                              <span className="font-mono text-green-400">{c.coloName ?? ''}</span>
                              <span className="ml-auto font-mono text-text-dim text-[10px]">{c.clientVersion ?? ''}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Ingress Rules */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
                            Ingress Rules ({routes.length})
                          </p>
                          <button onClick={() => setIngressModal({ tunnelId: tunnel.id })}
                            className="flex items-center gap-1 text-[10px] font-medium text-[#f6821f] hover:text-orange-300">
                            <Plus size={10}/>Add Route
                          </button>
                        </div>
                        {routes.map((rule, i) => (
                          <div key={i} className="group flex items-center gap-2 text-xs bg-bg-surface border border-border-base rounded-md px-3 py-1.5">
                            <Globe size={11} className="text-[#f6821f] flex-shrink-0"/>
                            <span className="font-mono text-text-primary">{rule.hostname}</span>
                            {rule.path && <span className="font-mono text-text-dim">{rule.path}</span>}
                            <ArrowRight size={10} className="text-text-dim flex-shrink-0"/>
                            <span className="font-mono text-blue-400 truncate">{rule.service}</span>
                            <div className="ml-auto hidden group-hover:flex items-center gap-1">
                              <button onClick={() => setIngressModal({ tunnelId: tunnel.id, rule, index: i })}
                                className="p-0.5 text-text-dim hover:text-text-primary"><Pencil size={10}/></button>
                              <button onClick={async () => {
                                  if (!confirm(`Delete route "${rule.hostname}"?`)) return
                                  const newIngress = ingress.filter((_, idx) => idx !== i)
                                  await updateTunnelConfig(tunnel.id, { ingress: newIngress })
                                }} className="p-0.5 text-text-dim hover:text-red-400"><Trash2 size={10}/></button>
                            </div>
                          </div>
                        ))}
                        {catchAll && (
                          <div className="flex items-center gap-2 text-xs bg-bg-surface/50 border border-border-base/50 rounded-md px-3 py-1.5 text-text-dim">
                            <span className="font-mono">Catch-all → {catchAll.service}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState icon={Link} title="No tunnels" message="Create a Cloudflare Tunnel to securely expose local services."/>
              )}
            </div>
          )}

          {/* ── Zone Settings ────────────────────────────────────────── */}
          {activeTab === 'settings' && selectedZone && (
            <div className="p-4 space-y-3 max-w-lg">
              {[
                ['Domain', selectedZone.name],
                ['Plan', selectedZone.plan],
                ['Type', zoneDetails?.type ?? 'full'],
                ['Status', selectedZone.status],
                ['Created', zoneDetails?.createdOn ? new Date(zoneDetails.createdOn).toLocaleDateString() : '—'],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between py-2 border-b border-border-base/50">
                  <span className="text-sm text-text-muted">{l}</span>
                  <span className="text-sm font-medium text-text-primary font-mono">{v}</span>
                </div>
              ))}
              {zoneDetails?.nameservers?.length > 0 && (
                <div className="py-2 border-b border-border-base/50">
                  <span className="text-sm text-text-muted block mb-2">Nameservers</span>
                  <div className="space-y-1">
                    {zoneDetails.nameservers.map((ns, i) => (
                      <div key={i} className="text-xs font-mono text-text-primary bg-bg-primary border border-border-base rounded px-3 py-1.5">{ns}</div>
                    ))}
                  </div>
                </div>
              )}
              {zoneSettings && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border-base/50">
                    <span className="text-sm text-text-muted">SSL Mode</span>
                    <span className="text-sm font-medium text-text-primary">{zoneSettings.ssl ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border-base/50">
                    <span className="text-sm text-text-muted">Min TLS Version</span>
                    <span className="text-sm font-medium text-text-primary">{zoneSettings.min_tls_version ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border-base/50">
                    <span className="text-sm text-text-muted">Development Mode</span>
                    <span className={cn('text-sm font-medium', isDevMode ? 'text-yellow-400' : 'text-text-primary')}>{isDevMode ? 'ON' : 'OFF'}</span>
                  </div>
                </>
              )}
              <div className="pt-3">
                <button className="flex items-center gap-2 text-xs px-3 py-2 border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors">
                  <Shield size={12}/>View SSL / TLS Settings
                </button>
              </div>
            </div>
          )}

          {/* ── Analytics (comprehensive dashboard) ────────────────── */}
          {activeTab === 'analytics' && (
            <div className="p-4">
              {isLoadingAnalytics ? (
                <div className="flex items-center justify-center p-16"><LoadingSpinner size={24} color="#f6821f"/></div>
              ) : zoneAnalytics ? (
                <div className="space-y-5">

                  {/* ── Domain Overview (Cloudflare-style area charts) ── */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-text-primary">Overview</h2>
                      <p className="text-[10px] text-text-dim mt-0.5">
                        Monitor how Cloudflare processes traffic for this zone.
                      </p>
                    </div>
                    <AnalyticsTimeRange
                      onRangeChange={(mins) => {
                        const { selectedAccountId, selectedZoneId, accounts } = useCloudflareStore.getState()
                        const account = accounts.find(a => a.id === selectedAccountId)
                        if (account && selectedZoneId) {
                          useCloudflareStore.getState().fetchZoneAnalytics(account, selectedZoneId, `-${mins}`)
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-3">
                    <OverviewAreaChart
                      label="Unique Visitors"
                      value={formatMetric(zoneAnalytics.totals?.uniques?.all ?? 0)}
                      data={zoneAnalytics.timeseries ?? []}
                      getValue={ts => ts.uniques?.all ?? 0}
                      color="#3b82f6"
                    />
                    <OverviewAreaChart
                      label="Total Requests"
                      value={formatMetric(zoneAnalytics.totals?.requests?.all ?? 0)}
                      data={zoneAnalytics.timeseries ?? []}
                      getValue={ts => ts.requests?.all ?? 0}
                      color="#3b82f6"
                    />
                    <OverviewAreaChart
                      label="Percent Cached"
                      value={zoneAnalytics.totals?.requests?.all > 0
                        ? ((zoneAnalytics.totals.requests.cached / zoneAnalytics.totals.requests.all) * 100).toFixed(2) + '%'
                        : '0%'
                      }
                      data={zoneAnalytics.timeseries ?? []}
                      getValue={ts => {
                        const all = ts.requests?.all ?? 0
                        const cached = ts.requests?.cached ?? 0
                        return all > 0 ? (cached / all) * 100 : 0
                      }}
                      color="#3b82f6"
                    />
                    <OverviewAreaChart
                      label="Total Data Served"
                      value={formatBytes(zoneAnalytics.totals?.bandwidth?.all ?? 0)}
                      data={zoneAnalytics.timeseries ?? []}
                      getValue={ts => ts.bandwidth?.all ?? 0}
                      color="#3b82f6"
                    />
                    <OverviewAreaChart
                      label="Data Cached"
                      value={formatBytes(zoneAnalytics.totals?.bandwidth?.cached ?? 0)}
                      data={zoneAnalytics.timeseries ?? []}
                      getValue={ts => ts.bandwidth?.cached ?? 0}
                      color="#3b82f6"
                    />
                  </div>

                  {/* ── HTTP overview stat cards ───────────────────── */}
                  <div className="border-t border-border-base pt-4 mt-2">
                    <SectionHeader title="HTTP Traffic Breakdown" />
                  </div>
                  <div className="grid grid-cols-6 gap-3">
                    {[
                      ['Total Requests', formatMetric(zoneAnalytics.totals?.requests?.all ?? 0), 'text-[#f6821f]'],
                      ['Cached', formatMetric(zoneAnalytics.totals?.requests?.cached ?? 0), 'text-green-400'],
                      ['Uncached', formatMetric(zoneAnalytics.totals?.requests?.uncached ?? 0), 'text-yellow-400'],
                      ['Unique Visitors', formatMetric(zoneAnalytics.totals?.uniques?.all ?? 0), 'text-blue-400'],
                      ['Page Views', formatMetric(zoneAnalytics.totals?.pageviews?.all ?? 0), 'text-purple-400'],
                      ['Threats', formatMetric(zoneAnalytics.totals?.threats?.all ?? 0), 'text-red-400'],
                    ].map(([label, val, color]) => (
                      <div key={label} className="bg-bg-primary border border-border-base rounded-lg p-3 text-center">
                        <div className={cn('text-lg font-bold', color)}>{val}</div>
                        <div className="text-[10px] text-text-dim mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Requests timeseries chart ─────────────────── */}
                  <AnalyticsBarChart
                    title="Requests"
                    subtitle="per day"
                    data={zoneAnalytics.timeseries ?? []}
                    getValue={ts => ts.requests?.all ?? 0}
                    getCached={ts => ts.requests?.cached ?? 0}
                    getLabel={ts => ts.since?.slice(5, 10)}
                    color="#f6821f"
                    cachedColor="#22c55e"
                  />

                  {/* ── Bandwidth timeseries chart ────────────────── */}
                  <AnalyticsBarChart
                    title="Bandwidth"
                    subtitle="per day"
                    data={zoneAnalytics.timeseries ?? []}
                    getValue={ts => ts.bandwidth?.all ?? 0}
                    getCached={ts => ts.bandwidth?.cached ?? 0}
                    getLabel={ts => ts.since?.slice(5, 10)}
                    color="#3b82f6"
                    cachedColor="#22c55e"
                    formatValue={formatBytes}
                  />

                  {/* ── Bandwidth breakdown ───────────────────────── */}
                  {zoneAnalytics.totals?.bandwidth && (
                    <div className="bg-bg-primary border border-border-base rounded-lg p-4">
                      <SectionHeader title="Bandwidth Breakdown" />
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <BandwidthStat label="Total" bytes={zoneAnalytics.totals.bandwidth.all} color="text-blue-400" />
                        <BandwidthStat label="Cached" bytes={zoneAnalytics.totals.bandwidth.cached} color="text-green-400" />
                        <BandwidthStat label="Uncached" bytes={zoneAnalytics.totals.bandwidth.uncached} color="text-yellow-400" />
                      </div>
                      {/* Cache ratio bar */}
                      {zoneAnalytics.totals.bandwidth.all > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-text-dim mb-1">
                            <span>Cache Hit Ratio</span>
                            <span>{Math.round((zoneAnalytics.totals.bandwidth.cached / zoneAnalytics.totals.bandwidth.all) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: `${(zoneAnalytics.totals.bandwidth.cached / zoneAnalytics.totals.bandwidth.all) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Encrypted traffic ─────────────────────────── */}
                  {(zoneAnalytics.totals?.encrypted?.requests ?? 0) > 0 && (
                    <div className="bg-bg-primary border border-border-base rounded-lg p-4">
                      <SectionHeader title="Encrypted Traffic (HTTPS)" />
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="text-center">
                          <span className="text-lg font-bold text-emerald-400 font-mono">{formatMetric(zoneAnalytics.totals.encrypted.requests)}</span>
                          <p className="text-[10px] text-text-dim mt-1">HTTPS Requests</p>
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-bold text-emerald-400 font-mono">{formatBytes(zoneAnalytics.totals.encrypted.bytes)}</span>
                          <p className="text-[10px] text-text-dim mt-1">HTTPS Bandwidth</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Two-column: Countries + Content Types ─────── */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Countries */}
                    <BreakdownTable
                      title="Top Countries"
                      items={zoneAnalytics.countries ?? []}
                      nameKey="name"
                      valueKey="requests"
                      color="#f6821f"
                    />
                    {/* Content Types */}
                    <BreakdownTable
                      title="Content Types"
                      items={zoneAnalytics.contentTypes ?? []}
                      nameKey="name"
                      valueKey="requests"
                      color="#8b5cf6"
                    />
                  </div>

                  {/* ── HTTP Status Codes ─────────────────────────── */}
                  <BreakdownTable
                    title="HTTP Status Codes"
                    items={zoneAnalytics.statusCodes ?? []}
                    nameKey="code"
                    valueKey="requests"
                    color="#3b82f6"
                    getColor={item => {
                      const c = parseInt(item.code)
                      if (c >= 500) return '#ef4444'
                      if (c >= 400) return '#f59e0b'
                      if (c >= 300) return '#3b82f6'
                      return '#22c55e'
                    }}
                  />

                  {/* ── DNS Analytics ─────────────────────────────── */}
                  {zoneAnalytics.dns && (
                    <>
                      <div className="border-t border-border-base pt-4 mt-2">
                        <SectionHeader title="DNS Analytics" />
                      </div>

                      {/* DNS stat cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-bg-primary border border-border-base rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-cyan-400">{formatMetric(zoneAnalytics.dns.totalQueries)}</div>
                          <div className="text-[10px] text-text-dim">Total DNS Queries</div>
                        </div>
                        <div className="bg-bg-primary border border-border-base rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-cyan-400">
                            {zoneAnalytics.dns.timeseries.length > 0
                              ? (zoneAnalytics.dns.totalQueries / (zoneAnalytics.dns.timeseries.length * 86400)).toFixed(3)
                              : '0'}
                          </div>
                          <div className="text-[10px] text-text-dim">Avg Queries/sec</div>
                        </div>
                        <div className="bg-bg-primary border border-border-base rounded-lg p-3 text-center">
                          <div className="text-lg font-bold text-cyan-400">{zoneAnalytics.dns.byName?.length ?? 0}</div>
                          <div className="text-[10px] text-text-dim">Unique Names</div>
                        </div>
                      </div>

                      {/* DNS query chart */}
                      {zoneAnalytics.dns.timeseries?.length > 0 && (
                        <div className="bg-bg-primary border border-border-base rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-text-primary">DNS Queries</span>
                            <span className="text-[9px] text-text-dim">per day</span>
                          </div>
                          <div className="flex items-end gap-[2px] h-20">
                            {zoneAnalytics.dns.timeseries.map((d, i) => {
                              const max = Math.max(...zoneAnalytics.dns.timeseries.map(t => t.queries), 1)
                              const h = Math.max(2, (d.queries / max) * 80)
                              return <div key={i} className="flex-1 rounded-t-sm bg-cyan-500/60 hover:bg-cyan-400 transition-colors cursor-default"
                                style={{ height: h }} title={`${d.date}: ${d.queries.toLocaleString()} queries`} />
                            })}
                          </div>
                          <div className="flex justify-between mt-1 text-[9px] text-text-dim">
                            <span>{zoneAnalytics.dns.timeseries[0]?.date?.slice(5)}</span>
                            <span>{zoneAnalytics.dns.timeseries.at(-1)?.date?.slice(5)}</span>
                          </div>
                        </div>
                      )}

                      {/* DNS breakdown tables: 2x2 grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <BreakdownTable title="Query Names" items={zoneAnalytics.dns.byName ?? []} nameKey="name" valueKey="queries" color="#06b6d4" />
                        <BreakdownTable title="Query Types" items={zoneAnalytics.dns.byType ?? []} nameKey="type" valueKey="queries" color="#14b8a6" />
                      </div>
                      <BreakdownTable title="DNS Response Codes" items={zoneAnalytics.dns.byResponseCode ?? []} nameKey="code" valueKey="queries" color="#06b6d4"
                        getColor={item => item.code === 'NOERROR' ? '#22c55e' : item.code === 'NXDOMAIN' ? '#f59e0b' : '#ef4444'}
                      />
                    </>
                  )}
                </div>
              ) : (
                <EmptyState icon={BarChart3} title="No analytics" message="Analytics data is not available for this zone."/>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Domain info panel */}
      <div className="resize-divider"/>
      <div className="flex flex-col bg-bg-surface border-l border-border-base overflow-hidden" style={{width:260,minWidth:200}}>
        <RightPanel
          zone={selectedZone}
          zoneDetails={zoneDetails}
          zoneAnalytics={zoneAnalytics}
          isDevMode={isDevMode}
          onPurgeCache={purgeCache}
          onToggleDevMode={toggleDevMode}
          whoisData={whoisData}
          isLoadingWhois={isLoadingWhois}
          onLookupWhois={lookupWhois}
          isLoadingAnalytics={isLoadingAnalytics}
        />
      </div>

      {dnsModal && (
        <DnsFormModal type={dnsModal.type} record={dnsModal.record} zoneId={selectedZoneId}
          zoneName={selectedZone?.name}
          onSave={async (zid, r) => {
            dnsModal.type === 'create' ? await createDnsRecord(r) : await updateDnsRecord(r.id, r)
          }}
          onClose={() => setDnsModal(null)}/>
      )}
      <ConfirmDialog isOpen={!!confirmDelete} title="Delete DNS Record" message="This will permanently delete this DNS record."
        confirmLabel="Delete"
        onConfirm={async () => { await deleteDnsRecord(confirmDelete); setConfirmDelete(null) }}
        onCancel={() => setConfirmDelete(null)}/>
      {accountModal && (
        <CfAccountModal
          account={accountModal.id ? accountModal : null}
          onClose={() => setAccountModal(null)}
          onSaved={() => loadAccounts()}
        />
      )}
      {addDomainModal && (
        <AddDomainModal
          onClose={() => setAddDomainModal(false)}
          onAdd={addZone}
        />
      )}
      {/* Create Tunnel Modal */}
      {createTunnelModal && (
        <CreateTunnelModal
          onClose={() => setCreateTunnelModal(false)}
          onCreate={createTunnel}
        />
      )}
      {/* Ingress Route Modal */}
      {ingressModal && (
        <IngressRouteModal
          tunnelId={ingressModal.tunnelId}
          rule={ingressModal.rule}
          index={ingressModal.index}
          ingress={tunnelConfigs[ingressModal.tunnelId]?.ingress ?? []}
          onSave={updateTunnelConfig}
          onClose={() => setIngressModal(null)}
        />
      )}
    </div>
  )
}
