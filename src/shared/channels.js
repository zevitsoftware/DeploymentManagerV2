/**
 * src/shared/channels.js
 * ─────────────────────────────────────────────────────────────────────────────
 * IPC Channel Constants — Shared Contract for Agent 1 (Backend) & Agent 2 (Frontend)
 *
 * RULES:
 *  - NEVER hardcode channel strings in handlers or UI code — always import from here.
 *  - Agent 1 (main process) uses these as ipcMain.handle(CHANNEL_NAME, ...)
 *  - Agent 2 (renderer) uses these via window.api.* (mapped in preload/index.js)
 *  - All handlers MUST return { ok: boolean, error?: string, ...data }
 *
 * Reference: ViteMigrationPlan.md — Sections 8.1 and 11
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── AUTH (6 channels) ───────────────────────────────────────────────────────
// Legacy channel names preserved for compatibility reference
// New names use auth: namespace prefix
const AUTH_CHECK_GCLOUD   = 'auth:check-gcloud'
const AUTH_INSTALL_GCLOUD = 'auth:install-gcloud'
const AUTH_CHECK_SAVED    = 'auth:check-saved'
const AUTH_LOGIN          = 'auth:login'
const AUTH_SWITCH         = 'auth:switch-account'
const AUTH_LOGOUT         = 'auth:logout'

// ─── FIREWALL (16 channels) ───────────────────────────────────────────────────
const FW_LOAD_TARGETS       = 'fw:load-targets'
const FW_SAVE_TARGETS       = 'fw:save-targets'
const FW_GET_PUBLIC_IP      = 'fw:get-public-ip'
const FW_GET_INTERFACES     = 'fw:get-interfaces'
const FW_GET_GCLOUD_ACCOUNT = 'fw:get-gcloud-account'
const FW_LIST_GCLOUD_PROJECTS = 'fw:list-gcloud-projects'
const FW_LIST_GCP_RULES     = 'fw:list-gcp-rules'
const FW_LIST_GCP_SQL       = 'fw:list-gcp-sql'
const FW_UPDATE_GCP         = 'fw:update-gcp'
const FW_UPDATE_GCPSQL      = 'fw:update-gcpsql'
const FW_GET_DO_ACCOUNT     = 'fw:get-do-account'
const FW_LIST_DO_FIREWALLS  = 'fw:list-do-firewalls'
const FW_UPDATE_DO          = 'fw:update-do'
const FW_LIST_ATLAS_ACCESS  = 'fw:list-atlas-access'
const FW_UPDATE_ATLAS       = 'fw:update-atlas'
const FW_GET_ALLOWED_IPS    = 'fw:get-allowed-ips'

// ─── DEPLOY — CONFIG/CRUD (7 channels) ───────────────────────────────────────
const DEPLOY_GET_SERVERS    = 'deploy:get-servers'
const DEPLOY_SAVE_SERVER    = 'deploy:save-server'
const DEPLOY_DELETE_SERVER  = 'deploy:delete-server'
const DEPLOY_SAVE_PROJECT   = 'deploy:save-project'
const DEPLOY_DELETE_PROJECT = 'deploy:delete-project'
const DEPLOY_GET_GIT_CONFIG = 'deploy:get-git-config'
const DEPLOY_SAVE_GIT_CONFIG = 'deploy:save-git-config'

// ─── DEPLOY — SSH CONNECTION (2 channels) ────────────────────────────────────
const DEPLOY_CONNECT_SERVER    = 'deploy:connect-server'
const DEPLOY_DISCONNECT_SERVER = 'deploy:disconnect-server'

// ─── DEPLOY — ACTIONS (8 channels) ───────────────────────────────────────────
const DEPLOY_RUN_DEPLOY      = 'deploy:run-deploy'
const DEPLOY_CANCEL_DEPLOY   = 'deploy:cancel-deploy'
const DEPLOY_PM2_STATUS      = 'deploy:pm2-status'
const DEPLOY_PM2_RESTART     = 'deploy:pm2-restart'
const DEPLOY_PM2_STOP        = 'deploy:pm2-stop'
const DEPLOY_SERVER_STATS    = 'deploy:server-stats'
const DEPLOY_ACCESS_LOG_SUMMARY = 'deploy:access-log-summary'
const DEPLOY_PROCESS_LIST    = 'deploy:process-list'

// ─── DEPLOY — AI / SECURITY (4 channels) ─────────────────────────────────────
const DEPLOY_SECURITY_SCAN   = 'deploy:security-scan'
const DEPLOY_AI_SCAN         = 'deploy:ai-scan'
const DEPLOY_GET_AI_KEYS     = 'deploy:get-ai-keys'
const DEPLOY_SAVE_AI_KEYS    = 'deploy:save-ai-keys'

// ─── DEPLOY — SFTP FILE EDITOR (10 channels) ─────────────────────────────────
const DEPLOY_FILE_LIST     = 'deploy:file-list'
const DEPLOY_FILE_READ     = 'deploy:file-read'
const DEPLOY_FILE_WRITE    = 'deploy:file-write'
const DEPLOY_FILE_CREATE   = 'deploy:file-create'
const DEPLOY_FILE_MKDIR    = 'deploy:file-mkdir'
const DEPLOY_FILE_DELETE   = 'deploy:file-delete'
const DEPLOY_FILE_RMDIR    = 'deploy:file-rmdir'
const DEPLOY_FILE_RENAME   = 'deploy:file-rename'
const DEPLOY_FILE_UPLOAD   = 'deploy:file-upload'
const DEPLOY_FILE_DOWNLOAD = 'deploy:file-download'

// ─── DEPLOY — TERMINAL (4 channels) ──────────────────────────────────────────
const DEPLOY_TERMINAL_OPEN   = 'deploy:terminal-open'
const DEPLOY_TERMINAL_INPUT  = 'deploy:terminal-input'
const DEPLOY_TERMINAL_RESIZE = 'deploy:terminal-resize'
const DEPLOY_TERMINAL_CLOSE  = 'deploy:terminal-close'

// ─── DEPLOY — NGINX (7 channels) ─────────────────────────────────────────────
const DEPLOY_NGINX_DOMAINS        = 'deploy:nginx-domains'
const DEPLOY_NGINX_ENABLE_DOMAIN  = 'deploy:nginx-enable-domain'
const DEPLOY_NGINX_DISABLE_DOMAIN = 'deploy:nginx-disable-domain'
const DEPLOY_NGINX_REMOVE_DOMAIN  = 'deploy:nginx-remove-domain'
const DEPLOY_NGINX_ADD_DOMAIN     = 'deploy:nginx-add-domain'
const DEPLOY_NGINX_GET_CONFIG     = 'deploy:nginx-get-config'
const DEPLOY_NGINX_SPLIT_CONFIG   = 'deploy:nginx-split-config'

// ─── DEPLOY — FILE BROWSER (4 channels) ──────────────────────────────────────
const DEPLOY_BROWSE_FILE       = 'deploy:browse-file'
const DEPLOY_BROWSE_FOLDER     = 'deploy:browse-folder'
const DEPLOY_BROWSE_SERVER_DIR = 'deploy:browse-server-dir'
const DEPLOY_READ_GIT_REMOTE   = 'deploy:read-git-remote'

// ─── DEPLOY — SERVER SCANNER (1 channel) ─────────────────────────────────────
const DEPLOY_SCAN_PROJECTS = 'deploy:scan-projects'

// ─── DATABASE (13 channels) ───────────────────────────────────────────────────
const DB_GET_CONNECTIONS   = 'db:get-connections'
const DB_SAVE_CONNECTION   = 'db:save-connection'
const DB_DELETE_CONNECTION = 'db:delete-connection'
const DB_TEST_CONNECTION   = 'db:test-connection'
const DB_RUN_DIAGNOSTICS   = 'db:run-diagnostics'
const DB_GET_SCHEMA        = 'db:get-schema'
const DB_AI_ANALYZE        = 'db:ai-analyze'
const DB_CHECK_CLI         = 'db:check-cli'
const DB_BROWSE_BACKUP_DIR = 'db:browse-backup-dir'
const DB_RUN_BACKUP        = 'db:run-backup'
const DB_GET_CLI_PATHS     = 'db:get-cli-paths'
const DB_SAVE_CLI_PATHS    = 'db:save-cli-paths'
const DB_BROWSE_CLI_PATH   = 'db:browse-cli-path'

// ─── DATABASE — AI CHAT (1 channel) ──────────────────────────────────────────
const DB_AI_CHAT = 'db:ai-chat'

// ─── CLOUDFLARE — ACCOUNTS (4 channels) ──────────────────────────────────────
const CF_GET_ACCOUNTS    = 'cf:get-accounts'
const CF_SAVE_ACCOUNT    = 'cf:save-account'
const CF_DELETE_ACCOUNT  = 'cf:delete-account'
const CF_VERIFY_ACCOUNT  = 'cf:verify-account'

// ─── CLOUDFLARE — DNS (4 channels) ───────────────────────────────────────────
const CF_LIST_DNS    = 'cf:list-dns'
const CF_CREATE_DNS  = 'cf:create-dns'
const CF_UPDATE_DNS  = 'cf:update-dns'
const CF_DELETE_DNS  = 'cf:delete-dns'

// ─── CLOUDFLARE — ZONES (8 channels) ─────────────────────────────────────────
const CF_LIST_ZONES    = 'cf:list-zones'
const CF_ADD_ZONE      = 'cf:add-zone'
const CF_DELETE_ZONE   = 'cf:delete-zone'
const CF_ZONE_DETAILS  = 'cf:zone-details'
const CF_PURGE_CACHE   = 'cf:purge-cache'
const CF_DEV_MODE      = 'cf:dev-mode'
const CF_ZONE_SETTINGS = 'cf:zone-settings'
const CF_ZONE_ANALYTICS = 'cf:zone-analytics'

// ─── CLOUDFLARE — TUNNELS (7 channels) ───────────────────────────────────────
const CF_LIST_CF_ACCOUNTS      = 'cf:list-cf-accounts'
const CF_LIST_TUNNELS          = 'cf:list-tunnels'
const CF_CREATE_TUNNEL         = 'cf:create-tunnel'
const CF_TUNNEL_DETAILS        = 'cf:tunnel-details'
const CF_TUNNEL_CONFIG         = 'cf:tunnel-config'
const CF_UPDATE_TUNNEL_CONFIG  = 'cf:update-tunnel-config'
const CF_DELETE_TUNNEL         = 'cf:delete-tunnel'

// ─── CLOUDFLARE — WHOIS (4 channels) ─────────────────────────────────────────
const CF_GET_WHOIS_CACHE = 'cf:get-whois-cache'
const CF_WHOIS_LOOKUP    = 'cf:whois-lookup'
const CF_GET_WHOIS_KEY   = 'cf:get-whois-key'
const CF_SAVE_WHOIS_KEY  = 'cf:save-whois-key'

// ─── AI CONFIG (4 channels) ───────────────────────────────────────────────────
const AI_GET_CONFIG  = 'ai:get-config'
const AI_SAVE_CONFIG = 'ai:save-config'
const AI_CHECK_CLI   = 'ai:check-cli'
const AI_TEST        = 'ai:test'

// ─── EVENTS — Main → Renderer PUSH (6 channels) ──────────────────────────────
// These are NEVER used with ipcMain.handle() — only with webContents.send()
// Renderer listens via window.api.on(channel, callback)
const EVT_DEPLOY_LOG        = 'deploy:log'
const EVT_DEPLOY_PROGRESS   = 'deploy:progress'
const EVT_UPLOAD_PROGRESS   = 'deploy:upload-progress'
const EVT_SFTP_PROGRESS     = 'deploy:sftp-progress'
const EVT_TERMINAL_DATA     = 'deploy:terminal-data'
const EVT_BACKUP_PROGRESS   = 'db:backup-progress'

// ─────────────────────────────────────────────────────────────────────────────
// Export as CommonJS (used by main process via require) and also export
// named exports for renderer/preload ES module imports.
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  // Auth
  AUTH_CHECK_GCLOUD,
  AUTH_INSTALL_GCLOUD,
  AUTH_CHECK_SAVED,
  AUTH_LOGIN,
  AUTH_SWITCH,
  AUTH_LOGOUT,

  // Firewall
  FW_LOAD_TARGETS,
  FW_SAVE_TARGETS,
  FW_GET_PUBLIC_IP,
  FW_GET_INTERFACES,
  FW_GET_GCLOUD_ACCOUNT,
  FW_LIST_GCLOUD_PROJECTS,
  FW_LIST_GCP_RULES,
  FW_LIST_GCP_SQL,
  FW_UPDATE_GCP,
  FW_UPDATE_GCPSQL,
  FW_GET_DO_ACCOUNT,
  FW_LIST_DO_FIREWALLS,
  FW_UPDATE_DO,
  FW_LIST_ATLAS_ACCESS,
  FW_UPDATE_ATLAS,
  FW_GET_ALLOWED_IPS,

  // Deploy — Config/CRUD
  DEPLOY_GET_SERVERS,
  DEPLOY_SAVE_SERVER,
  DEPLOY_DELETE_SERVER,
  DEPLOY_SAVE_PROJECT,
  DEPLOY_DELETE_PROJECT,
  DEPLOY_GET_GIT_CONFIG,
  DEPLOY_SAVE_GIT_CONFIG,

  // Deploy — SSH Connection
  DEPLOY_CONNECT_SERVER,
  DEPLOY_DISCONNECT_SERVER,

  // Deploy — Actions
  DEPLOY_RUN_DEPLOY,
  DEPLOY_CANCEL_DEPLOY,
  DEPLOY_PM2_STATUS,
  DEPLOY_PM2_RESTART,
  DEPLOY_PM2_STOP,
  DEPLOY_SERVER_STATS,
  DEPLOY_ACCESS_LOG_SUMMARY,
  DEPLOY_PROCESS_LIST,

  // Deploy — AI / Security
  DEPLOY_SECURITY_SCAN,
  DEPLOY_AI_SCAN,
  DEPLOY_GET_AI_KEYS,
  DEPLOY_SAVE_AI_KEYS,

  // Deploy — SFTP File Editor
  DEPLOY_FILE_LIST,
  DEPLOY_FILE_READ,
  DEPLOY_FILE_WRITE,
  DEPLOY_FILE_CREATE,
  DEPLOY_FILE_MKDIR,
  DEPLOY_FILE_DELETE,
  DEPLOY_FILE_RMDIR,
  DEPLOY_FILE_RENAME,
  DEPLOY_FILE_UPLOAD,
  DEPLOY_FILE_DOWNLOAD,

  // Deploy — Terminal
  DEPLOY_TERMINAL_OPEN,
  DEPLOY_TERMINAL_INPUT,
  DEPLOY_TERMINAL_RESIZE,
  DEPLOY_TERMINAL_CLOSE,

  // Deploy — Nginx
  DEPLOY_NGINX_DOMAINS,
  DEPLOY_NGINX_ENABLE_DOMAIN,
  DEPLOY_NGINX_DISABLE_DOMAIN,
  DEPLOY_NGINX_REMOVE_DOMAIN,
  DEPLOY_NGINX_ADD_DOMAIN,
  DEPLOY_NGINX_GET_CONFIG,
  DEPLOY_NGINX_SPLIT_CONFIG,

  // Deploy — File Browser
  DEPLOY_BROWSE_FILE,
  DEPLOY_BROWSE_FOLDER,
  DEPLOY_BROWSE_SERVER_DIR,
  DEPLOY_READ_GIT_REMOTE,

  // Deploy — Server Scanner
  DEPLOY_SCAN_PROJECTS,

  // Database
  DB_GET_CONNECTIONS,
  DB_SAVE_CONNECTION,
  DB_DELETE_CONNECTION,
  DB_TEST_CONNECTION,
  DB_RUN_DIAGNOSTICS,
  DB_GET_SCHEMA,
  DB_AI_ANALYZE,
  DB_AI_CHAT,
  DB_CHECK_CLI,
  DB_BROWSE_BACKUP_DIR,
  DB_RUN_BACKUP,
  DB_GET_CLI_PATHS,
  DB_SAVE_CLI_PATHS,
  DB_BROWSE_CLI_PATH,

  // Cloudflare — Accounts
  CF_GET_ACCOUNTS,
  CF_SAVE_ACCOUNT,
  CF_DELETE_ACCOUNT,
  CF_VERIFY_ACCOUNT,

  // Cloudflare — DNS
  CF_LIST_DNS,
  CF_CREATE_DNS,
  CF_UPDATE_DNS,
  CF_DELETE_DNS,

  // Cloudflare — Zones
  CF_LIST_ZONES,
  CF_ADD_ZONE,
  CF_DELETE_ZONE,
  CF_ZONE_DETAILS,
  CF_PURGE_CACHE,
  CF_DEV_MODE,
  CF_ZONE_SETTINGS,
  CF_ZONE_ANALYTICS,

  // Cloudflare — Tunnels
  CF_LIST_CF_ACCOUNTS,
  CF_LIST_TUNNELS,
  CF_CREATE_TUNNEL,
  CF_TUNNEL_DETAILS,
  CF_TUNNEL_CONFIG,
  CF_UPDATE_TUNNEL_CONFIG,
  CF_DELETE_TUNNEL,

  // Cloudflare — WHOIS
  CF_GET_WHOIS_CACHE,
  CF_WHOIS_LOOKUP,
  CF_GET_WHOIS_KEY,
  CF_SAVE_WHOIS_KEY,

  // AI Config
  AI_GET_CONFIG,
  AI_SAVE_CONFIG,
  AI_CHECK_CLI,
  AI_TEST,

  // Events (Main → Renderer push only — use webContents.send())
  EVT_DEPLOY_LOG,
  EVT_DEPLOY_PROGRESS,
  EVT_UPLOAD_PROGRESS,
  EVT_SFTP_PROGRESS,
  EVT_TERMINAL_DATA,
  EVT_BACKUP_PROGRESS
}
