'use strict';
/**
 * src/main/services/configStore.js
 * Migrated from: shared/configStore.js (legacy root)
 *
 * Single source of truth for config encryption and I/O.
 * AES-256-CBC encrypted JSON stored in targets.enc.
 *
 * CONFIG_PATH is set by src/main/index.js at startup via:
 *   global.CONFIG_PATH = path.join(app.getPath('userData'), 'targets.enc')
 */

const crypto = require('crypto');
const fs = require('fs');

// ─── Encryption constants ──────────────────────────────────────────────────────
const ALGO = 'aes-256-cbc';
const ENC_KEY = crypto.createHash('sha256')
    .update('DOGCP_FiReWaLl_2025_S3cur3_K3y_V')
    .digest(); // 32-byte key

// ─── Encryption helpers ────────────────────────────────────────────────────────

function encrypt(plainText) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, ENC_KEY, iv);
    const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, enc]).toString('base64'); // iv[16] + ciphertext → base64
}

function decrypt(base64Text) {
    const buf = Buffer.from(base64Text, 'base64');
    const iv = buf.subarray(0, 16);
    const enc = buf.subarray(16);
    const decipher = crypto.createDecipheriv(ALGO, ENC_KEY, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

// ─── Config path ───────────────────────────────────────────────────────────────

/**
 * Returns the resolved config file path.
 * main/index.js sets global.CONFIG_PATH after app.whenReady().
 */
function getConfigPath() {
    return global.CONFIG_PATH;
}

// ─── Low-level config read/write ───────────────────────────────────────────────

/**
 * Read the full config object from targets.enc.
 * Returns a plain object. If the file is missing or corrupt, returns {}.
 * Maintains backward compat: if existing data is an Array (legacy Feature-1
 * format), wraps it automatically so we never break old installs.
 */
function readFullConfig() {
    const configPath = getConfigPath();
    if (!configPath || !fs.existsSync(configPath)) {
        return {};
    }
    try {
        const raw = fs.readFileSync(configPath, 'utf8').trim();
        const json = (raw.startsWith('[') || raw.startsWith('{')) ? raw : decrypt(raw);
        const parsed = JSON.parse(json);
        // Legacy: Feature-1 stored an Array at top level → migrate wrapper
        if (Array.isArray(parsed)) {
            return { firewalls: parsed };
        }
        return parsed;
    } catch {
        return {};
    }
}

/**
 * Write full config object back to targets.enc (AES-256-CBC encrypted).
 */
function writeFullConfig(config) {
    const configPath = getConfigPath();
    if (!configPath) throw new Error('CONFIG_PATH not initialized yet.');
    fs.writeFileSync(configPath, encrypt(JSON.stringify(config, null, 2)), 'utf8');
}

// ─── Deploy-specific convenience helpers ───────────────────────────────────────

/**
 * Get the list of deploy servers from config.
 * Returns [] if none exist.
 */
function getServers() {
    const config = readFullConfig();
    return config.servers ?? [];
}

/**
 * Find a server by ID within a servers array.
 * Throws if not found.
 * @param {Array} servers — from getServers() or readFullConfig().servers
 * @param {string} serverId
 * @returns {{ server: object, idx: number }}
 */
function findServer(servers, serverId) {
    const idx = servers.findIndex(s => s.id === serverId);
    if (idx === -1) throw new Error(`Server not found: ${serverId}`);
    return { server: servers[idx], idx };
}

/**
 * Get the global git config (username + token).
 * Returns defaults if not set.
 */
function getGitConfig() {
    const config = readFullConfig();
    return config.git ?? { username: '', token: '' };
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
    // Crypto
    encrypt,
    decrypt,
    ALGO,
    ENC_KEY,
    // Config I/O
    getConfigPath,
    readFullConfig,
    writeFullConfig,
    // Deploy helpers
    getServers,
    findServer,
    getGitConfig,
};
