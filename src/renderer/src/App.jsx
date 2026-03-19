import { Suspense, lazy, useEffect } from 'react'
import useAppStore from './stores/useAppStore'
import useAuthStore from './stores/useAuthStore'
import useDeployStore from './stores/useDeployStore'
import useFirewallStore from './stores/useFirewallStore'
import useDatabaseStore from './stores/useDatabaseStore'
import useCloudflareStore from './stores/useCloudflareStore'
import { PAGES } from './lib/constants'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { ErrorBoundary } from './components/common/ErrorBoundary'

import { Sidebar }       from './components/layout/Sidebar'
import { TopBar }        from './components/layout/TopBar'
import { ToastContainer } from './components/common/Toast'
import { LoadingSpinner } from './components/common/LoadingSpinner'

// ── Code Splitting: lazy-load each page ───────────────────────────────────────
// This splits each page into its own JS chunk, reducing initial bundle size.
const FirewallPage   = lazy(() => import('./pages/firewall/FirewallPage'))
const DeployPage     = lazy(() => import('./pages/deploy/DeployPage'))
const DatabasePage   = lazy(() => import('./pages/database/DatabasePage'))
const CloudflarePage = lazy(() => import('./pages/cloudflare/CloudflarePage'))
const SettingsPage   = lazy(() => import('./pages/settings/SettingsPage'))

const PAGES_MAP = {
  [PAGES.FIREWALL]:   FirewallPage,
  [PAGES.DEPLOY]:     DeployPage,
  [PAGES.DATABASE]:   DatabasePage,
  [PAGES.CLOUDFLARE]: CloudflarePage,
  [PAGES.SETTINGS]:   SettingsPage,
}

/** Page-level loading fallback while the lazy chunk loads */
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <LoadingSpinner size={28} />
    </div>
  )
}

function App() {
  const activePage = useAppStore(s => s.activePage)
  const ActivePage = PAGES_MAP[activePage] ?? FirewallPage

  // Global keyboard shortcuts: Ctrl+1-5 → switch pages
  useKeyboardShortcuts()

  // Apply dark mode class to html element
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // ── Bootstrap: load all data on app start ──────────────────────────────────
  useEffect(() => {
    // Auth + AI config (non-blocking; page renders immediately)
    useAuthStore.getState().checkAuth()
    useAuthStore.getState().loadAiConfig()
    useAuthStore.getState().checkCliStatus()

    // Each domain loads its own data
    useFirewallStore.getState().loadTargets()
    useFirewallStore.getState().refreshIPs()
    useDeployStore.getState().loadServers()
    useDeployStore.getState().loadGitConfig()
    useDatabaseStore.getState().loadConnections()
    useCloudflareStore.getState().loadAccounts()
  }, [])

  return (
    <div className="app-root">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-content animate-fade-in">
          {/* Suspense handles the lazy chunk loading state  */}
          {/* ErrorBoundary catches render-time crashes per page  */}
          <ErrorBoundary name={activePage ?? 'Page'} key={activePage}>
            <Suspense fallback={<PageLoader />}>
              <ActivePage key={activePage} />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
