import { cn } from '../../lib/utils'

/**
 * SVG Circular gauge (for CPU, RAM, Disk health metrics)
 * @param {number} value   0-100
 * @param {string} label   Label text below value
 * @param {string} color   Stroke color
 * @param {number} size    SVG size in px (default 80)
 */
export function HealthBar({ value = 0, label = '', color = '#22c55e', size = 80 }) {
  const radius = (size - 10) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  const strokeColor = value > 85 ? '#ef4444' : value > 65 ? '#eab308' : color

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#2a2a4a" strokeWidth={6}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold font-mono leading-none"
            style={{ fontSize: size < 70 ? 11 : 14, color: strokeColor }}
          >
            {value}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
      )}
    </div>
  )
}

/**
 * Linear progress bar
 */
export function ProgressBar({ value = 0, color = '#6366f1', height = 4, className }) {
  return (
    <div
      className={cn('w-full rounded-full bg-border-base overflow-hidden', className)}
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, background: color }}
      />
    </div>
  )
}

export default HealthBar
