import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * ErrorBoundary — Catches uncaught React render errors in a subtree.
 * Displays a friendly fallback UI instead of a blank crash screen.
 *
 * Usage:
 *   <ErrorBoundary name="DeployPage">
 *     <DeployPage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error(`[ErrorBoundary: ${this.props.name ?? 'Unknown'}]`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { name = 'Page', fallback } = this.props

    if (fallback) return fallback

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-text-primary mb-2">
          {name} crashed
        </h3>
        <p className="text-sm text-text-muted mb-1 max-w-sm">
          An unexpected error occurred in this section. This is a bug — please report it.
        </p>
        {this.state.error && (
          <p className="text-xs font-mono text-red-400/80 mb-4 max-w-sm break-all">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border-base text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
