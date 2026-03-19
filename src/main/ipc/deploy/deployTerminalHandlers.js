'use strict';
/**
 * ipc/deploy/deployTerminalHandlers.js
 *
 * IPC handlers for:
 * - SSH terminal (open, input, resize, close, data forwarding)
 * - Nginx domain management (scan, enable, disable, remove, add, get config, split)
 */

const { resolveServer } = require('./deployConfigHandlers');

function registerHandlers(ipcMain, win, sshManager) {

    // ── Terminal IPC Handlers ────────────────────────────────────────────────

    ipcMain.handle('deploy:terminal-open', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) {
                return { ok: false, error: 'Server not connected. Connect first.' };
            }
            await sshManager.openShell(serverId, { cols: 120, rows: 30 });
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // Terminal input comes as fire-and-forget (ipcMain.on, not handle)
    ipcMain.on('deploy:terminal-input', (e, serverId, data) => {
        sshManager.writeShell(serverId, data);
    });

    ipcMain.on('deploy:terminal-resize', (e, serverId, dims) => {
        sshManager.resizeShell(serverId, dims);
    });

    ipcMain.handle('deploy:terminal-close', (e, serverId) => {
        try {
            sshManager.closeShell(serverId);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Nginx IPC Handlers ────────────────────────────────────────────────────

    ipcMain.handle('deploy:nginx-domains', async (e, serverId) => {
        try {
            if (!sshManager.isConnected(serverId)) {
                throw new Error('Server not connected.');
            }
            const { scanNginxDomains } = require('../../services/nginxParser');
            const result = await scanNginxDomains(serverId, sshManager);
            // scanNginxDomains returns { enabled, available } — flatten into a single domains array
            const domains = [
                ...(result.enabled ?? []).map(d => ({
                    ...d,
                    serverName: d.name,
                    listen: d.ports?.join(', ') ?? '',
                    enabled: true,
                })),
                ...(result.available ?? []).map(d => ({
                    ...d,
                    serverName: d.name,
                    listen: d.ports?.join(', ') ?? '',
                    enabled: false,
                })),
            ];
            return { ok: true, domains };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:nginx-enable-domain', async (e, serverId, fileName) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const server = resolveServer(serverId);
            const { enableDomain } = require('../../services/nginxParser');
            return await enableDomain(serverId, sshManager, fileName, server?.sudoPassword);
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:nginx-disable-domain', async (e, serverId, fileName) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const server = resolveServer(serverId);
            const { disableDomain } = require('../../services/nginxParser');
            return await disableDomain(serverId, sshManager, fileName, server?.sudoPassword);
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:nginx-remove-domain', async (e, serverId, fileName) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const server = resolveServer(serverId);
            const { removeDomain } = require('../../services/nginxParser');
            return await removeDomain(serverId, sshManager, fileName, server?.sudoPassword);
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:nginx-add-domain', async (e, serverId, fileName, content) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const server = resolveServer(serverId);
            const { addDomain } = require('../../services/nginxParser');
            return await addDomain(serverId, sshManager, fileName, content, server?.sudoPassword);
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:nginx-get-config', async (e, serverId, fileName) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const { getDomainConfig } = require('../../services/nginxParser');
            const content = await getDomainConfig(serverId, sshManager, fileName);
            return { ok: true, content };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('deploy:nginx-split-config', async (e, serverId, fileName) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const server = resolveServer(serverId);
            const { splitConfigFile } = require('../../services/nginxParser');
            return await splitConfigFile(serverId, sshManager, fileName, server?.sudoPassword);
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    // ── Forward shell data from sshManager → renderer ───────────────────────
    sshManager.on('shell-data', (serverId, data) => {
        if (!win || win.isDestroyed()) return;
        win.webContents.send('deploy:terminal-data', serverId, data);
    });

    // ── Cleanup on app quit ──────────────────────────────────────────────────
    const { app } = require('electron');
    app.on('before-quit', () => {
        sshManager.disconnectAll();
    });
}

module.exports = { registerHandlers };
