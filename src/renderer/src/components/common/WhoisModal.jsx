import { useState, useEffect } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { Globe, ExternalLink, X, Calendar, Server, Shield } from 'lucide-react'

/**
 * WhoisModal — Domain WHOIS lookup popup
 * @param {string}   domain
 * @param {function} onLookup  async (domain) => whoisData | null
 * @param {function} onClose
 */
export function WhoisModal({ domain, onLookup, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(domain ?? '')

  const lookup = async (d) => {
    if (!d) return
    setLoading(true)
    const result = await onLookup(d)
    setData(result)
    setLoading(false)
  }

  useEffect(() => { if (domain) lookup(domain) }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-bg-surface border border-border-base rounded-xl shadow-lg w-full max-w-lg mx-4 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-base">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[#f6821f]" />
            <h3 className="font-semibold text-text-primary">WHOIS Lookup</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>

        {/* Search bar */}
        <div className="px-5 py-3 border-b border-border-base flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookup(query)}
            placeholder="example.com"
            className="flex-1 bg-bg-primary border border-border-base rounded-md px-3 py-1.5 text-sm text-text-primary focus:border-border-focus outline-none placeholder:text-text-dim font-mono"
          />
          <button
            onClick={() => lookup(query)}
            disabled={!query.trim() || loading}
            className="px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50"
            style={{ background: '#f6821f' }}
          >
            Lookup
          </button>
        </div>

        {/* Results */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size={24} color="#f6821f" />
            </div>
          ) : data ? (
            <div className="space-y-3">
              {[
                { icon: Globe,    label: 'Registrar',    value: data.registrar    },
                { icon: Shield,   label: 'Registrant',   value: data.registrant   },
                { icon: Calendar, label: 'Created',       value: data.createdAt    },
                { icon: Calendar, label: 'Expires',       value: data.expiresAt    },
                { icon: Server,   label: 'Nameservers',  value: data.nameservers?.join(', ') },
              ].map(row => row.value && (
                <div key={row.label} className="flex items-start gap-3 py-2 border-b border-border-base/40 last:border-0">
                  <row.icon size={14} className="text-text-dim mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-text-muted w-24 flex-shrink-0">{row.label}</span>
                  <span className="text-sm font-mono text-text-primary">{row.value}</span>
                </div>
              ))}
              {data.status?.length > 0 && (
                <div className="flex items-start gap-3 py-2">
                  <Shield size={14} className="text-text-dim mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-text-muted w-24 flex-shrink-0">Status</span>
                  <div className="flex flex-wrap gap-1">
                    {data.status.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-text-dim text-sm">
              No WHOIS data found for <span className="font-mono text-text-muted">{query}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WhoisModal
