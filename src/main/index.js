/**
 * src/main/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Electron Main Process Bootstrap — Zevitsoft Deployment Manager v2
 *
 * Responsibilities:
 *   1. Create the BrowserWindow
 *   2. Register all IPC handlers (auth, firewall, deploy, db, cf)
 *   3. Initialize worker thread pools
 *   4. Handle graceful shutdown
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// ── IPC Orchestrators ─────────────────────────────────────────────────────────
// electron-vite uses Rollup to bundle the main process. Rollup has built-in
// CommonJS (CJS) interop — local CJS files loaded via require() inside a CJS
// file are bundled inline. The trick is to use createRequire so Rollup sees
// the require paths at parse time and includes them in the bundle.
import { createRequire } from 'module'
const _req = createRequire(import.meta.url)

const registerAuthIpc     = _req('./ipc/authHandlers')
const registerFirewallIpc = _req('./ipc/firewallHandlers')
const registerAiIpc       = _req('./ipc/aiHandlers')
const registerDeployIpc   = _req('./ipc/deploy/deployIpc')
const registerDbIpc       = _req('./ipc/db/dbIpc')
const registerCfIpc       = _req('./ipc/cf/cfIpc')
const { destroyPools }    = _req('./workers/pool')
const sshManager          = _req('./services/sshManager')

// ── Window State Persistence ──────────────────────────────────────────────────
let WINDOW_STATE_PATH = null

function loadWindowState() {
    try {
        if (WINDOW_STATE_PATH && existsSync(WINDOW_STATE_PATH)) {
            return JSON.parse(readFileSync(WINDOW_STATE_PATH, 'utf8'))
        }
    } catch { /* ignore corrupt file */ }
    return null
}

function saveWindowState(win) {
    if (!win || !WINDOW_STATE_PATH) return
    try {
        const isMaximized = win.isMaximized()
        // Save normal (non-maximized) bounds so restore works correctly
        const bounds = isMaximized ? (win._lastNormalBounds ?? win.getBounds()) : win.getBounds()
        const state = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, isMaximized }
        writeFileSync(WINDOW_STATE_PATH, JSON.stringify(state), 'utf8')
    } catch { /* ignore */ }
}

// ── Window Factory ────────────────────────────────────────────────────────────

function createWindow() {
    // ── Set global paths (configStore & authHandlers read from these) ──────────
    const appDir = app.isPackaged
        ? (process.env.PORTABLE_EXECUTABLE_DIR || dirname(process.execPath))
        : join(__dirname, '../..')
    global.APP_DIR     = appDir
    global.CONFIG_PATH = join(appDir, 'targets.enc')
    WINDOW_STATE_PATH  = join(appDir, 'window-state.json')

    // Restore saved window bounds or use defaults
    const saved = loadWindowState()
    const winOpts = {
        width: saved?.width ?? 1400,
        height: saved?.height ?? 900,
        minWidth: 1024,
        minHeight: 600,
        show: false,
        frame: false,          // Custom frameless window (TopBar handles controls)
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        backgroundColor: '#1a1a2e',  // Matches --bg-primary CSS variable
        icon,
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false,
        },
    }
    // Restore position only if saved (avoid off-screen issues)
    if (saved?.x != null && saved?.y != null) {
        winOpts.x = saved.x
        winOpts.y = saved.y
    }

    const mainWindow = new BrowserWindow(winOpts)

    // Restore maximized state after window is created
    if (saved?.isMaximized) mainWindow.maximize()

    // Track normal bounds before maximize so we can restore them correctly
    mainWindow.on('resize', () => {
        if (!mainWindow.isMaximized()) mainWindow._lastNormalBounds = mainWindow.getBounds()
    })
    mainWindow.on('move', () => {
        if (!mainWindow.isMaximized()) mainWindow._lastNormalBounds = mainWindow.getBounds()
    })

    // Save window state on close
    mainWindow.on('close', () => saveWindowState(mainWindow))

    // ── Register all IPC handlers ─────────────────────────────────────────────
    registerAuthIpc(ipcMain)
    registerFirewallIpc(ipcMain)
    registerAiIpc(ipcMain)
    registerDeployIpc(ipcMain, mainWindow, sshManager)
    registerDbIpc(ipcMain, mainWindow)
    registerCfIpc(ipcMain, mainWindow)

    // ── Dialog handler (used by preload for file/folder pickers) ──────────────
    ipcMain.handle('dialog:open', async (e, options) => {
        const result = await dialog.showOpenDialog(mainWindow, options)
        return result
    })

    // ── Window control IPC handlers (for frameless custom TopBar) ─────────────
    ipcMain.on('win:minimize',  () => mainWindow.minimize())
    ipcMain.on('win:maximize',  () => {
        if (mainWindow.isMaximized()) mainWindow.unmaximize()
        else mainWindow.maximize()
    })
    ipcMain.on('win:close',     () => mainWindow.close())
    ipcMain.handle('win:is-maximized', () => mainWindow.isMaximized())

    // Notify renderer when max/restore state changes
    mainWindow.on('maximize',   () => mainWindow.webContents.send('win:maximized-change', true))
    mainWindow.on('unmaximize', () => mainWindow.webContents.send('win:maximized-change', false))

    // ── Window event handlers ─────────────────────────────────────────────────
    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // ── Load app ──────────────────────────────────────────────────────────────
    // In dev: use Vite dev server hot-reload URL
    // In prod: load built index.html from dist
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return mainWindow
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
    // Set Windows app user model ID (taskbar grouping)
    electronApp.setAppUserModelId('com.zevitsoft.deployment-manager')

    // Enable F12 DevTools in dev, disable ⌘R reload in prod
    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    // Re-create window on macOS dock click when no windows open
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed (Windows/Linux behavior)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// Drain worker pools before the process exits to avoid orphaned threads
app.on('before-quit', async () => {
    await destroyPools()
})
