/**
 * src/preload/index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Electron contextBridge — Phase 1.5
 *
 * Exposes `window.api` to the renderer process with all IPC namespaces:
 *   window.api.deploy.*   — Deploy Manager
 *   window.api.db.*       — Database Manager
 *   window.api.cf.*       — Cloudflare Manager
 *   window.api.firewall.* — Firewall Manager
 *   window.api.auth.*     — Google Auth / Gcloud
 *   window.api.ai.*       — AI Config
 *   window.api.on()       — Generic push-event listener
 *   window.api.off()      — Generic push-event unlistener
 *
 * Channel strings are imported from the shared contract (channels.js).
 * NEVER hardcode raw channel strings here — always use the constant.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { contextBridge, ipcRenderer } = require('electron');
const ch = require('../shared/channels');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** One-way: renderer → main, no response expected (terminal input, resizes) */
const send = (channel, ...args) => ipcRenderer.send(channel, ...args);

/** Two-way: renderer → main → renderer, returns a Promise */
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

/** Register a listener for push events from main */
const on = (channel, callback) => {
    ipcRenderer.on(channel, callback);
    // Return a cleanup function for React useEffect
    return () => ipcRenderer.removeListener(channel, callback);
};

/** Remove a listener for push events from main */
const off = (channel, callback) => ipcRenderer.removeListener(channel, callback);

// ─────────────────────────────────────────────────────────────────────────────
// Expose window.electron — frameless window controls
// ─────────────────────────────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('electron', {
    minimize:    ()          => ipcRenderer.send('win:minimize'),
    maximize:    ()          => ipcRenderer.send('win:maximize'),
    close:       ()          => ipcRenderer.send('win:close'),
    isMaximized: ()          => ipcRenderer.invoke('win:is-maximized'),
    onMaximizedChange: (cb)  => {
        const handler = (_, isMax) => cb(isMax);
        ipcRenderer.on('win:maximized-change', handler);
        return () => ipcRenderer.removeListener('win:maximized-change', handler);
    },
});

