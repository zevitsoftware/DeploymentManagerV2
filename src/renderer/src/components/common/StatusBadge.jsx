import { cn } from '../../lib/utils'

const VARIANTS = {
  online:       'bg-green-500/20 text-green-400 border border-green-500/30',
  offline:      'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  error:        'bg-red-500/20 text-red-400 border border-red-500/30',
  pending:      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  running:      'bg-green-500/20 text-green-400 border border-green-500/30',
  stopped:      'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  warning:      'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  connected:    'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  disconnected: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  healthy:      'bg-green-500/20 text-green-400 border border-green-500/30',
  degraded:     'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  active:       'bg-green-500/20 text-green-400 border border-green-500/30',
  ok:           'bg-green-500/20 text-green-400 border border-green-500/30',
  idle:         'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  outdated:     'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
}

const DOTS = {
  online: 'bg-green-400', offline: 'bg-slate-500', error: 'bg-red-400',
  running: 'bg-green-400', stopped: 'bg-slate-500', healthy: 'bg-green-400',
  degraded: 'bg-yellow-400', pending: 'bg-yellow-400', connected: 'bg-indigo-400',
  disconnected: 'bg-slate-500', active: 'bg-green-400', ok: 'bg-green-400',
  idle: 'bg-slate-500', outdated: 'bg-yellow-400',
}

/**
 * StatusBadge — colored pill with optional dot indicator
 * @param {string} status  - e.g. 'online', 'offline', 'running'
 * @param {string} label   - custom label (defaults to status)
 * @param {boolean} dot    - show animated dot
 * @param {string} className
 */
export function StatusBadge({ status = 'offline', label, dot = true, className }) {
  const variant = VARIANTS[status] ?? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
  const dotColor = DOTS[status] ?? 'bg-slate-500'
  const text = label ?? status

  return (
    <span className={cn('badge', variant, className)}>
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColor,
            (status === 'online' || status === 'running' || status === 'connected' || status === 'healthy')
              && 'animate-pulse-soft'
          )}
        />
      )}
      {text}
    </span>
  )
}

/**
 * TypeBadge — colored pill for types (DB types, provider, DNS types)
 */
export function TypeBadge({ label, color, bg, className }) {
  return (
    <span
      className={cn('badge', className)}
      style={{ background: bg, color, border: `1px solid ${color}33` }}
    >
      {label}
    </span>
  )
}

export default StatusBadge
