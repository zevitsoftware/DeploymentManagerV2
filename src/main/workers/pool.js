'use strict';
/**
 * src/main/workers/pool.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Piscina Worker Thread Pool Manager
 *
 * Worker files (healthWorker.js, bulkApiWorker.js) are listed under
 * asarUnpack in electron-builder.yml so they land on the real filesystem
 * inside the app.asar.unpacked/ directory — Piscina can only spawn threads
 * against real on-disk paths; files inside the .asar VFS will not work.
 *
 * Pools are created LAZILY (on first use) to avoid resolving __dirname
 * before Electron's app-ready event fires, which would break the portable
 * NSIS wrapper.
 *
 * Usage in IPC handlers (main process):
 *   const { getHealthPool, getBulkApiPool } = require('./workers/pool');
 *   const result = await getHealthPool().run({ host, port, username, ... });
 *
 * IMPORTANT: Workers are lazy — Piscina doesn't start threads until the first
 * run() call. minThreads=1 keeps one warm thread available after first use.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Piscina } = require('piscina');
const path = require('path');

// ── Lazy Pool Instances ───────────────────────────────────────────────────────
// Pools are created on first access so that __dirname is resolved after the
// Electron app is ready (avoiding the asar-path issue in portable mode).

let _healthPool = null;
let _bulkApiPool = null;

/**
 * Resolve the real on-disk path for a worker file.
 * In a packaged app the worker is in app.asar.unpacked (due to asarUnpack).
 * Node.js worker_threads bypasses Electron's asar VFS, so we must explicitly
 * redirect from app.asar/ → app.asar.unpacked/ when running packaged.
 */
function workerPath(filename) {
    const resolved = path.resolve(__dirname, filename);
    // In packaged mode __dirname is inside app.asar — rewrite to unpacked path
    return resolved.replace(/app\.asar([/\\])/, 'app.asar.unpacked$1');
}

// ── Health Check Pool ─────────────────────────────────────────────────────────
// Used for parallel SSH server health polling (CPU / RAM / Disk stats).
// Each task opens its own transient SSH connection so it is fully isolated.

function getHealthPool() {
    if (!_healthPool) {
        _healthPool = new Piscina({
            filename: workerPath('healthWorker.js'),
            name: 'health',
            minThreads: 1,
            maxThreads: 6,           // up to 6 servers polled in parallel
            idleTimeout: 30_000,     // reclaim idle threads after 30s
            maxQueue: 'auto',        // queue depth = maxThreads × 2
            recordTiming: false,
        });
    }
    return _healthPool;
}

// ── Bulk API Pool ─────────────────────────────────────────────────────────────
// Used for batch WHOIS lookups and DNS resolution (no SSH needed).
// Tasks are pure Node.js + network calls — safe to parallelise.

function getBulkApiPool() {
    if (!_bulkApiPool) {
        _bulkApiPool = new Piscina({
            filename: workerPath('bulkApiWorker.js'),
            name: 'bulkApi',
            minThreads: 1,
            maxThreads: 4,
            idleTimeout: 60_000,
            maxQueue: 'auto',
            recordTiming: false,
        });
    }
    return _bulkApiPool;
}

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// Drain pools when Electron is about to quit so worker threads are not left
// hanging open. Call this from the main process 'before-quit' handler.

async function destroyPools() {
    await Promise.allSettled([
        _healthPool ? _healthPool.destroy() : Promise.resolve(),
        _bulkApiPool ? _bulkApiPool.destroy() : Promise.resolve(),
    ]);
}

module.exports = { getHealthPool, getBulkApiPool, destroyPools };
