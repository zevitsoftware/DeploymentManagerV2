'use strict';
/**
 * src/main/workers/pool.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Piscina Worker Thread Pool Manager
 *
 * Exports pre-configured pools for CPU-bound tasks that should NOT block the
 * main process event loop:
 *   · healthPool     — Parallel SSH health checks (CPU/RAM/Disk) across N servers
 *   · bulkApiPool    — Batch WHOIS lookups + DNS resolution
 *
 * Usage in IPC handlers (main process):
 *   const { healthPool } = require('./workers/pool');
 *   const result = await healthPool.run({ host, port, username, ... });
 *
 * IMPORTANT: Workers are lazy — Piscina doesn't start threads until the first
 * run() call. minThreads=1 keeps one warm thread available after first use.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Piscina } = require('piscina');
const path = require('path');

// ── Health Check Pool ─────────────────────────────────────────────────────────
// Used for parallel SSH server health polling (CPU / RAM / Disk stats).
// Each task opens its own transient SSH connection so it is fully isolated.

const healthPool = new Piscina({
    filename: path.resolve(__dirname, 'healthWorker.js'),
    name: 'health',
    minThreads: 1,
    maxThreads: 6,           // up to 6 servers polled in parallel
    idleTimeout: 30_000,     // reclaim idle threads after 30s
    maxQueue: 'auto',        // queue depth = maxThreads × 2
    recordTiming: false,
});

// ── Bulk API Pool ─────────────────────────────────────────────────────────────
// Used for batch WHOIS lookups and DNS resolution (no SSH needed).
// Tasks are pure Node.js + network calls — safe to parallelise.

const bulkApiPool = new Piscina({
    filename: path.resolve(__dirname, 'bulkApiWorker.js'),
    name: 'bulkApi',
    minThreads: 1,
    maxThreads: 4,
    idleTimeout: 60_000,
    maxQueue: 'auto',
    recordTiming: false,
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// Drain pools when Electron is about to quit so worker threads are not left
// hanging open. Call this from the main process 'before-quit' handler.

async function destroyPools() {
    await Promise.allSettled([
        healthPool.destroy(),
        bulkApiPool.destroy(),
    ]);
}

module.exports = { healthPool, bulkApiPool, destroyPools };
