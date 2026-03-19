import { useState, useRef } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { HardDrive, FolderOpen, CheckCircle2, Circle, Loader2, AlertCircle, X } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * BackupPanel — Database backup UI with directory picker, live log, and progress
 * @param {string}   connId
 * @param {function} onRunBackup  async (connId, dir) => void  — STUB for Agent 3
 */
export function BackupPanel({ connId, onRunBackup }) {
  const [dir, setDir] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [logLines, setLogLines] = useState([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const logRef = useRef(null)

  const appendLog = (msg, type = 'info') => {
    setLogLines(prev => {
      const next = [...prev, { msg, type, ts: new Date().toLocaleTimeString() }]
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight }), 20)
      return next
    })
  }

  const handleRun = async () => {
    if (!dir.trim()) { setError('Please set a backup directory first.'); return }
    setIsRunning(true)
    setLogLines([])
    setDone(false)
    setError(null)

    try {
      await onRunBackup(connId, dir)
      setDone(true)
      appendLog('✓ Backup completed successfully', 'success')
    } catch (err) {
      setError(err.message ?? 'Backup failed')
      appendLog(`✗ Error: ${err.message}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }

  const LOG_COLORS = { success: '#22c55e', error: '#ef4444', info: '#94a3b8', warning: '#eab308' }

  return (
    <div className="space-y-4">
      {/* Directory input */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-2">Backup Directory</label>
        <div className="flex gap-2">
          <input
            value={dir}
            onChange={e => setDir(e.target.value)}
            placeholder="/backups/db  or  C:\Backups\DB"
            className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-2 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono"
          />
          <button
            title="Browse for directory"
            onClick={async () => {
              const chosen = await window.api?.deploy?.browseFolder?.({ title: 'Select Backup Directory' })
              if (chosen) setDir(chosen)
            }}
            className="px-3 py-2 border border-border-base rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <FolderOpen size={15} />
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>

      {/* What gets backed up */}
      <div className="p-3 rounded-lg bg-bg-primary border border-border-base space-y-1.5">
        <p className="text-xs font-medium text-text-muted mb-2">Backup includes:</p>
        {[
          'Database schema (DDL)',
          'All table data (DML)',
          'Stored procedures & functions',
          'Views and triggers',
        ].map(item => (
          <div key={item} className="flex items-center gap-2 text-xs text-text-muted">
            <CheckCircle2 size={12} className="text-accent-deploy flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={isRunning || !dir.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg text-white transition-all disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
      >
        {isRunning
          ? <><LoadingSpinner size={14} color="white" />Backing up…</>
          : <><HardDrive size={14} />Run Backup</>
        }
      </button>

      {/* Live log */}
      {logLines.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-dim mb-1.5">Backup Log</p>
          <div
            ref={logRef}
            className="terminal-bg rounded-lg border border-border-base p-3 h-36 overflow-y-auto font-mono text-xs space-y-0.5"
          >
            {logLines.map((l, i) => (
              <div key={i} style={{ color: LOG_COLORS[l.type] ?? '#94a3b8' }}>
                <span className="opacity-40 mr-2">[{l.ts}]</span>
                {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-400">
          <CheckCircle2 size={16} />
          Backup completed! File saved to: <span className="font-mono text-xs ml-1">{dir}</span>
        </div>
      )}
    </div>
  )
}

export default BackupPanel
