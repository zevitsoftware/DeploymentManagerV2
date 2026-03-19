import { useEffect, useState } from 'react'
import useAppStore from '../../stores/useAppStore'
import useDeployStore from '../../stores/useDeployStore'
import { PAGES } from '../../lib/constants'
import { Minus, Square, X, Wifi, WifiOff, Maximize2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const PAGE_TITLE = {
  [PAGES.FIREWALL]:   '🔥 Firewall Manager',
  [PAGES.DEPLOY]:     '🚀 Deploy Manager',
  [PAGES.DATABASE]:   '🗄️ Database Manager',
  [PAGES.CLOUDFLARE]: '☁️ Cloudflare Manager',
  [PAGES.SETTINGS]:   '⚙️ Settings',
}

/**
 * TopBar — custom frameless titlebar with drag region, title, status, and
 * fully wired window controls (minimize / maximize / close) via IPC.
 */
export function TopBar() {
  const activePage   = useAppStore(s => s.activePage)
  const isMaximized  = useAppStore(s => s.isMaximized)
  const setMaximized = useAppStore(s => s.setMaximized)

  // Connected servers count from deploy store
  const connectedServers = useDeployStore(s => s.connectedServers)
  const connCount = connectedServers.size

  // Sync initial maximized state + subscribe to changes from main
  useEffect(() => {
    window.electron?.isMaximized().then(v => setMaximized(v ?? false))
    const unsub = window.electron?.onMaximizedChange(v => setMaximized(v))
    return () => unsub?.()
  }, [setMaximized])

  const handleMinimize = () => window.electron?.minimize()
  const handleMaximize = () => window.electron?.maximize()
  const handleClose    = () => window.electron?.close()

  return (
    <div
      id="app-topbar"
      className="titlebar-drag h-10 flex items-center bg-bg-secondary border-b border-border-base flex-shrink-0 select-none"
      style={{ minHeight: 40 }}
    >
      {/* Title + status */}
      <div className="flex-1 flex items-center gap-3 px-4">
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          {PAGE_TITLE[activePage] ?? 'Zevitsoft Deploy Manager'}
        </span>

        {/* Server connection status pill */}
        {activePage === PAGES.DEPLOY && (
          <div className={cn(
            'titlebar-no-drag flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border',
            connCount > 0
              ? 'bg-green-500/15 text-green-400 border-green-500/30'
              : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
          )}>
            {connCount > 0
              ? <><Wifi size={11} />{connCount} server{connCount > 1 ? 's' : ''} connected</>
              : <><WifiOff size={11} />No servers connected</>
            }
          </div>
        )}
      </div>

      {/* Window controls */}
      <div className="titlebar-no-drag flex items-center h-full">
        <button
          id="btn-minimize"
          onClick={handleMinimize}
          title="Minimize"
          className="h-full w-12 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          id="btn-maximize"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore' : 'Maximize'}
          className="h-full w-12 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
        >
          {isMaximized ? <Maximize2 size={11} /> : <Square size={12} />}
        </button>
        <button
          id="btn-close"
          onClick={handleClose}
          title="Close"
          className="h-full w-12 flex items-center justify-center text-text-muted hover:text-white hover:bg-red-500 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default TopBar
