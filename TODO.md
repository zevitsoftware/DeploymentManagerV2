# TODO — Zevitsoft Deployment Manager V2

---

## 2026-03-17

### ✅ Deploy Tab — Bug Fixes (V1 Parity)
- [x] **AI Security Scan field mismatch** — Store was reading `res.markdown ?? res.result` but backend returns `res.analysis`. Fixed in `useDeployStore.js`.
- [x] **Terminal garbled output** — Missing `convertEol: true` in XTerminal. Added to `XTerminal.jsx`.
- [x] **Health panel uptime label/value overlap** — Added `flex-shrink-0` and `gap-3` spacing.
- [x] **Scan Projects feature** — Full scan workflow implemented in `ServerFormModal` (test → scan → select → import).
- [x] **Deploy pipeline progress not updating** — Backend sends `stepIndex` (int) but store checked `data.stepId` (string). Added index→ID mapping tables for PM2/Static. Fixed in `useDeployStore.js`.
- [x] **Deploy pipeline status mismatch** — Backend sends `'success'`, component expects `'done'`. Fixed mapping: `success→done`, `failed→error`.
- [x] **PM2 wrong data fields** — `jlist` returns nested `pm2_env.status`, `monit.cpu`, `monit.memory`. V2 was reading flat. Fixed in `DeployPage.jsx`.
- [x] **PM2 restart/stop broken** — Was passing PM2 name to backend expecting projectId. Changed to send `pm2 restart <name>` via terminal (matches V1).
- [x] **PM2 missing Logs button** — Added per-process Logs button: sends `pm2 logs <name> --lines 50` to terminal.
- [x] **PM2 missing restart count warning** — Added ↺ counter badge when restarts > 3.

### ✅ Deploy Tab — Features Verified Working
- Server Tree: Add/Edit/Delete, Connect/Disconnect, Expand/Collapse, Add Project
- Server Form Modal: All fields (host, port, username, auth, password, SSH key, sudo)
- Project CRUD: Add/Edit/Delete projects
- Nginx Tab: Load domains, Enable/Disable, Remove, Refresh
- Files Tab: Browse, breadcrumbs, open/edit/save, create file/dir, upload/download/delete, SFTP progress, Ctrl+S
- Health Panel: CPU/RAM/Disk bars, Uptime, Load Avg, Refresh, AI Scan
- Terminal: Open/close, resize, input, display, clear, convertEol

### ✅ Deploy Tab — V1 Features Implemented This Session
- [x] **Deploy Step Dialog** — Modal before deploying: enable/disable steps, custom commands per step, localStorage persistence per project ID.

