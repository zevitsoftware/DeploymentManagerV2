import { cn } from '../../lib/utils'

/**
 * EmptyState — illustrated empty/placeholder panel
 */
export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-3 p-8 text-center',
      className
    )}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-bg-hover flex items-center justify-center mb-1">
          <Icon size={24} className="text-text-dim" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-text-muted">{title}</p>
        {message && <p className="text-xs text-text-dim mt-1 max-w-[200px]">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export default EmptyState
