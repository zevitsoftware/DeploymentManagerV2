/**
 * src/main/ipc/authHandlers.js
 * Google Auth / gcloud IPC handlers
 * Migrated from legacy main.js auth section.
 *
 * Channels: auth:check-gcloud, auth:install-gcloud, auth:check-saved,
 *           auth:login, auth:switch-account, auth:logout
 */
'use strict'

const { execFile, spawn } = require('child_process')
const path   = require('path')
const fs     = require('fs')
const os     = require('os')
const axios  = require('axios')
const ch     = require('../../shared/channels')
const { encrypt, decrypt } = require('../services/configStore')



// ─── Helpers ──────────────────────────────────────────────────────────────────
// Node.js v20+ requires shell:true to spawn .cmd/.bat files, otherwise EINVAL
function run(cmd, args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, shell: true }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

function getAuthPath() {
  const appDir = global.APP_DIR ?? __dirname
  return path.join(appDir, 'auth.enc')
}

function readAuth() {
  try {
    const authPath = getAuthPath()
    if (!fs.existsSync(authPath)) return null
    const raw = fs.readFileSync(authPath, 'utf8').trim()
    return JSON.parse(decrypt(raw))
  } catch { return null }
}

function writeAuth(data) {
  fs.writeFileSync(getAuthPath(), encrypt(JSON.stringify(data)), 'utf8')
}

// ─── Register handlers ────────────────────────────────────────────────────────
function registerAuthHandlers(ipcMain) {

  // Check gcloud is installed
  ipcMain.handle(ch.AUTH_CHECK_GCLOUD, async () => {
    try {
      await run('gcloud', ['--version'], 8000)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  // Download and launch gcloud installer
  ipcMain.handle(ch.AUTH_INSTALL_GCLOUD, async () => {
    try {
      const url     = 'https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe'
      const tmpPath = path.join(os.tmpdir(), 'GoogleCloudSDKInstaller.exe')
      const writer  = fs.createWriteStream(tmpPath)
      const res     = await axios({ method: 'get', url, responseType: 'stream' })
      await new Promise((resolve, reject) => {
        res.data.pipe(writer)
        writer.on('finish', resolve)
        writer.on('error', reject)
      })
      const { exec } = require('child_process')
      exec(`"${tmpPath}"`)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Check saved auth (skip login if still valid)
  ipcMain.handle(ch.AUTH_CHECK_SAVED, async () => {
    const saved = readAuth()
    if (!saved?.email) return { ok: false }
    try {
      const current = (await run('gcloud', ['config', 'get-value', 'account'])).trim().toLowerCase()
      if (current === saved.email.toLowerCase()) {
        return { ok: true, email: saved.email }
      }
    } catch { /* gcloud might not exist */ }
    return { ok: false }
  })

  // Login with Google via gcloud
  ipcMain.handle(ch.AUTH_LOGIN, async () => {
    try {
      const email = await new Promise((resolve, reject) => {
        const child = spawn('cmd.exe', ['/c', 'gcloud', 'auth', 'login'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: false,
          cwd: os.homedir(),
        })
        let allOutput = ''
        const onData = (d) => {
          const chunk = d.toString()
          allOutput += chunk
          const m = allOutput.match(/You are now logged in as \[([^\]]+)\]/i)
          if (m) {
            clearTimeout(timer)
            resolve(m[1].trim().toLowerCase())
            try { child.kill() } catch { /* ok */ }
          }
        }
        child.stdout.on('data', onData)
        child.stderr.on('data', onData)
        const timer = setTimeout(() => {
          try { child.kill() } catch { /* ok */ }
          reject(new Error('Login timed out after 120s'))
        }, 120000)
        child.on('close', (code) => {
          clearTimeout(timer)
          if (!allOutput.includes('You are now logged in')) {
            reject(new Error(`gcloud exited (code ${code}) without completing login`))
          }
        })
        child.on('error', (err) => { clearTimeout(timer); reject(err) })
      })

      if (!email) return { ok: false, error: 'Could not determine logged-in account.' }

      writeAuth({ email, loginAt: new Date().toISOString() })
      return { ok: true, email }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Switch Google account
  ipcMain.handle(ch.AUTH_SWITCH, async () => {
    try {
      const email = await new Promise((resolve, reject) => {
        const child = spawn('cmd.exe', ['/c', 'gcloud', 'auth', 'login'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: false,
          cwd: os.homedir(),
        })
        let allOutput = ''
        const onData = (d) => {
          const chunk = d.toString()
          allOutput += chunk
          const m = allOutput.match(/You are now logged in as \[([^\]]+)\]/i)
          if (m) {
            clearTimeout(timer)
            resolve(m[1].trim().toLowerCase())
            try { child.kill() } catch { /* ok */ }
          }
        }
        child.stdout.on('data', onData)
        child.stderr.on('data', onData)
        const timer = setTimeout(() => {
          try { child.kill() } catch { /* ok */ }
          reject(new Error('Login timed out after 120s'))
        }, 120000)
        child.on('close', (code) => {
          clearTimeout(timer)
          if (!allOutput.includes('You are now logged in')) {
            reject(new Error(`gcloud exited (code ${code}) without completing login`))
          }
        })
        child.on('error', (err) => { clearTimeout(timer); reject(err) })
      })


      writeAuth({ email, loginAt: new Date().toISOString() })
      return { ok: true, email }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  // Logout
  ipcMain.handle(ch.AUTH_LOGOUT, async () => {
    try {
      const saved = readAuth()
      if (saved?.email) {
        await run('gcloud', ['auth', 'revoke', saved.email, '--quiet']).catch(() => {})
      }
      const authPath = getAuthPath()
      if (fs.existsSync(authPath)) fs.unlinkSync(authPath)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })
}

module.exports = registerAuthHandlers
