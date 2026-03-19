import { useEffect, useRef } from 'react'
import useAppStore from '../../stores/useAppStore'
import { cn } from '../../lib/utils'
import {
  CheckCircle, XCircle, Info, AlertTriangle, X
} from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  error:   XCircle,
  warning: AlertTriangle,
  info:    Info,
}

const COLORS = {
  success: 'border-green-500/40 bg-bg-surface text-green-400',
  error:   'border-red-500/40 bg-bg-surface text-red-400',
  warning: 'border-yellow-500/40 bg-bg-surface text-yellow-400',
  info:    'border-blue-500/40 bg-bg-surface text-blue-400',
}

function ToastItem({ id, message, type = 'info' }) {
  const removeToast = useAppStore(s => s.removeToast)
  const Icon = ICONS[type] ?? Info

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[280px] max-w-[380px]',
        'animate-slide-in',
        COLORS[type] ?? COLORS.info
      )}
    >
      <Icon size={16} className="flex-shrink-0 mt-0.5" />
      <span className="flex-1 text-sm text-text-primary leading-snug">{message}</span>
      <button
        onClick={() => removeToast(id)}
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Toast — fixed-position notification stack
 */
export function ToastContainer() {
  const toasts = useAppStore(s => s.toasts)

  if (!toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
