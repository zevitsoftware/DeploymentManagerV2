'use strict';
/**
 * ipc/db/dbConfigHandlers.js
 *
 * IPC handlers for Database connection CRUD operations.
 * Covers: get connections list, save/delete connection.
 */

const { readFullConfig, writeFullConfig } = require('../../services/configStore');

// ─── Active client references (shared across db handler modules) ──────────────
// This Map tracks open DB connections for cleanup on deletions and quit.
const activeClients = new Map(); // connId → { type, client }

/**
 * Close and remove an active database client.
 */
function _closeClient(connId) {
    const entry = activeClients.get(connId);
    if (!entry) return;
    try {
        if (entry.type === 'mysql' && entry.client) entry.client.end();
        if (entry.type === 'pgsql' && entry.client) entry.client.end();
        if (entry.type === 'mongodb' && entry.client) entry.client.close();
        if (entry.type === 'redis' && entry.client) entry.client.quit();
    } catch { /* ignore */ }
    activeClients.delete(connId);
}

/**
 * Resolve a connection object by ID (includes raw password for driver use).
 */
function _resolveConnection(connId) {
    const config = readFullConfig();
    return (config.dbConnections ?? []).find(c => c.id === connId) ?? null;
}

function registerHandlers(ipcMain, win) {

    ipcMain.handle('db:get-connections', () => {
        try {
            const config = readFullConfig();
            const conns = config.dbConnections ?? [];
            // Strip passwords before sending to renderer
            return conns.map(c => ({ ...c, password: c.password ? '••••••' : '' }));
        } catch {
            return [];
        }
    });

    ipcMain.handle('db:save-connection', (e, connObj) => {
        try {
            const config = readFullConfig();
            const conns = config.dbConnections ?? [];
            if (!connObj.id) {
                connObj.id = `dbc_${Date.now()}`;
                conns.push(connObj);
            } else {
                const idx = conns.findIndex(c => c.id === connObj.id);
                if (idx >= 0) {
                    // Preserve password if placeholder sent from renderer
                    if (connObj.password === '••••••') {
                        connObj.password = conns[idx].password;
                    }
                    conns[idx] = connObj;
                } else {
                    conns.push(connObj);
                }
            }
            config.dbConnections = conns;
            writeFullConfig(config);
            return { ok: true, connection: { ...connObj, password: connObj.password ? '••••••' : '' } };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('db:delete-connection', (e, connId) => {
        try {
            const config = readFullConfig();
            config.dbConnections = (config.dbConnections ?? []).filter(c => c.id !== connId);
            writeFullConfig(config);
            if (activeClients.has(connId)) {
                _closeClient(connId);
            }
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });
}

module.exports = {
    registerHandlers,
    // Export helpers for other db modules
    activeClients,
    _closeClient,
    _resolveConnection,
};
