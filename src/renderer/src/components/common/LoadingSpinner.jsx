import { cn } from '../../lib/utils'

/**
 * LoadingSpinner — consistent animated spinner
 */
export function LoadingSpinner({ size = 16, color = '#6366f1', className }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className={cn('animate-spin', className)}
      style={{ color }}
    >
      <circle
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="32" strokeDashoffset="12"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * InlineLoader — spinner + text row
 */
export function InlineLoader({ text = 'Loading…', size = 14 }) {
  return (
    <div className="flex items-center gap-2 text-text-muted text-sm">
      <LoadingSpinner size={size} />
      <span>{text}</span>
    </div>
  )
}

export default LoadingSpinner
