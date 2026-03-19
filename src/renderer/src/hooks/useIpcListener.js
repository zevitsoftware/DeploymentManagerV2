/**
 * useIpcListener.js
 * Subscribes to a push-event from the main process via window.api.on()
 * and automatically cleans up the listener when the component unmounts.
 *
 * Usage:
 *   useIpcListener('deploy:terminal-data', (e, data) => terminal.write(data))
 *   useIpcListener('deploy:log', (e, line) => appendLog(line))
 */
import { useEffect, useRef } from 'react'

/**
 * @param {string}   channel  - IPC channel name (e.g. 'deploy:log')
 * @param {Function} callback - handler fn. Receives (event, ...args) from ipcRenderer
 * @param {any[]}    [deps=[]] - extra deps (if callback captures reactive values, pass them here)
 */
export function useIpcListener(channel, callback, deps = []) {
  // Keep a stable ref to the callback so the effect doesn't need to re-run
  // every render, but the latest version of callback is always called.
  const cbRef = useRef(callback)
  useEffect(() => {
    cbRef.current = callback
  })

  useEffect(() => {
    if (!window?.api?.on) return
    const handler = (...args) => cbRef.current(...args)
    const unsub = window.api.on(channel, handler)
    // window.api.on returns an unsubscribe function from preload
    return () => {
      if (typeof unsub === 'function') {
        unsub()
      } else {
        window.api.off(channel, handler)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, ...deps])
}
