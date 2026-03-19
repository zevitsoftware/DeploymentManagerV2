import { cn } from '../../lib/utils'
import useAppStore from '../../stores/useAppStore'
import { PAGES, NAV_ITEMS } from '../../lib/constants'
import {
  Shield, Rocket, Database, Cloud, Settings
} from 'lucide-react'

const ICONS = {
  [PAGES.FIREWALL]:   Shield,
  [PAGES.DEPLOY]:     Rocket,
  [PAGES.DATABASE]:   Database,
  [PAGES.CLOUDFLARE]: Cloud,
  [PAGES.SETTINGS]:   Settings,
}

function NavItem({ id, label, accent, active, onClick }) {
  const Icon = ICONS[id]
  return (
    <button
      id={`nav-${id}`}
      title={label}
      onClick={() => onClick(id)}
      className={cn(
        'w-full flex flex-col items-center justify-center gap-1 py-3 px-1',
        'relative group transition-all duration-150',
        'hover:bg-bg-hover',
        active && 'bg-bg-hover'
      )}
      style={active ? { borderLeftColor: accent, borderLeftWidth: 2 } : { borderLeftWidth: 2, borderLeftColor: 'transparent' }}
    >
      <Icon
        size={20}
        style={{ color: active ? accent : undefined }}
        className={cn(!active && 'text-text-dim group-hover:text-text-muted transition-colors')}
      />
      <span
        className="text-[9px] font-semibold uppercase tracking-wider leading-none"
        style={{ color: active ? accent : undefined }}
        data-class={!active ? 'text-text-dim group-hover:text-text-muted' : ''}
      >
        {label.slice(0, 4)}
      </span>

      {/* Active glow */}
      {active && (
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-l-full opacity-70"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
        />
      )}

      {/* Tooltip */}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-bg-hover border border-border-base text-text-primary text-xs px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
          {label}
        </div>
      </div>
    </button>
  )
}

/**
 * Sidebar — vertical icon navigation (64px wide, full height)
 */
export function Sidebar() {
  const activePage = useAppStore(s => s.activePage)
  const setActivePage = useAppStore(s => s.setActivePage)

  return (
    <div
      id="app-sidebar"
      className="flex flex-col bg-bg-surface border-r border-border-base"
      style={{ width: 64, minWidth: 64 }}
    >
      {/* Logo area */}
      <div className="h-10 flex items-center justify-center border-b border-border-base flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow">
          <span className="text-black font-bold text-xs">Z</span>
        </div>
      </div>

      {/* Main nav */}
      <div className="flex-1 flex flex-col py-1">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.id}
            {...item}
            active={activePage === item.id}
            onClick={setActivePage}
          />
        ))}
      </div>

      {/* Settings at bottom */}
      <div className="border-t border-border-base pb-1">
        <NavItem
          id={PAGES.SETTINGS}
          label="Settings"
          accent="#94a3b8"
          active={activePage === PAGES.SETTINGS}
          onClick={setActivePage}
        />
      </div>
    </div>
  )
}

export default Sidebar
