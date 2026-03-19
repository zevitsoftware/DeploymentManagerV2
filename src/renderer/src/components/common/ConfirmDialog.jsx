import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * ConfirmDialog — Reusable confirm / cancel modal
 * @param {boolean}  isOpen
 * @param {string}   title
 * @param {string}   message
 * @param {string}   confirmLabel   default "Confirm"
 * @param {string}   variant        'danger' | 'default'
 * @param {function} onConfirm
 * @param {function} onCancel
 */
export function ConfirmDialog({
  isOpen, title, message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm, onCancel,
}) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg p-6 w-full max-w-sm mx-4 animate-slide-in">
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
            variant === 'danger' ? 'bg-red-500/20' : 'bg-indigo-500/20'
          )}>
            <AlertTriangle size={18} className={variant === 'danger' ? 'text-red-400' : 'text-indigo-400'} />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-base leading-tight">{title}</h3>
            {message && <p className="text-text-muted text-sm mt-1 leading-relaxed">{message}</p>}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-1.5 text-sm rounded-md border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md font-medium transition-all',
              variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white',
              loading && 'opacity-60 cursor-not-allowed'
            )}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
