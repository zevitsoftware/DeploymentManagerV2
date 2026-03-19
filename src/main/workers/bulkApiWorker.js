'use strict';
/**
 * src/main/workers/bulkApiWorker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Piscina Worker Thread — Bulk DNS / WHOIS Resolution
 *
 * Runs in a separate Node.js worker thread. No SSH. Pure network calls.
 * Suitable for resolving large batches of domains without blocking the main
 * process event loop.
 *
 * Input { task, ...params }:
 *
 *   task: 'whois'
 *     domains: string[]   — list of domain names to WHOIS
 *     apiKey?: string     — WHOIS API key (https://www.whoisxmlapi.com)
 *   → returns: { ok, results: [{ domain, registrar, expiresAt, createdAt, raw }] }
 *
 *   task: 'dns'
 *     domains: string[]   — list of domain names to resolve
 *     types?: string[]    — DNS record types to query (default: ['A','CNAME','MX','NS','TXT'])
 *   → returns: { ok, results: [{ domain, records: { A:[], CNAME:[], ... } }] }
 *
 *   task: 'ping'
 *     hosts: string[]     — list of hostname/IPs to ping
 *   → returns: { ok, results: [{ host, alive, rtt }] }
 *
 * All tasks process entries in parallel using Promise.allSettled() so a
 * single failure doesn't abort the rest.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const net = require('net');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * A minimal HTTP/HTTPS GET helper that works inside a worker thread
 * (no axios — keep worker deps minimal).
 */
function httpGet(url, { timeout = 8000 } = {}) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        req.on('error', reject);
    });
}

/**
 * TCP ping — connects to host:port and measures round-trip time.
 * Port defaults to 80 for HTTPS, 443 for domains that don't resolve port 80.
 */
function tcpPing(host, port = 80, timeout = 5000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.connect(port, host, () => {
            const rtt = Date.now() - start;
            socket.destroy();
            resolve({ alive: true, rtt });
        });

        socket.on('error', () => {
            socket.destroy();
            resolve({ alive: false, rtt: -1 });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ alive: false, rtt: -1 });
        });
    });
}

// ── Task: WHOIS ───────────────────────────────────────────────────────────────

async function doWhois(domain, apiKey) {
    try {
        if (!apiKey) {
            // Fallback: try a free WHOIS API
            const url = `https://www.whois.com/whois/${encodeURIComponent(domain)}`;
            // Without a key we can only return partial info
            return { domain, registrar: null, expiresAt: null, createdAt: null, raw: 'No API key configured', error: null };
        }

        const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;
        const { status, body } = await httpGet(url);

        if (status !== 200) {
            return { domain, registrar: null, expiresAt: null, createdAt: null, raw: null, error: `HTTP ${status}` };
        }

        let parsed;
        try { parsed = JSON.parse(body); } catch {
            return { domain, registrar: null, expiresAt: null, createdAt: null, raw: body.substring(0, 500), error: 'JSON parse error' };
        }

        const record = parsed?.WhoisRecord ?? {};
        const registryData = record.registryData ?? {};

        return {
            domain,
            registrar: record.registrarName ?? registryData.registrarName ?? null,
            expiresAt: record.expiresDate ?? registryData.expiresDate ?? null,
            createdAt: record.createdDate ?? registryData.createdDate ?? null,
            updatedAt: record.updatedDate ?? registryData.updatedDate ?? null,
            nameServers: (record.nameServers?.hostNames ?? []).slice(0, 4),
            status: record.status ?? null,
            raw: null,
            error: null,
        };
    } catch (err) {
        return { domain, registrar: null, expiresAt: null, createdAt: null, raw: null, error: err.message };
    }
}

// ── Task: DNS ─────────────────────────────────────────────────────────────────

async function doDnsResolve(domain, types = ['A', 'CNAME', 'MX', 'NS', 'TXT']) {
    const records = {};

    await Promise.allSettled(
        types.map(async (type) => {
            try {
                const method = `resolve${type === 'A' ? '4' : type === 'AAAA' ? '6' : type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}`;
                if (typeof dns[method] !== 'function') {
                    // Fallback to generic resolve
                    const result = await dns.resolve(domain, type);
                    records[type] = result;
                } else {
                    const result = await dns[method](domain);
                    records[type] = result;
                }
            } catch (err) {
                if (err.code === 'ENODATA' || err.code === 'ENOTFOUND') {
                    records[type] = [];
                } else {
                    records[type] = { error: err.message };
                }
            }
        })
    );

    return { domain, records };
}

// ── Task: Ping ────────────────────────────────────────────────────────────────

async function doPing(host) {
    // Try port 80 first, then 443
    let result = await tcpPing(host, 80, 4000);
    if (!result.alive) {
        result = await tcpPing(host, 443, 4000);
    }
    return { host, ...result };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Piscina calls this function with the task input object.
 */
module.exports = async function bulkApiWorker({ task, ...params }) {
    if (task === 'whois') {
        const { domains = [], apiKey = null } = params;
        const settled = await Promise.allSettled(
            domains.map(d => doWhois(d, apiKey))
        );
        const results = settled.map((s, i) => {
            if (s.status === 'fulfilled') return s.value;
            return { domain: domains[i], error: s.reason?.message ?? 'unknown error' };
        });
        return { ok: true, results };
    }

    if (task === 'dns') {
        const { domains = [], types } = params;
        const settled = await Promise.allSettled(
            domains.map(d => doDnsResolve(d, types))
        );
        const results = settled.map((s, i) => {
            if (s.status === 'fulfilled') return s.value;
            return { domain: domains[i], records: {}, error: s.reason?.message ?? 'unknown error' };
        });
        return { ok: true, results };
    }

    if (task === 'ping') {
        const { hosts = [] } = params;
        const settled = await Promise.allSettled(
            hosts.map(h => doPing(h))
        );
        const results = settled.map((s, i) => {
            if (s.status === 'fulfilled') return s.value;
            return { host: hosts[i], alive: false, rtt: -1, error: s.reason?.message ?? 'unknown error' };
        });
        return { ok: true, results };
    }

    return { ok: false, error: `Unknown task: ${task}` };
};
