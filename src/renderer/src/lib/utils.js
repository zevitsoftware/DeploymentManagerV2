import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind class names intelligently
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Format a duration in seconds to human readable
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

/**
 * Truncate a string to max length
 */
export function truncate(str, max = 30) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Generate initials from a name
 */
export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Format a date to relative time
 */
export function relativeTime(date) {
  if (date == null) return '—'
  const now = Date.now()
  let ts = typeof date === 'number' ? date : new Date(date).getTime()
  if (isNaN(ts)) return '—'
  // Auto-detect seconds vs milliseconds: if ts < 1e12, it's likely in seconds
  if (ts > 0 && ts < 1e12) ts *= 1000
  const diff = now - ts
  if (diff < 0) return 'just now'
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  const days = Math.floor(diff / 86400000)
  if (days <= 30) return `${days}d ago`
  // For anything older than 30 days, show the actual date
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Deep clone an object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Pick a subset of keys from an object
 */
export function pick(obj, keys) {
  return Object.fromEntries(keys.map(k => [k, obj[k]]))
}
