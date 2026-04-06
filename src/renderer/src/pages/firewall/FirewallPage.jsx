import { useState, useEffect, useRef } from 'react'
import useFirewallStore from '../../stores/useFirewallStore'
import useAppStore, { toast } from '../../stores/useAppStore'
import { StatusBadge, TypeBadge } from '../../components/common/StatusBadge'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { FW_PROVIDERS } from '../../lib/constants'
import { relativeTime } from '../../lib/utils'
import {
  Shield, RefreshCw, Plus, Pencil, Trash2, Terminal,
  Zap, Eye, EyeOff, CheckSquare, Square
} from 'lucide-react'

// ─── Target Form Modal ──────────────────────────────────────────────────────
function TargetFormModal({ target, onSave, onClose }) {
  const [form, setForm] = useState(target ?? {
    provider: 'gcp', description: '', project: '', firewallName: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-md mx-4 animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <h3 className="font-semibold text-text-primary">
            {target ? 'Edit Firewall Target' : 'Add Firewall Target'}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Provider</label>
            <select
              value={form.provider}
              onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
              className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none"
            >
              {Object.entries(FW_PROVIDERS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {[
            { key: 'description', label: 'Description', placeholder: 'e.g. Production API Server' },
            { key: 'project',     label: 'Project / Resource',  placeholder: 'e.g. my-gcp-project' },
            { key: 'firewallName', label: 'Firewall / Rule Name', placeholder: 'e.g. default-allow-ssh' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-text-muted mb-1.5">{f.label}</label>
              <input
                value={form[f.key] ?? ''}
                onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-sm border border-border-base text-text-muted hover:text-text-primary rounded-md transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="px-4 py-1.5 text-sm bg-accent-firewall hover:bg-red-600 text-white rounded-md font-medium transition-colors">
              {target ? 'Save Changes' : 'Add Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── IP Card ────────────────────────────────────────────────────────────────
function IPCardGrid({ interfaces, onRefresh, isRefreshing }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-dim">My Public IPs</span>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
      <div className="space-y-2">
        {interfaces.map((iface, i) => (
          <div key={i} className="bg-bg-primary border border-border-base rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">{iface.name}</span>
              <span className="text-[10px] text-text-dim font-mono">{iface.localIp}</span>
            </div>
            <div className="mt-1">
              <span className="font-mono text-sm font-medium" style={{ color: '#22c55e' }}>
                {iface.publicIp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Log Line ───────────────────────────────────────────────────────────────
const LOG_COLORS = {
  success: '#22c55e', error: '#ef4444', warning: '#eab308',
  section: '#818cf8', info: '#94a3b8',
}

function LogPanel({ lines, onClear, onUpdateAll, isUpdating, selectedCount }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView() }, [lines])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-base flex-shrink-0">
        <div className="flex items-center gap-2 text-text-muted text-xs font-semibold uppercase tracking-wider">
          <Terminal size={12} />
          Log Output
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-xs text-text-dim hover:text-text-muted px-2 py-0.5 rounded transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onUpdateAll}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
          >
            {isUpdating
              ? <><LoadingSpinner size={11} color="white" />Updating…</>
              : <><Zap size={11} />{selectedCount > 0 ? `Update Selected (${selectedCount})` : 'Update All Firewalls'}</>
            }
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 terminal-bg font-mono text-xs leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} style={{ color: LOG_COLORS[line.type] ?? '#94a3b8' }}>
            <span className="opacity-50 mr-2">[{line.ts}]</span>
            {line.text}
          </div>
        ))}
        {!lines.length && (
          <div className="text-text-dim italic">Ready. Click "Update All Firewalls" to begin.</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function FirewallPage() {
  const {
    targets, interfaces, logLines,
    selectedIds, isUpdating, customIps,
    loadTargets, refreshIPs, updateAllFirewalls, clearLog,
    addTarget, updateTarget, deleteTarget,
    toggleSelect, selectAll, clearSelection, setCustomIps,
  } = useFirewallStore()

  const [showIPs, setShowIPs] = useState(true)
  const [modal, setModal] = useState(null) // { mode: 'add' | 'edit', target? }
  const [confirmId, setConfirmId] = useState(null)
  const [isRefreshingIPs, setIsRefreshingIPs] = useState(false)
  const [logHeight, setLogHeight] = useState(200)

  useEffect(() => { loadTargets() }, [])

  const handleRefreshIPs = async () => {
    setIsRefreshingIPs(true)
    await refreshIPs()
    setIsRefreshingIPs(false)
    toast.success('IPs refreshed')
  }

  const handleUpdateAll = async () => {
    await updateAllFirewalls()
    toast.success('All firewalls updated!')
  }

  const handleSaveTarget = (form) => {
    if (form.id) { updateTarget(form.id, form) } else { addTarget(form) }
    toast.success(form.id ? 'Target updated' : 'Target added')
  }

  const handleDelete = (id) => {
    deleteTarget(id)
    toast.success('Target deleted')
    setConfirmId(null)
  }

  // Quick stats — V1 counts GCP + GCPSQL together under "GCP Rules"
  const stats = {
    total: targets.length,
    gcp: targets.filter(t => { const p = (t.provider ?? '').toLowerCase(); return p === 'gcp' || p === 'gcpsql' }).length,
    do: targets.filter(t => (t.provider ?? '').toLowerCase() === 'do').length,
    atlas: targets.filter(t => (t.provider ?? '').toLowerCase() === 'atlas').length,
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Left Panel ── */}
      <div
        className="flex flex-col border-r border-border-base bg-bg-surface overflow-y-auto"
        style={{ width: 220, minWidth: 180 }}
      >
        <div className="p-3 space-y-4">
          <IPCardGrid
            interfaces={interfaces}
            onRefresh={handleRefreshIPs}
            isRefreshing={isRefreshingIPs}
          />

          <div className="border-t border-border-base pt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-2">Custom IPs</div>
            <textarea
              value={customIps}
              onChange={(e) => setCustomIps(e.target.value)}
              placeholder="e.g. 1.2.3.4, 5.6.7.8"
              className="w-full bg-bg-primary border border-border-base rounded-md px-2 py-1.5 text-xs font-mono text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim placeholder:font-sans resize-y min-h-[60px]"
            />
            <p className="text-[10px] text-text-muted mt-1 leading-tight">
              Comma-separated. These will be added alongside your auto-detected public IPs.
            </p>
          </div>

          <div className="border-t border-border-base pt-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-2">Quick Stats</div>
            {[
              { label: 'Total Targets', value: stats.total },
              { label: 'GCP Rules',     value: stats.gcp   },
              { label: 'DO Rules',      value: stats.do    },
              { label: 'Atlas Rules',   value: stats.atlas },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-1">
                <span className="text-xs text-text-muted">{s.label}</span>
                <span className="text-xs font-bold text-text-primary font-mono">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main area (table + log) ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-base flex-shrink-0 bg-bg-surface/50">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-accent-firewall" />
            <span className="font-semibold text-sm text-text-primary">Firewall Targets</span>
            <span className="badge bg-accent-firewall/20 text-accent-firewall border border-accent-firewall/30 text-xs">
              {targets.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <span className="text-xs text-text-muted">{selectedIds.length} selected</span>
            )}
            <button
              onClick={() => setShowIPs(!showIPs)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary border border-border-base px-2.5 py-1 rounded-md transition-colors"
            >
              {showIPs ? <EyeOff size={12} /> : <Eye size={12} />}
              {showIPs ? 'Hide IPs' : 'Show IPs'}
            </button>
            <button
              onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-1.5 text-xs font-medium text-white px-3 py-1.5 rounded-md transition-colors"
              style={{ background: '#ef4444' }}
            >
              <Plus size={12} />
              Add Target
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="data-table">
            <thead className="sticky top-0 bg-bg-surface z-10">
              <tr>
                <th className="w-8">
                  <button onClick={selectedIds.length === targets.length ? clearSelection : selectAll}>
                    {selectedIds.length === targets.length && targets.length > 0
                      ? <CheckSquare size={13} className="text-accent-firewall" />
                      : <Square size={13} className="text-text-dim" />
                    }
                  </button>
                </th>
                <th>Provider</th>
                <th>Description</th>
                <th>Project / Resource</th>
                <th>Firewall Name</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th className="w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {targets.map(t => {
                const provKey = (t.provider ?? '').toLowerCase()
                const prov = FW_PROVIDERS[provKey] ?? { label: t.provider, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' }
                const isSelected = selectedIds.includes(t.id)
                // Support both V1 field names (desc, projectId, ruleName) and V2 (description, project, firewallName)
                const desc    = t.description || t.desc || ''
                const project = t.project || t.projectId || ''
                const fwName  = t.firewallName || t.ruleName || t.sqlInstance || t.firewallId || ''
                return (
                  <tr key={t.id} className={isSelected ? 'selected' : ''}>
                    <td>
                      <button onClick={() => toggleSelect(t.id)}>
                        {isSelected
                          ? <CheckSquare size={13} className="text-accent-firewall" />
                          : <Square size={13} className="text-text-dim" />
                        }
                      </button>
                    </td>
                    <td>
                      <TypeBadge label={prov.label} color={prov.color} bg={prov.bg} />
                    </td>
                    <td className="font-medium">{desc}</td>
                    <td className="font-mono text-xs text-text-muted">{project}</td>
                    <td className="font-mono text-xs text-text-muted">
                      {showIPs ? fwName : '••••••••'}
                    </td>
                    <td className="text-text-dim text-xs">{relativeTime(t.lastUpdated)}</td>
                    <td><StatusBadge status={t.status} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          title="Edit"
                          onClick={() => setModal({ mode: 'edit', target: t })}
                          className="p-1 text-text-dim hover:text-text-primary transition-colors rounded"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setConfirmId(t.id)}
                          className="p-1 text-text-dim hover:text-red-400 transition-colors rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!targets.length && (
                <tr><td colSpan={8} className="py-16 text-center text-text-dim text-sm">
                  No firewall targets. Click "+ Add Target" to get started.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resizable divider (visual) */}
        <div className="resize-divider-h cursor-row-resize" />

        {/* Log Panel */}
        <div className="flex-shrink-0 border-t border-border-base" style={{ height: logHeight }}>
          <LogPanel
            lines={logLines}
            onClear={clearLog}
            onUpdateAll={handleUpdateAll}
            isUpdating={isUpdating}
            selectedCount={selectedIds.length}
          />
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <TargetFormModal
          target={modal.mode === 'edit' ? modal.target : null}
          onSave={handleSaveTarget}
          onClose={() => setModal(null)}
        />
      )}
      <ConfirmDialog
        isOpen={!!confirmId}
        title="Delete Target"
        message="Are you sure you want to remove this firewall target? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => handleDelete(confirmId)}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  )
}
