'use strict';
/**
 * ipc/cf/cfTunnelHandlers.js
 *
 * IPC handlers for Cloudflare Tunnel management:
 * - List CF accounts (needed for tunnel API)
 * - List tunnels, tunnel details, tunnel config (ingress)
 * - Create tunnel, update tunnel config, delete tunnel
 */

const axios = require('axios');
const { cfHeaders, CF_API } = require('./cfAccountHandlers');

function registerHandlers(ipcMain, win) {

    // ── List CF Accounts (for tunnel API) ─────────────────────────────────────

    ipcMain.handle('cf:list-cf-accounts', async (e, account) => {
        try {
            const { data } = await axios.get(`${CF_API}/accounts`, {
                headers: cfHeaders(account),
                params: { per_page: 50 },
            });
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to list CF accounts' };
            }
            return {
                ok: true,
                cfAccounts: data.result.map(a => ({
                    id: a.id, name: a.name, type: a.type,
                })),
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── List Tunnels ──────────────────────────────────────────────────────────

    ipcMain.handle('cf:list-tunnels', async (e, { account, accountId }) => {
        try {
            const { data } = await axios.get(
                `${CF_API}/accounts/${accountId}/cfd_tunnel`,
                {
                    headers: cfHeaders(account),
                    params: { per_page: 100, is_deleted: false },
                },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to list tunnels' };
            }
            return {
                ok: true,
                tunnels: data.result.map(t => ({
                    id: t.id, name: t.name, status: t.status,
                    createdAt: t.created_at,
                    connsActiveAt: t.connections?.length > 0
                        ? t.connections[0]?.opened_at ?? null
                        : null,
                    connections: (t.connections ?? []).map(c => ({
                        id: c.id, connIndex: c.conn_index ?? null,
                        clientId: c.client_id ?? null, clientVersion: c.client_version ?? null,
                        originIp: c.origin_ip ?? null, openedAt: c.opened_at ?? null,
                        coloName: c.colo_name ?? null,
                        isPendingReconnect: c.is_pending_reconnect ?? false,
                    })),
                    remoteConfig: t.remote_config ?? false,
                })),
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Create Tunnel ─────────────────────────────────────────────────────────

    ipcMain.handle('cf:create-tunnel', async (e, { account, accountId, name, tunnelSecret }) => {
        try {
            const { data } = await axios.post(
                `${CF_API}/accounts/${accountId}/cfd_tunnel`,
                { name, tunnel_secret: tunnelSecret, config_src: 'cloudflare' },
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to create tunnel' };
            }
            return {
                ok: true,
                tunnel: {
                    id: data.result.id, name: data.result.name,
                    token: data.result.token ?? null,
                },
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Tunnel Details ────────────────────────────────────────────────────────

    ipcMain.handle('cf:tunnel-details', async (e, { account, accountId, tunnelId }) => {
        try {
            const { data } = await axios.get(
                `${CF_API}/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to get tunnel' };
            }
            return { ok: true, tunnel: data.result };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Tunnel Configuration (ingress rules) ──────────────────────────────────

    ipcMain.handle('cf:tunnel-config', async (e, { account, accountId, tunnelId }) => {
        try {
            const { data } = await axios.get(
                `${CF_API}/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`,
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to get config' };
            }
            return { ok: true, config: data.result?.config ?? data.result };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Update Tunnel Configuration ───────────────────────────────────────────

    ipcMain.handle('cf:update-tunnel-config', async (e, { account, accountId, tunnelId, config }) => {
        try {
            const { data } = await axios.put(
                `${CF_API}/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`,
                { config },
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to update config' };
            }
            return { ok: true, config: data.result?.config ?? data.result };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Delete Tunnel ─────────────────────────────────────────────────────────

    ipcMain.handle('cf:delete-tunnel', async (e, { account, accountId, tunnelId }) => {
        try {
            const { data } = await axios.delete(
                `${CF_API}/accounts/${accountId}/cfd_tunnel/${tunnelId}`,
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to delete tunnel' };
            }
            return { ok: true };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });
}

module.exports = { registerHandlers };
