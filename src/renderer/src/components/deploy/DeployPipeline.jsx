import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

const STATUS_CONFIG = {
  pending:  { icon: Circle,        color: 'text-border-base',     label: 'Pending',    bar: 'bg-border-base' },
  running:  { icon: Loader2,       color: 'text-yellow-400',      label: 'Running…',   bar: 'bg-yellow-400' },
  done:     { icon: CheckCircle2,  color: 'text-accent-deploy',   label: 'Done',       bar: 'bg-accent-deploy' },
  error:    { icon: AlertCircle,   color: 'text-red-400',         label: 'Failed',     bar: 'bg-red-400' },
  skipped:  { icon: Circle,        color: 'text-text-dim',        label: 'Skipped',    bar: 'bg-text-dim' },
}

/**
 * DeployPipeline — animated step-by-step deploy progress UI
 *
 * @param {Array}    steps          [{ id, label, description? }]
 * @param {Object}   stepStatuses   { [step.id]: 'pending'|'running'|'done'|'error'|'skipped' }
 * @param {string[]} logLines       Raw log output lines
 * @param {boolean}  isRunning
 */
export function DeployPipeline({ steps = [], stepStatuses = {}, logLines = [], isRunning }) {
  const overallProgress = steps.length
    ? Math.round((steps.filter(s => stepStatuses[s.id] === 'done').length / steps.length) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted font-medium">
            {isRunning ? 'Deploying…' : overallProgress === 100 ? 'Deployment complete!' : 'Ready to deploy'}
          </span>
          <span className="text-xs font-mono text-text-dim">{overallProgress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-primary overflow-hidden border border-border-base">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${overallProgress}%`,
              background: overallProgress === 100
                ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                : 'linear-gradient(90deg, #6366f1, #22c55e)',
            }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[18px] top-6 bottom-6 w-px bg-border-base" />

        <div className="space-y-1">
          {steps.map((step, idx) => {
            const status = stepStatuses[step.id] ?? 'pending'
            const cfg    = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
            const Icon   = cfg.icon
            const isLast = idx === steps.length - 1

            return (
              <div key={step.id}
                className={cn(
                  'relative flex items-start gap-3 p-2.5 rounded-lg transition-all duration-300',
                  status === 'running' && 'bg-yellow-500/8 border border-yellow-500/20',
                  status === 'done'    && 'bg-green-500/5',
                  status === 'error'   && 'bg-red-500/8 border border-red-500/20',
                )}
              >
                {/* Step Icon */}
                <div className={cn('relative z-10 w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-all',
                  status === 'running' ? 'bg-yellow-500/20' :
                  status === 'done'    ? 'bg-green-500/20'  :
                  status === 'error'   ? 'bg-red-500/20'    :
                  'bg-bg-hover'
                )}>
                  <Icon
                    size={16}
                    className={cn(cfg.color, status === 'running' && 'animate-spin')}
                  />
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-medium',
                      status === 'pending' ? 'text-text-dim' :
                      status === 'done'    ? 'text-text-primary' :
                      status === 'running' ? 'text-yellow-400' :
                      status === 'error'   ? 'text-red-400' :
                      'text-text-dim'
                    )}>
                      {step.label}
                    </span>
                    {status !== 'pending' && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded border font-medium',
                        status === 'running' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                        status === 'done'    ? 'bg-green-500/15 text-green-400 border-green-500/30'   :
                        status === 'error'   ? 'bg-red-500/15 text-red-400 border-red-500/30'         :
                        'bg-bg-hover text-text-dim border-border-base'
                      )}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-[11px] text-text-dim mt-0.5">{step.description}</p>
                  )}
                </div>

                {/* Step number */}
                <span className="text-[10px] text-text-dim mt-1 flex-shrink-0">{idx + 1}/{steps.length}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Log output (last 6 lines) */}
      {logLines.length > 0 && (
        <div className="terminal-bg rounded-lg border border-border-base p-3 max-h-28 overflow-y-auto">
          {logLines.slice(-30).map((line, i) => {
            const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('fatal')
            const isOk    = line.toLowerCase().includes('✓') || line.toLowerCase().includes('success') || line.toLowerCase().includes('done')
            return (
              <div key={i} className={cn('font-mono text-[11px] leading-5',
                isError ? 'text-red-400' : isOk ? 'text-green-400' : 'text-text-muted/80'
              )}>
                {line}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DeployPipeline
