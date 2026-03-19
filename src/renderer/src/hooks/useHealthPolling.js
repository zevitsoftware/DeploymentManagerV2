/**
 * useHealthPolling.js
 * Auto-refreshes server health stats at a configurable interval.
 * Polls only when a server is connected and the page is visible.
 *
 * Usage:
 *   useHealthPolling(selectedServerId, isConnected, fetchHealth)
 *
 * Rules:
 *   - Starts polling when isConnected === true and serverId changes
 *   - Stops polling on disconnect or unmount
 *   - Respects page visibility (pauses when tab is hidden)
 */
import { useEffect, useRef } from 'react'

const DEFAULT_INTERVAL_MS = 10_000 // 10 seconds

/**
 * @param {string|null}  serverId        - The active server ID to poll
 * @param {boolean}      isConnected     - Whether the server is connected
 * @param {Function}     fetchHealth     - Async function to call: (serverId) => void
 * @param {number}       [intervalMs]    - Polling interval in milliseconds (default 10s)
 */
export function useHealthPolling(serverId, isConnected, fetchHealth, intervalMs = DEFAULT_INTERVAL_MS) {
  const timerRef    = useRef(null)
  const fetchRef    = useRef(fetchHealth)
  const serverIdRef = useRef(serverId)

  // Keep refs fresh
  useEffect(() => { fetchRef.current    = fetchHealth  })
  useEffect(() => { serverIdRef.current = serverId     })

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (!serverId || !isConnected) return

    // Immediately fetch on connect/server switch
    fetchRef.current(serverId)

    // Then poll on interval
    timerRef.current = setInterval(() => {
      // Skip if page is hidden to avoid wasting resources
      if (document.visibilityState === 'hidden') return
      if (serverIdRef.current) {
        fetchRef.current(serverIdRef.current)
      }
    }, intervalMs)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [serverId, isConnected, intervalMs])
}

export default useHealthPolling
