import { useEffect } from 'react'
import { PAGES } from '../lib/constants'
import useAppStore from '../stores/useAppStore'

/**
 * useKeyboardShortcuts
 * Registers Ctrl+1–5 to switch pages, Ctrl+Shift+C to clear toast, etc.
 */
export function useKeyboardShortcuts() {
  const setActivePage = useAppStore(s => s.setActivePage)

  useEffect(() => {
    const PAGE_KEYS = [
      PAGES.FIREWALL,
      PAGES.DEPLOY,
      PAGES.DATABASE,
      PAGES.CLOUDFLARE,
      PAGES.SETTINGS,
    ]

    const handler = (e) => {
      // Ctrl + 1-5 → navigate pages
      if (e.ctrlKey && !e.shiftKey && !e.altKey) {
        const n = parseInt(e.key)
        if (n >= 1 && n <= 5) {
          e.preventDefault()
          setActivePage(PAGE_KEYS[n - 1])
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setActivePage])
}

/**
 * useHotkey — single hotkey registration
 * @param {string} key    e.g. 'Enter', 'Escape', 'r'
 * @param {function} fn
 * @param {object} [opts] { ctrl, shift, alt }
 */
export function useHotkey(key, fn, { ctrl = false, shift = false, alt = false } = {}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === key
        && e.ctrlKey  === ctrl
        && e.shiftKey === shift
        && e.altKey   === alt
      ) {
        e.preventDefault()
        fn(e)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, fn, ctrl, shift, alt])
}

export default useKeyboardShortcuts
