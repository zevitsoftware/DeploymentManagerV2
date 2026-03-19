'use strict';
/**
 * ipc/cf/cfDnsHandlers.js
 *
 * IPC handlers for Cloudflare DNS record management:
 * - List DNS records (with type/name filters, pagination)
 * - Create DNS record
 * - Update DNS record (PATCH)
 * - Delete DNS record
 */

const axios = require('axios');
const { cfHeaders, CF_API } = require('./cfAccountHandlers');

function registerHandlers(ipcMain, win) {

    // ── List DNS Records ──────────────────────────────────────────────────────

    ipcMain.handle('cf:list-dns', async (e, { account, zoneId, type, name, page = 1, perPage = 100 }) => {
        try {
            const params = { page, per_page: perPage, order: 'type', direction: 'asc' };
            if (type) params.type = type;
            if (name) params.name = name;

            const { data } = await axios.get(`${CF_API}/zones/${zoneId}/dns_records`, {
                headers: cfHeaders(account),
                params,
            });

            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to list DNS records' };
            }

            return {
                ok: true,
                records: data.result.map(r => ({
                    id: r.id, type: r.type, name: r.name, content: r.content,
                    proxied: r.proxied ?? false, proxiable: r.proxiable ?? false,
                    ttl: r.ttl, priority: r.priority ?? null,
                    comment: r.comment ?? '',
                    createdOn: r.created_on, modifiedOn: r.modified_on,
                })),
                totalCount: data.result_info?.total_count ?? data.result.length,
                totalPages: data.result_info?.total_pages ?? 1,
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Create DNS Record ─────────────────────────────────────────────────────

    ipcMain.handle('cf:create-dns', async (e, { account, zoneId, record }) => {
        try {
            const payload = {
                type: record.type, name: record.name, content: record.content,
                ttl: record.ttl ?? 1, proxied: record.proxied ?? false,
            };
            if (record.priority != null) payload.priority = record.priority;
            if (record.comment) payload.comment = record.comment;

            const { data } = await axios.post(
                `${CF_API}/zones/${zoneId}/dns_records`,
                payload,
                { headers: cfHeaders(account) },
            );

            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to create record' };
            }
            return { ok: true, record: data.result };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Update DNS Record ─────────────────────────────────────────────────────

    ipcMain.handle('cf:update-dns', async (e, { account, zoneId, recordId, record }) => {
        try {
            const payload = {
                type: record.type, name: record.name, content: record.content,
                ttl: record.ttl ?? 1, proxied: record.proxied ?? false,
            };
            if (record.priority != null) payload.priority = record.priority;
            if (record.comment) payload.comment = record.comment;

            const { data } = await axios.patch(
                `${CF_API}/zones/${zoneId}/dns_records/${recordId}`,
                payload,
                { headers: cfHeaders(account) },
            );

            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to update record' };
            }
            return { ok: true, record: data.result };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Delete DNS Record ─────────────────────────────────────────────────────

    ipcMain.handle('cf:delete-dns', async (e, { account, zoneId, recordId }) => {
        try {
            const { data } = await axios.delete(
                `${CF_API}/zones/${zoneId}/dns_records/${recordId}`,
                { headers: cfHeaders(account) },
            );

            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to delete record' };
            }
            return { ok: true };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });
}

module.exports = { registerHandlers };
