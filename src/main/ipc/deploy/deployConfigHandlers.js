'use strict';
/**
 * ipc/deploy/deployConfigHandlers.js
 *
 * IPC handlers for Deploy server/project/git CRUD.
 * Covers: servers list, save/delete server, save/delete project, git config.
 * Also covers: SSH connect/disconnect, browse file/folder dialogs.
 */

const {
    readFullConfig,
    writeFullConfig,
    getServers,
    getGitConfig,
    getDoConfig,
    findServer,
} = require('../../services/configStore');

// ─── Business Logic Helpers ───────────────────────────────────────────────────

/**
 * Adds or updates a server entry.
 * If server.id is falsy → generates a new ID and adds it.
 * If server.id exists → updates the matching entry.
 */
function upsertServer(serverObj) {
    const config = readFullConfig();
    const servers = config.servers ?? [];
    if (!serverObj.id) {
        serverObj.id = `srv_${Date.now()}`;
        servers.push(serverObj);
    } else {
        const idx = servers.findIndex(s => s.id === serverObj.id);
        if (idx >= 0) {
            // Preserve existing projects when editing server meta
            serverObj.projects = servers[idx].projects ?? [];
            servers[idx] = serverObj;
        } else {
            servers.push(serverObj);
        }
    }
    config.servers = servers;
    writeFullConfig(config);
    return serverObj;
}

/**
 * Deletes a server (and all its projects).
 */
function deleteServer(serverId) {
    const config = readFullConfig();
    config.servers = (config.servers ?? []).filter(s => s.id !== serverId);
    writeFullConfig(config);
}

/**
 * Adds or updates a project inside a server.
 * If project.id is falsy → generates a new ID.
 */
function upsertProject(serverId, projectObj) {
    const config = readFullConfig();
    const servers = config.servers ?? [];
    const { server, idx } = findServer(servers, serverId);
    const projects = server.projects ?? [];
    if (!projectObj.id) {
        projectObj.id = `prj_${Date.now()}`;
        projects.push(projectObj);
    } else {
        const pIdx = projects.findIndex(p => p.id === projectObj.id);
        if (pIdx >= 0) {
            projects[pIdx] = projectObj;
        } else {
            projects.push(projectObj);
        }
    }
    servers[idx].projects = projects;
    config.servers = servers;
    writeFullConfig(config);
    return projectObj;
}

/**
 * Deletes a project from a server.
 */
function deleteProject(serverId, projectId) {
    const config = readFullConfig();
    const servers = config.servers ?? [];
    const { server, idx } = findServer(servers, serverId);
    servers[idx].projects = (server.projects ?? []).filter(p => p.id !== projectId);
    config.servers = servers;
    writeFullConfig(config);
}

/**
 * Save git global config (username + token).
 */
function saveGitConfig({ username, token }) {
    const config = readFullConfig();
    config.git = { username, token };
    writeFullConfig(config);
}

/**
 * Save DigitalOcean global config (token).
 */
function saveDoConfig({ token }) {
    const config = readFullConfig();
    config.digitalocean = { token };
    writeFullConfig(config);
}

/**
 * Resolve a server config object by ID (from decrypted targets.enc).
 * Returns null if not found.
 */
function resolveServer(serverId) {
    const servers = getServers();
    return servers.find(s => s.id === serverId) ?? null;
}

/**
 * Resolve a project config object by server ID + project ID.
 * Returns null if not found.
 */
function resolveProject(serverId, projectId) {
    const server = resolveServer(serverId);
    if (!server) return null;
    return (server.projects ?? []).find(p => p.id === projectId) ?? null;
}

/**
 * Mask git token in log lines.
 */
function maskToken(line, token) {
    if (!token) return line;
    return line.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***');
}

// ─── Register Handlers ────────────────────────────────────────────────────────

function registerHandlers(ipcMain, win, sshManager) {

    // ── Config IPC Handlers ──────────────────────────────────────────────────

    ipcMain.handle('deploy:get-servers', () => {
        try {
            return getServers();
        } catch {
            return [];
        }
    });

    ipcMain.handle('deploy:save-server', (e, server) => {
        try {
            const saved = upsertServer(server);
            return { ok: true, server: saved };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:delete-server', (e, id) => {
        try {
            if (sshManager.isConnected(id)) {
                sshManager.disconnect(id);
            }
            deleteServer(id);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:save-project', (e, serverId, project) => {
        try {
            const saved = upsertProject(serverId, project);
            return { ok: true, project: saved };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:delete-project', (e, serverId, projectId) => {
        try {
            deleteProject(serverId, projectId);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:get-git-config', () => {
        try {
            return getGitConfig();
        } catch {
            return { username: '', token: '' };
        }
    });

    ipcMain.handle('deploy:save-git-config', (e, config) => {
        try {
            saveGitConfig(config);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:get-do-config', () => {
        try {
            return getDoConfig();
        } catch {
            return { token: '' };
        }
    });

    ipcMain.handle('deploy:save-do-config', (e, config) => {
        try {
            saveDoConfig(config);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── SSH Connection IPC Handlers ──────────────────────────────────────────

    ipcMain.handle('deploy:connect-server', async (e, serverId) => {
        try {
            const server = resolveServer(serverId);
            if (!server) return { ok: false, error: `Server ${serverId} not found in config.` };
            await sshManager.connect(server);
            return { ok: true, serverId };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:disconnect-server', (e, serverId) => {
        try {
            sshManager.disconnect(serverId);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── File Browse IPC Handlers (for SSH key & local path pickers) ──────────

    ipcMain.handle('deploy:browse-file', async (e, options = {}) => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog(win, {
            title: options.title ?? 'Select File',
            properties: ['openFile'],
            filters: options.filters ?? [],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('deploy:browse-folder', async (e, options = {}) => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog(win, {
            title: options.title ?? 'Select Folder',
            properties: ['openDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('deploy:browse-server-dir', async (e, serverId, dirPath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const cmd = `ls -1p "${dirPath}" 2>/dev/null | grep '/' | sed 's|/||' | head -200`;
            const result = await sshManager.exec(serverId, cmd);
            const dirs = (result.stdout || '').split('\n').map(d => d.trim()).filter(Boolean);
            return { ok: true, dirs, path: dirPath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:read-git-remote', async (e, serverId, dirPath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const cmd = `git -C "${dirPath}" remote get-url origin 2>/dev/null; echo "---"; git -C "${dirPath}" rev-parse --abbrev-ref HEAD 2>/dev/null`;
            const result = await sshManager.exec(serverId, cmd);
            if (result.code !== 0 && !result.stdout) {
                return { ok: false, error: 'Not a git repository or git not installed.' };
            }
            const parts = (result.stdout || '').split('---');
            const remoteUrl = (parts[0] || '').trim();
            const branch = (parts[1] || '').trim();
            if (!remoteUrl) return { ok: false, error: 'No remote origin configured.' };
            return { ok: true, remoteUrl, branch };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:scan-projects', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected. Test connection first.');
            const { scanServer } = require('../../services/serverScanner');
            const results = await scanServer(serverId, sshManager, (msg) => {
                // Send scan log to renderer
                if (win && !win.isDestroyed()) {
                    win.webContents.send('deploy:scan-log', msg);
                }
            });
            return { ok: true, ...results };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
}

module.exports = {
    registerHandlers,
    // Export helpers for use by other handler modules
    resolveServer,
    resolveProject,
    maskToken,
};