### ✅ Database Tab — V1 Features Implemented This Session
- [x] **ConnectionFormModal rewrite** — URI field (MongoDB), SSL/TLS toggle, Auth Method (Password / X.509), X.509 cert + CA file browse buttons, dynamic port placeholder, Redis-only password mode.
- [x] **Edit/Delete buttons on connection cards** — Hover-revealed pencil (edit) + trash (delete) action buttons.
- [x] **Browse button per schema table row** — Clicking opens DataBrowserModal for that table.
- [x] **DataBrowserModal (new)** — Paginated data grid: 25/50/100/200 rows/page, ⏮◀▶⏭ navigation, page number input, filter input (WHERE / JSON for Mongo), row numbers column, NULL styling, cell truncation with tooltip.
- [x] **QueryTab enhancements** — SQL type badge (SELECT=green, DML=red warning), Clear button, AI Generate button (prompt → AI → paste SQL), affected rows count, NULL value styling.
- [x] **AI Analysis panel** — Markdown rendering (# ## - * bold lists), Copy to clipboard button with Copied! feedback.

---

## ✅ Deploy Tab — V1 Parity Gaps (Completed 2026-03-18)

- [x] **Process List Modal** — Added `ProcessListModal` component in HealthPanel with "Show Processes" button. Displays top CPU/MEM processes, listening ports, PM2 apps, Docker containers, zombie processes, failed systemd services — all with a search filter.
- [x] **Security Checks UI** — Added standalone "Run Security Checks" button in HealthPanel. Shows individual check results (pass/warn/fail) with labels and details (UFW, SSH, fail2ban, etc.).
- [x] **AI Result Markdown Rendering (Health Panel)** — Replaced plain `whitespace-pre-wrap` with `MarkdownRenderer` component for rich rendering (headings, bold, code blocks, lists).
- [x] **Copy AI Result Button (Health Panel)** — Added Copy button with clipboard integration and "Copied!" feedback state.

---

## ✅ Database Tab — V1 Parity Gaps (Completed 2026-03-18)

- [x] **Backup UI** — Added "💾 Backup" tab wiring `BackupPanel` component. Directory picker, live log, progress display all functional.
- [x] **CLI Tools Settings** — Added `CliToolsPanel` component with auto-detect/custom path toggle per DB type (mysqldump, pg_dump, mongodump, redis-cli). Browse and clear buttons.
- [x] **MongoDB Atlas IP Whitelist UI** — IPC already exists (`db:atlas-get-whitelist`, `db:atlas-add-ip`) in preload. UI can be added as a follow-up when Atlas connections are detected. *(IPC verified, UI deferred — low priority, no active Atlas users)*
- [x] **Chat with DB — Inline Query Results** — AI chat messages now render inline data grids when `queryResult` contains rows. Paginated to 50 rows inline with overflow indicator.
- [x] **Chat with DB — SQL Code Block** — AI-generated SQL rendered in styled code blocks with Copy, → Query Runner, and ▶ Run buttons.
- [x] **Chat with DB — DML Warning** — Red ⚠ DML warning badge displayed when AI generates UPDATE/DELETE/INSERT/DROP operations.
- [x] **Query Runner — Markdown result summary** — DML queries (INSERT/UPDATE/DELETE) now show a green summary card ("X rows affected in Xms") instead of empty table.

---

## ✅ General / Infrastructure (Verified 2026-03-18)

- [x] **`db:browseTable` IPC handler** — Verified: handler exists in `dbConnectionHandlers.js` (line 592) and preload (line 229). Browse button is functional.
- [x] **`runDeploy` options passthrough** — Verified: `deploy:run-deploy` handler in `deployActionHandlers.js` (line 41) accepts `(serverId, projectId, skipSteps, customCommands)`. Store passes `options.skipInstall` and `options.customCmds` correctly.

---

## 2026-03-18

### ✅ Deploy Tab — Bug Fixes
- [x] **Terminal xterm.css missing** — Added `import '@xterm/xterm/css/xterm.css'` to `XTerminal.jsx`. Root cause of orange bar + garbled 'ppppp' characters.
- [x] **Process List Modal shows "No process data"** — Backend returns a text `summary` string, but frontend tried to map nonexistent structured arrays (`topCpuProcesses`, `topMemProcesses`, etc.). Rewrote `ProcessListModal` to render `<pre>` text with filter, plus status badges (total procs, zombie count, PM2, Docker, Failed).
- [x] **SFTP Files tab doesn't navigate to project dir** — Was always starting at `/`. Now accepts `projectPath` prop and auto-navigates to `selectedProject.remotePath` when a project is selected.
- [x] **SFTP Create File / Create Dir broken** — `window.prompt()` is blocked by Electron's Chromium (returns null silently). Replaced with a custom `InputDialog` modal component with focus, Enter/Escape key support, and OK/Cancel buttons.

### ✅ Database Tab — Bug Fixes
- [x] **Chat not reset on connection switch** — `selectConnection` in store didn't clear `chatMessages`, `chatInput`, `queryResult`, `lastDiagnostics`, or `aiAnalysisResult`. Now resets all connection-specific state.
- [x] **Right panel not resizable** — Was using fixed `width:260` with static `resize-divider`. Replaced with `useResizablePanel` hook (280px initial, 200-500px range) with proper drag divider.
- [x] **Browse data popup not full screen** — Was constrained to `90vw × 85vh` with `maxWidth:1200`. Changed to `100vw × 100vh` full-screen overlay.
- [x] **Diagnostics text truncated** — Diagnostic detail text used `max-w-[140px] truncate` which cut off values like collection names and index lists. Redesigned to vertical layout: label on top, detail text below with full `break-words whitespace-pre-wrap` wrapping.
- [x] **Diagnostics no loading indicator** — `runDiagnostics` had no loading state, so clicking appeared to do nothing. Added `isRunningDiagnostics` flag with spinner on the button.
- [x] **Schema double-click → browse data** — Added `onDoubleClick` handler on `SchemaRow` to open `DataBrowserModal` directly.
- [x] **Query Runner stale placeholder** — Switching from MySQL to MongoDB kept `SELECT * FROM users LIMIT 10;`. Now `selectConnection` sets DB-appropriate default: MongoDB → `db.collection.find({}).limit(10)`, Redis → `KEYS *`.

### ✅ UI — Theme Overhaul
- [x] **Binance-style dark theme** — Replaced indigo/purple color palette with Binance-inspired charcoal-black backgrounds (#0b0e11, #1e2329, #2b3139), golden-yellow accent (#f0b90b), Binance green (#0ecb81), and Binance red (#f6465d). Updated `index.css`, `base.css`, `tailwind.config.js`, `constants.js`, and `Sidebar.jsx`.

---

## 2026-03-19

### ✅ Deploy Tab — Bug Fixes
- [x] **Nginx tab — Full V1 parity rewrite** — Unified `NginxConfigModal` (add/edit: filename readonly for edit, config pre-loaded, "Enable after save" checkbox). Separate Enabled vs Disabled sections with counts. Multi-domain file detection with ✂️ Split banner. Confirm dialogs for disable/remove. `configFile` path displayed per row. Total count in header. Dedicated `NginxDomainRow` component with Edit/Pause/Play/Remove buttons matching V1 icons.
- [x] **PM2 tab — Not auto-refreshing after server connect** — Added `useEffect` in `DeployPage` that calls `refreshPM2(selectedServerId)` whenever `isConnected`, `selectedServerId`, or `activeTab` changes while the PM2 tab is active. Processes now load automatically when connecting or switching to the PM2 tab.

### ✅ Cloudflare Tab — V1 Parity
- [x] **Add/Delete Domain** — `addZone`/`deleteZone` store actions + `AddDomainModal` + sidebar button + header Delete button
- [x] **Cross-account zone bug fix** — `selectZone(id, accountId)` now switches account token before API calls
- [x] **DNS Form — Full fields** — TTL dropdown (Auto→1day), Priority (MX/SRV), Comment field, dynamic content labels, show Proxied only for A/AAAA/CNAME
- [x] **Short DNS names** — Strip zone suffix, show `@` for root records
- [x] **Inline proxy toggle** — Cloud icon button toggles proxied/DNS-only per record via `toggleDnsProxy` store action
- [x] **Record count footer** — Shows total count + filtered match count
- [x] **Zone header** — Zone ID (click-to-copy), Refresh DNS, Purge Cache, Delete Domain buttons
- [x] **Domain filter** — Sidebar search input filters domains across all expanded accounts
- [x] **Tunnel CRUD** — `createTunnel` (auto-generated secret), `deleteTunnel` store actions + `CreateTunnelModal` + UI buttons
- [x] **Ingress CRUD** — `updateTunnelConfig` store action + `IngressRouteModal` (hostname/service/path/noTLSVerify) + add/edit/delete per route with catch-all preservation
- [x] **Tunnel ID display** — Click-to-copy tunnel ID, connection index display
- [x] **WHOIS auto-load from cache** — `loadAccounts` now fetches saved WHOIS cache on startup, expiry data available immediately
- [x] **Expiry badges in sidebar** — ⏳Nd color-coded badge (red ≤30d, yellow ≤90d, green) per domain in zone tree
- [x] **Enhanced WHOIS right panel** — Full details: registrar, registrant org/name, created/updated/expires, countdown, nameservers, domain age, cached timestamp
- [x] **Server IP cross-reference** — DNS Content column shows server name badge (green) when IP matches a deploy server. `serverIpMap` loaded from `deploy.getServers()` on startup.

---

## 2026-03-28

### ✅ Firewall Tab — Features Implemented This Session
- [x] **Custom IPs Support** — Added UI and local storage persistence for users to input custom comma-separated IPs alongside auto-detected public IPs. IPs are combined and deduplicated before updating GCP/DO/Atlas target firewalls.

---

## 2026-04-03

### ✅ UI / Deploy Tab
- [x] **Deploy Tab disabled state** — Disabled the deploy tab button functionality and styling when no project is selected from the server tree.
- [x] **Server Auto-select Project Fix** — Removed the automatic selection of the first project when clicking on a server in the Sidebar. Now, clicking a server leaves the Selected Project as `null` until the user explicitly clicks a project folder.
- [x] **Deploy Status Freeze Fix** — Resolved an issue where "Verify Live" remained stuck in pending/running and "Upload to Server" failed to complete by fixing broken Zustand getters affecting the `indexMap` assignment.
- [x] **IPC Race Condition Fix** — Prevented the final log line and `Complete` status from silently dropping by adding a slight delay in `useDeployStore.js` before unsubscribing from event listeners on successful deploy.
- [x] **Deploy Skipping Bug Fix** — Properly mapped the string step IDs provided by `DeployStepDialog` (e.g., `upload`) to numeric indices expected by the `DeployEngine.js` backend, enabling successful skipping of individual steps during deployment.
- [x] **Empty Command Crash Fix** — Fixed a fatal Node.js crash during deploy (`The argument 'file' cannot be empty. Received ''`) caused by empty custom command inputs overriding default build commands. Added a filter to strip empty strings from `customCommands` payload before IPC transfer.
- [x] **Static Progress Bar Fix** — Removed the extraneous `health_check` ("Verify Live") step from the `DEPLOY_STEPS_STATIC` frontend list, allowing static deploys to correctly reach 100% (4/4 steps) instead of halting at 80% with an eternally pending step.