contextBridge.exposeInMainWorld('api', {

    // ── Generic event helpers (for push events from main) ─────────────────────
    /**
     * Subscribe to a push event from the main process.
     * Returns an unsubscribe function — useful in React useEffect cleanup.
     *   const unsub = window.api.on('deploy:terminal-data', (e, data) => ...);
     *   return unsub; // cleanup
     */
    on: (channel, callback) => on(channel, callback),

    /**
     * Unsubscribe from a push event.
     *   window.api.off('deploy:terminal-data', handler);
     */
    off: (channel, callback) => off(channel, callback),

    // ─────────────────────────────────────────────────────────────────────────
    // AUTH — Google Auth & Gcloud
    // ─────────────────────────────────────────────────────────────────────────
    auth: {
        checkGcloud:    ()    => invoke(ch.AUTH_CHECK_GCLOUD),
        installGcloud:  ()    => invoke(ch.AUTH_INSTALL_GCLOUD),
        checkSavedAuth: ()    => invoke(ch.AUTH_CHECK_SAVED),
        login:          ()    => invoke(ch.AUTH_LOGIN),
        switchAccount:  ()    => invoke(ch.AUTH_SWITCH),
        logout:         ()    => invoke(ch.AUTH_LOGOUT),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FIREWALL — GCP / DigitalOcean / Atlas whitelist / Network
    // ─────────────────────────────────────────────────────────────────────────
    firewall: {
        // Config persistence
        loadTargets:         ()        => invoke(ch.FW_LOAD_TARGETS),
        saveTargets:         (targets) => invoke(ch.FW_SAVE_TARGETS, targets),

        // Network
        getPublicIP:         (localIP) => invoke(ch.FW_GET_PUBLIC_IP, localIP),
        getInterfaces:       ()        => invoke(ch.FW_GET_INTERFACES),

        // GCP
        getGcloudAccount:    ()        => invoke(ch.FW_GET_GCLOUD_ACCOUNT),
        listGcloudProjects:  ()        => invoke(ch.FW_LIST_GCLOUD_PROJECTS),
        listGcpRules:        (projId)  => invoke(ch.FW_LIST_GCP_RULES, projId),
        listGcpSQL:          (projId)  => invoke(ch.FW_LIST_GCP_SQL, projId),
        updateGcp:           (payload) => invoke(ch.FW_UPDATE_GCP, payload),
        updateGcpSQL:        (payload) => invoke(ch.FW_UPDATE_GCPSQL, payload),

        // DigitalOcean
        getDoAccount:        (token)   => invoke(ch.FW_GET_DO_ACCOUNT, token),
        listDoFirewalls:     (token)   => invoke(ch.FW_LIST_DO_FIREWALLS, token),
        updateDo:            (payload) => invoke(ch.FW_UPDATE_DO, payload),

        // MongoDB Atlas IP whitelist (legacy firewall panel)
        listAtlasAccess:     (payload) => invoke(ch.FW_LIST_ATLAS_ACCESS, payload),
        updateAtlas:         (payload) => invoke(ch.FW_UPDATE_ATLAS, payload),

        // Unified allowed-IP checker
        getAllowedIPs:        (target)  => invoke(ch.FW_GET_ALLOWED_IPS, target),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DEPLOY MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    deploy: {

        // ── Server / Project CRUD ─────────────────────────────────────────────
        getServers:      ()                             => invoke(ch.DEPLOY_GET_SERVERS),
        saveServer:      (server)                       => invoke(ch.DEPLOY_SAVE_SERVER, server),
        deleteServer:    (id)                           => invoke(ch.DEPLOY_DELETE_SERVER, id),
        saveProject:     (serverId, project)            => invoke(ch.DEPLOY_SAVE_PROJECT, serverId, project),
        deleteProject:   (serverId, projectId)          => invoke(ch.DEPLOY_DELETE_PROJECT, serverId, projectId),
        getGitConfig:    ()                             => invoke(ch.DEPLOY_GET_GIT_CONFIG),
        saveGitConfig:   (config)                       => invoke(ch.DEPLOY_SAVE_GIT_CONFIG, config),
        getDoConfig:     ()                             => invoke(ch.DEPLOY_GET_DO_CONFIG),
        saveDoConfig:    (config)                       => invoke(ch.DEPLOY_SAVE_DO_CONFIG, config),

        // ── SSH Connection ────────────────────────────────────────────────────
        connectServer:   (serverId)                     => invoke(ch.DEPLOY_CONNECT_SERVER, serverId),
        disconnectServer:(serverId)                     => invoke(ch.DEPLOY_DISCONNECT_SERVER, serverId),

        // ── Deploy Actions ────────────────────────────────────────────────────
        runDeploy:       (serverId, projectId, skip, cmds) => invoke(ch.DEPLOY_RUN_DEPLOY, serverId, projectId, skip, cmds),
        cancelDeploy:    ()                             => invoke(ch.DEPLOY_CANCEL_DEPLOY),

        // ── PM2 ───────────────────────────────────────────────────────────────
        pm2Status:       (serverId)                     => invoke(ch.DEPLOY_PM2_STATUS, serverId),
        pm2Restart:      (serverId, projectId)          => invoke(ch.DEPLOY_PM2_RESTART, serverId, projectId),
        pm2Stop:         (serverId, projectId)          => invoke(ch.DEPLOY_PM2_STOP, serverId, projectId),

        // ── Terminal (send + push events) ─────────────────────────────────────
        terminalOpen:    (serverId)                     => invoke(ch.DEPLOY_TERMINAL_OPEN, serverId),
        terminalInput:   (serverId, data)               => send(ch.DEPLOY_TERMINAL_INPUT, serverId, data),
        terminalResize:  (serverId, dims)               => send(ch.DEPLOY_TERMINAL_RESIZE, serverId, dims),
        terminalClose:   (serverId)                     => invoke(ch.DEPLOY_TERMINAL_CLOSE, serverId),

        // Terminal push-events (convenience wrappers over generic on/off)
        onTerminalData:  (cb) => on(ch.EVT_TERMINAL_DATA, cb),
        offTerminalData: (cb) => off(ch.EVT_TERMINAL_DATA, cb),

        // ── Local / Server File Browser ───────────────────────────────────────
        browseFile:      (opts)                         => invoke(ch.DEPLOY_BROWSE_FILE, opts),
        browseFolder:    (opts)                         => invoke(ch.DEPLOY_BROWSE_FOLDER, opts),
        browseServerDir: (serverId, dirPath)            => invoke(ch.DEPLOY_BROWSE_SERVER_DIR, serverId, dirPath),
        readGitRemote:   (serverId, dirPath)            => invoke(ch.DEPLOY_READ_GIT_REMOTE, serverId, dirPath),

        // ── Nginx ─────────────────────────────────────────────────────────────
        nginxDomains:    (serverId)                     => invoke(ch.DEPLOY_NGINX_DOMAINS, serverId),
        nginxEnable:     (serverId, fileName)           => invoke(ch.DEPLOY_NGINX_ENABLE_DOMAIN, serverId, fileName),
        nginxDisable:    (serverId, fileName)           => invoke(ch.DEPLOY_NGINX_DISABLE_DOMAIN, serverId, fileName),
        nginxRemove:     (serverId, fileName)           => invoke(ch.DEPLOY_NGINX_REMOVE_DOMAIN, serverId, fileName),
        nginxAdd:        (serverId, fileName, content)  => invoke(ch.DEPLOY_NGINX_ADD_DOMAIN, serverId, fileName, content),
        nginxGetConfig:  (serverId, fileName)           => invoke(ch.DEPLOY_NGINX_GET_CONFIG, serverId, fileName),
        nginxSplit:      (serverId, fileName)           => invoke(ch.DEPLOY_NGINX_SPLIT_CONFIG, serverId, fileName),
        nginxAiGenerate: (serverId, opts)               => invoke(ch.DEPLOY_NGINX_AI_GENERATE, serverId, opts),
        nginxRunCertbot: (serverId, opts)               => invoke(ch.DEPLOY_NGINX_RUN_CERTBOT, serverId, opts),

        // ── Server Scanner ────────────────────────────────────────────────────
        scanProjects:    (serverId)                     => invoke(ch.DEPLOY_SCAN_PROJECTS, serverId),
        onScanLog:       (cb) => on('deploy:scan-log', cb),
        offScanLog:      (cb) => off('deploy:scan-log', cb),

        // ── SFTP File Editor ──────────────────────────────────────────────────
        fileList:        (serverId, dirPath)            => invoke(ch.DEPLOY_FILE_LIST, serverId, dirPath),
        fileRead:        (serverId, filePath)           => invoke(ch.DEPLOY_FILE_READ, serverId, filePath),
        fileWrite:       (serverId, filePath, content, backup) => invoke(ch.DEPLOY_FILE_WRITE, serverId, filePath, content, backup),
        fileCreate:      (serverId, filePath, content)  => invoke(ch.DEPLOY_FILE_CREATE, serverId, filePath, content),
        fileMkdir:       (serverId, dirPath)            => invoke(ch.DEPLOY_FILE_MKDIR, serverId, dirPath),
        fileDelete:      (serverId, filePath)           => invoke(ch.DEPLOY_FILE_DELETE, serverId, filePath),
        fileRmdir:       (serverId, dirPath, recursive) => invoke(ch.DEPLOY_FILE_RMDIR, serverId, dirPath, recursive),
        fileRename:      (serverId, oldPath, newPath)   => invoke(ch.DEPLOY_FILE_RENAME, serverId, oldPath, newPath),
        fileUpload:      (serverId, remoteDirPath)      => invoke(ch.DEPLOY_FILE_UPLOAD, serverId, remoteDirPath),
        fileDownload:    (serverId, remotePath)         => invoke(ch.DEPLOY_FILE_DOWNLOAD, serverId, remotePath),

        // ── Health & AI ───────────────────────────────────────────────────────
        serverStats:     (serverId) => invoke(ch.DEPLOY_SERVER_STATS, serverId),
        securityScan:    (serverId) => invoke(ch.DEPLOY_SECURITY_SCAN, serverId),
        accessLogSummary:(serverId) => invoke(ch.DEPLOY_ACCESS_LOG_SUMMARY, serverId),
        processList:     (serverId) => invoke(ch.DEPLOY_PROCESS_LIST, serverId),
        getAiKeys:       ()         => invoke(ch.DEPLOY_GET_AI_KEYS),
        saveAiKeys:      (keys)     => invoke(ch.DEPLOY_SAVE_AI_KEYS, keys),
        checkGeminiCli:  ()         => invoke('deploy:check-gemini-cli'),
        aiScan:          (payload)  => invoke(ch.DEPLOY_AI_SCAN, payload),

        // ── Deploy push-events ────────────────────────────────────────────────
        onDeployLog:       (cb) => on(ch.EVT_DEPLOY_LOG, cb),
        onDeployProgress:  (cb) => on(ch.EVT_DEPLOY_PROGRESS, cb),
        onUploadProgress:  (cb) => on(ch.EVT_UPLOAD_PROGRESS, cb),
        onSftpProgress:    (cb) => on(ch.EVT_SFTP_PROGRESS, cb),
        offDeployLog:      (cb) => off(ch.EVT_DEPLOY_LOG, cb),
        offDeployProgress: (cb) => off(ch.EVT_DEPLOY_PROGRESS, cb),
        offUploadProgress: (cb) => off(ch.EVT_UPLOAD_PROGRESS, cb),
        offSftpProgress:   (cb) => off(ch.EVT_SFTP_PROGRESS, cb),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DATABASE MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    db: {

        // ── Connection CRUD ───────────────────────────────────────────────────
        getConnections:  ()       => invoke(ch.DB_GET_CONNECTIONS),
        saveConnection:  (conn)   => invoke(ch.DB_SAVE_CONNECTION, conn),
        deleteConnection:(connId) => invoke(ch.DB_DELETE_CONNECTION, connId),

        // ── Lifecycle ─────────────────────────────────────────────────────────
        testConnection:  (connId) => invoke(ch.DB_TEST_CONNECTION, connId),
        connect:         (connId) => invoke('db:connect', connId),
        disconnect:      (connId) => invoke('db:disconnect', connId),

        // ── Query & Schema ────────────────────────────────────────────────────
        executeQuery:    (connId, query) => invoke('db:execute-query', connId, query),
        runQuery:        (opts)          => invoke('db:run-query', opts),
        getSchema:       (connId)        => invoke(ch.DB_GET_SCHEMA, connId),
        browseTable:     (opts)          => invoke('db:browse-table', opts),
        chatQuery:       (opts)          => invoke('db:chat-query', opts),

        // ── Diagnostics & AI ──────────────────────────────────────────────────
        runDiagnostics:  (connId)   => invoke(ch.DB_RUN_DIAGNOSTICS, connId),
        aiAnalyze:       (payload)  => invoke(ch.DB_AI_ANALYZE, payload),

        // ── Backup ────────────────────────────────────────────────────────────
        checkCli:        ()       => invoke(ch.DB_CHECK_CLI),
        browseBackupDir: ()       => invoke(ch.DB_BROWSE_BACKUP_DIR),
        runBackup:       (opts)   => invoke(ch.DB_RUN_BACKUP, opts),
        onBackupProgress:(cb)     => on(ch.EVT_BACKUP_PROGRESS, (_, data) => cb(data)),
        offBackupProgress:(cb)    => off(ch.EVT_BACKUP_PROGRESS, cb),

        // ── CLI Tool Paths ────────────────────────────────────────────────────
        getCliPaths:     ()      => invoke(ch.DB_GET_CLI_PATHS),
        saveCliPaths:    (paths) => invoke(ch.DB_SAVE_CLI_PATHS, paths),
        browseCliPath:   (opts)  => invoke(ch.DB_BROWSE_CLI_PATH, opts),

        // ── Atlas IP Whitelist ────────────────────────────────────────────────
        atlasGetWhitelist:(connId)        => invoke('db:atlas-get-whitelist', connId),
        atlasAddIp:       (connId, opts)  => invoke('db:atlas-add-ip', connId, opts),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // CLOUDFLARE MANAGER
    // ─────────────────────────────────────────────────────────────────────────
    cf: {

        // ── Account CRUD ──────────────────────────────────────────────────────
        getAccounts:    ()         => invoke(ch.CF_GET_ACCOUNTS),
        saveAccount:    (account)  => invoke(ch.CF_SAVE_ACCOUNT, account),
        deleteAccount:  (id)       => invoke(ch.CF_DELETE_ACCOUNT, id),
        verifyAccount:  (account)  => invoke(ch.CF_VERIFY_ACCOUNT, account),

        // ── Zones ─────────────────────────────────────────────────────────────
        listZones:      (account)  => invoke(ch.CF_LIST_ZONES, account),
        addZone:        (payload)  => invoke(ch.CF_ADD_ZONE, payload),
        deleteZone:     (payload)  => invoke(ch.CF_DELETE_ZONE, payload),
        zoneDetails:    (payload)  => invoke(ch.CF_ZONE_DETAILS, payload),
        purgeCache:     (payload)  => invoke(ch.CF_PURGE_CACHE, payload),
        devMode:        (payload)  => invoke(ch.CF_DEV_MODE, payload),
        zoneSettings:   (payload)  => invoke(ch.CF_ZONE_SETTINGS, payload),
        zoneAnalytics:  (payload)  => invoke(ch.CF_ZONE_ANALYTICS, payload),

        // ── DNS Records ───────────────────────────────────────────────────────
        listDns:        (payload)  => invoke(ch.CF_LIST_DNS, payload),
        createDns:      (payload)  => invoke(ch.CF_CREATE_DNS, payload),
        updateDns:      (payload)  => invoke(ch.CF_UPDATE_DNS, payload),
        deleteDns:      (payload)  => invoke(ch.CF_DELETE_DNS, payload),

        // ── Tunnels ───────────────────────────────────────────────────────────
        listCfAccounts:     (account) => invoke(ch.CF_LIST_CF_ACCOUNTS, account),
        listTunnels:        (payload) => invoke(ch.CF_LIST_TUNNELS, payload),
        createTunnel:       (payload) => invoke(ch.CF_CREATE_TUNNEL, payload),
        tunnelDetails:      (payload) => invoke(ch.CF_TUNNEL_DETAILS, payload),
        tunnelConfig:       (payload) => invoke(ch.CF_TUNNEL_CONFIG, payload),
        updateTunnelConfig: (payload) => invoke(ch.CF_UPDATE_TUNNEL_CONFIG, payload),
        deleteTunnel:       (payload) => invoke(ch.CF_DELETE_TUNNEL, payload),

        // ── WHOIS ─────────────────────────────────────────────────────────────
        getWhoisCache:  ()        => invoke(ch.CF_GET_WHOIS_CACHE),
        saveWhoisEntry: (payload) => invoke('cf:save-whois-entry', payload),
        whoisLookup:    (payload) => invoke(ch.CF_WHOIS_LOOKUP, payload),
        getWhoisKey:    ()        => invoke(ch.CF_GET_WHOIS_KEY),
        saveWhoisKey:   (key)     => invoke(ch.CF_SAVE_WHOIS_KEY, key),
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AI CONFIG
    // ─────────────────────────────────────────────────────────────────────────
    ai: {
        getConfig:  ()       => invoke(ch.AI_GET_CONFIG),
        saveConfig: (config) => invoke(ch.AI_SAVE_CONFIG, config),
        checkCli:   ()       => invoke(ch.AI_CHECK_CLI),
        test:       (prompt) => invoke(ch.AI_TEST, prompt),
    },

}); // end exposeInMainWorld
