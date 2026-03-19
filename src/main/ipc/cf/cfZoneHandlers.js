'use strict';
/**
 * ipc/cf/cfZoneHandlers.js
 *
 * IPC handlers for Cloudflare zone (domain) management:
 * - List zones, add zone, delete zone, zone details
 * - Zone settings, analytics, purge cache, dev mode toggle
 */

const axios = require('axios');
const { cfHeaders, CF_API } = require('./cfAccountHandlers');

function registerHandlers(ipcMain, win) {

    // ── List Zones ────────────────────────────────────────────────────────────

    ipcMain.handle('cf:list-zones', async (e, account) => {
        try {
            const allZones = [];
            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                const { data } = await axios.get(`${CF_API}/zones`, {
                    headers: cfHeaders(account),
                    params: { page, per_page: 50, order: 'name', direction: 'asc' },
                });
                if (!data.success) {
                    return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to list zones' };
                }
                allZones.push(...data.result.map(z => ({
                    id: z.id, name: z.name, status: z.status, paused: z.paused,
                    type: z.type, plan: z.plan?.name ?? 'Unknown',
                    nameservers: z.name_servers ?? [], originalNS: z.original_name_servers ?? [],
                    createdOn: z.created_on, modifiedOn: z.modified_on,
                })));
                totalPages = data.result_info?.total_pages ?? 1;
                page++;
            }

            return { ok: true, zones: allZones };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Add Zone ──────────────────────────────────────────────────────────────

    ipcMain.handle('cf:add-zone', async (e, { account, domain, accountId }) => {
        try {
            const body = { name: domain, type: 'full' };
            if (accountId) body.account = { id: accountId };
            const { data } = await axios.post(`${CF_API}/zones`, body, {
                headers: cfHeaders(account),
            });
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to add zone' };
            }
            return {
                ok: true,
                zone: {
                    id: data.result.id, name: data.result.name,
                    status: data.result.status, nameservers: data.result.name_servers ?? [],
                },
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Delete Zone ───────────────────────────────────────────────────────────

    ipcMain.handle('cf:delete-zone', async (e, { account, zoneId }) => {
        try {
            const { data } = await axios.delete(`${CF_API}/zones/${zoneId}`, {
                headers: cfHeaders(account),
            });
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to delete zone' };
            }
            return { ok: true };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Zone Details ──────────────────────────────────────────────────────────

    ipcMain.handle('cf:zone-details', async (e, { account, zoneId }) => {
        try {
            const { data } = await axios.get(`${CF_API}/zones/${zoneId}`, {
                headers: cfHeaders(account),
            });
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to get zone' };
            }
            const z = data.result;
            return {
                ok: true,
                zone: {
                    id: z.id, name: z.name, status: z.status, paused: z.paused,
                    type: z.type, plan: z.plan?.name ?? 'Unknown',
                    nameservers: z.name_servers ?? [], originalNS: z.original_name_servers ?? [],
                    createdOn: z.created_on, modifiedOn: z.modified_on, meta: z.meta ?? {},
                },
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Purge Cache ───────────────────────────────────────────────────────────

    ipcMain.handle('cf:purge-cache', async (e, { account, zoneId, purgeEverything = true }) => {
        try {
            const { data } = await axios.post(
                `${CF_API}/zones/${zoneId}/purge_cache`,
                { purge_everything: purgeEverything },
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Purge failed' };
            }
            return { ok: true };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Toggle Development Mode ───────────────────────────────────────────────

    ipcMain.handle('cf:dev-mode', async (e, { account, zoneId, enabled }) => {
        try {
            const { data } = await axios.patch(
                `${CF_API}/zones/${zoneId}/settings/development_mode`,
                { value: enabled ? 'on' : 'off' },
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to toggle dev mode' };
            }
            return { ok: true, value: data.result?.value };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Zone Settings ─────────────────────────────────────────────────────────

    ipcMain.handle('cf:zone-settings', async (e, { account, zoneId }) => {
        try {
            const { data } = await axios.get(
                `${CF_API}/zones/${zoneId}/settings`,
                { headers: cfHeaders(account) },
            );
            if (!data.success) {
                return { ok: false, error: data.errors?.[0]?.message ?? 'Failed to get settings' };
            }
            const settings = {};
            for (const s of data.result) {
                settings[s.id] = s.value;
            }
            return { ok: true, settings };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            return { ok: false, error: msg };
        }
    });

    // ── Zone Analytics (GraphQL API — the legacy /analytics/dashboard is deprecated) ──

    ipcMain.handle('cf:zone-analytics', async (e, { account, zoneId, since = '-1440' }) => {
        try {
            // Convert legacy "since" minutes to ISO date range
            const sinceMinutes = Math.abs(parseInt(since, 10)) || 1440;
            const now = new Date();
            const start = new Date(now.getTime() - sinceMinutes * 60 * 1000);
            const dateStart = start.toISOString().slice(0, 10);
            const dateEnd   = now.toISOString().slice(0, 10);
            // DNS adaptive datasets have a max 7-day range
            const dnsStart = new Date(now.getTime() - Math.min(sinceMinutes, 10080) * 60 * 1000);
            const dnsDateStart = dnsStart.toISOString().slice(0, 10);

            const query = `query {
              viewer {
                zones(filter: { zoneTag: "${zoneId}" }) {

                  # HTTP daily aggregate
                  httpDaily: httpRequests1dGroups(
                    limit: 60
                    filter: { date_geq: "${dateStart}", date_leq: "${dateEnd}" }
                    orderBy: [date_ASC]
                  ) {
                    dimensions { date }
                    sum {
                      requests cachedRequests bytes cachedBytes
                      threats pageViews encryptedRequests encryptedBytes
                    }
                    uniq { uniques }
                  }

                  # HTTP by country
                  httpByCountry: httpRequests1dGroups(
                    limit: 25
                    filter: { date_geq: "${dateStart}", date_leq: "${dateEnd}" }
                    orderBy: [sum_requests_DESC]
                  ) {
                    dimensions { date }
                    sum { requests bytes countryMap { clientCountryName requests bytes } }
                  }

                  # HTTP by content type
                  httpByContentType: httpRequests1dGroups(
                    limit: 25
                    filter: { date_geq: "${dateStart}", date_leq: "${dateEnd}" }
                    orderBy: [sum_requests_DESC]
                  ) {
                    sum { contentTypeMap { edgeResponseContentTypeName requests bytes } }
                  }

                  # HTTP by status
                  httpByStatus: httpRequests1dGroups(
                    limit: 25
                    filter: { date_geq: "${dateStart}", date_leq: "${dateEnd}" }
                  ) {
                    sum { responseStatusMap { edgeResponseStatus requests } }
                  }

                  # DNS Analytics (max 7 day range for adaptive datasets)
                  dnsDaily: dnsAnalyticsAdaptiveGroups(
                    limit: 60
                    filter: { date_geq: "${dnsDateStart}", date_leq: "${dateEnd}" }
                    orderBy: [date_ASC]
                  ) {
                    dimensions { date }
                    count
                  }

                  dnsByName: dnsAnalyticsAdaptiveGroups(
                    limit: 25
                    filter: { date_geq: "${dnsDateStart}", date_leq: "${dateEnd}" }
                    orderBy: [count_DESC]
                  ) {
                    dimensions { queryName }
                    count
                  }

                  dnsByType: dnsAnalyticsAdaptiveGroups(
                    limit: 15
                    filter: { date_geq: "${dnsDateStart}", date_leq: "${dateEnd}" }
                    orderBy: [count_DESC]
                  ) {
                    dimensions { queryType }
                    count
                  }

                  dnsByResponseCode: dnsAnalyticsAdaptiveGroups(
                    limit: 10
                    filter: { date_geq: "${dnsDateStart}", date_leq: "${dateEnd}" }
                    orderBy: [count_DESC]
                  ) {
                    dimensions { responseCode }
                    count
                  }

                }
              }
            }`;

            const { data } = await axios.post(
                `${CF_API}/graphql`,
                { query },
                { headers: cfHeaders(account) },
            );

            if (data.errors?.length) {
                const errMsg = data.errors[0]?.message ?? 'GraphQL analytics error';
                console.log('[cf:zone-analytics] GraphQL error:', errMsg);
                return { ok: false, error: errMsg };
            }

            const z = data.data?.viewer?.zones?.[0] ?? {};

            // -- HTTP totals & timeseries --
            const httpGroups = z.httpDaily ?? [];
            const totals = {
                requests:   { all: 0, cached: 0, uncached: 0 },
                bandwidth:  { all: 0, cached: 0, uncached: 0 },
                threats:    { all: 0 },
                pageviews:  { all: 0 },
                uniques:    { all: 0 },
                encrypted:  { requests: 0, bytes: 0 },
            };
            const timeseries = [];

            for (const g of httpGroups) {
                const s = g.sum;
                const u = g.uniq;
                totals.requests.all     += s.requests ?? 0;
                totals.requests.cached  += s.cachedRequests ?? 0;
                totals.bandwidth.all    += s.bytes ?? 0;
                totals.bandwidth.cached += s.cachedBytes ?? 0;
                totals.threats.all      += s.threats ?? 0;
                totals.pageviews.all    += s.pageViews ?? 0;
                totals.uniques.all      += u?.uniques ?? 0;
                totals.encrypted.requests += s.encryptedRequests ?? 0;
                totals.encrypted.bytes    += s.encryptedBytes ?? 0;

                timeseries.push({
                    since: g.dimensions.date + 'T00:00:00Z',
                    until: g.dimensions.date + 'T23:59:59Z',
                    requests:  { all: s.requests ?? 0, cached: s.cachedRequests ?? 0 },
                    bandwidth: { all: s.bytes ?? 0, cached: s.cachedBytes ?? 0 },
                    threats:   { all: s.threats ?? 0 },
                    pageviews: { all: s.pageViews ?? 0 },
                    uniques:   { all: u?.uniques ?? 0 },
                });
            }
            totals.requests.uncached  = totals.requests.all  - totals.requests.cached;
            totals.bandwidth.uncached = totals.bandwidth.all - totals.bandwidth.cached;

            // -- Country breakdown (merge across days) --
            const countryMap = {};
            for (const g of (z.httpByCountry ?? [])) {
                for (const c of (g.sum?.countryMap ?? [])) {
                    const name = c.clientCountryName || 'Unknown';
                    if (!countryMap[name]) countryMap[name] = { requests: 0, bytes: 0 };
                    countryMap[name].requests += c.requests ?? 0;
                    countryMap[name].bytes    += c.bytes ?? 0;
                }
            }
            const countries = Object.entries(countryMap)
                .map(([name, d]) => ({ name, ...d }))
                .sort((a, b) => b.requests - a.requests)
                .slice(0, 15);

            // -- Content type breakdown (merge across days) --
            const ctMap = {};
            for (const g of (z.httpByContentType ?? [])) {
                for (const c of (g.sum?.contentTypeMap ?? [])) {
                    const name = c.edgeResponseContentTypeName || 'other';
                    if (!ctMap[name]) ctMap[name] = { requests: 0, bytes: 0 };
                    ctMap[name].requests += c.requests ?? 0;
                    ctMap[name].bytes    += c.bytes ?? 0;
                }
            }
            const contentTypes = Object.entries(ctMap)
                .map(([name, d]) => ({ name, ...d }))
                .sort((a, b) => b.requests - a.requests)
                .slice(0, 10);

            // -- Status code breakdown (merge across days) --
            const statusMap = {};
            for (const g of (z.httpByStatus ?? [])) {
                for (const c of (g.sum?.responseStatusMap ?? [])) {
                    const code = String(c.edgeResponseStatus ?? 'unknown');
                    statusMap[code] = (statusMap[code] ?? 0) + (c.requests ?? 0);
                }
            }
            const statusCodes = Object.entries(statusMap)
                .map(([code, requests]) => ({ code, requests }))
                .sort((a, b) => b.requests - a.requests);

            // -- DNS analytics (uses "count" not "sum.queryCount") --
            const dnsTimeseries = (z.dnsDaily ?? []).map(g => ({
                date: g.dimensions.date,
                queries: g.count ?? 0,
            }));

            const dnsNames = (z.dnsByName ?? []).map(g => ({
                name: g.dimensions.queryName || 'unknown',
                queries: g.count ?? 0,
            }));

            const dnsTypes = (z.dnsByType ?? []).map(g => ({
                type: g.dimensions.queryType || 'unknown',
                queries: g.count ?? 0,
            }));

            const dnsResponseCodes = (z.dnsByResponseCode ?? []).map(g => ({
                code: g.dimensions.responseCode || 'unknown',
                queries: g.count ?? 0,
            }));

            const dnsTotalQueries = dnsTimeseries.reduce((a, d) => a + d.queries, 0);

            return {
                ok: true,
                analytics: {
                    totals,
                    timeseries,
                    countries,
                    contentTypes,
                    statusCodes,
                    dns: {
                        totalQueries: dnsTotalQueries,
                        timeseries: dnsTimeseries,
                        byName: dnsNames,
                        byType: dnsTypes,
                        byResponseCode: dnsResponseCodes,
                    },
                },
            };
        } catch (err) {
            const msg = err.response?.data?.errors?.[0]?.message || err.message;
            console.log('[cf:zone-analytics] Exception:', msg, 'status:', err.response?.status);
            return { ok: false, error: msg };
        }
    });
}

module.exports = { registerHandlers };
