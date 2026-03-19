'use strict';
/**
 * src/main/workers/healthWorker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Piscina Worker Thread — Server Health Check
 *
 * Runs in a separate Node.js worker thread (NOT the main process).
 * Opens a fresh transient SSH connection per task, fetches CPU/RAM/Disk/Load
 * metrics, then closes the connection.
 *
 * Input (from pool.run()):
 *   {
 *     host:       string   — server hostname/IP
 *     port:       number   — SSH port (default 22)
 *     username:   string   — SSH username
 *     password?:  string   — SSH password (if using password auth)
 *     privateKey?: string  — SSH private key content (if using key auth)
 *     passphrase?: string  — key passphrase
 *     serverId:   string   — echoed back in the result for correlation
 *   }
 *
 * Output:
 *   {
 *     ok:       boolean
 *     serverId: string
 *     cpu:      { percent: number }
 *     ram:      { used: number, total: number, percent: number }
 *     disk:     { used: string, total: string, percent: number }
 *     load:     { one: number, five: number, fifteen: number }
 *     uptime:   string
 *     error?:   string
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Client } = require('ssh2');
const fs = require('fs');

/**
 * Execute a command over an already-connected SSH Client.
 * Returns { stdout, stderr, code }.
 */
function exec(conn, cmd) {
    return new Promise((resolve, reject) => {
        conn.exec(cmd, (err, stream) => {
            if (err) return reject(err);
            let stdout = '';
            let stderr = '';
            stream.on('data', d => { stdout += d.toString(); });
            stream.stderr.on('data', d => { stderr += d.toString(); });
            stream.on('close', (code) => resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code }));
        });
    });
}

/**
 * The single exported function that Piscina calls in the worker thread.
 */
module.exports = async function healthCheck({ host, port, username, password, privateKey, privateKeyPath, passphrase, serverId }) {
    const conn = new Client();

    // ── Connect ────────────────────────────────────────────────────────────────
    await new Promise((resolve, reject) => {
        conn.on('ready', resolve);
        conn.on('error', reject);

        const authKey = privateKey
            ? Buffer.from(privateKey)
            : privateKeyPath
                ? (() => { try { return fs.readFileSync(privateKeyPath); } catch { return null; } })()
                : null;

        conn.connect({
            host,
            port: port ?? 22,
            username,
            password: password || undefined,
            privateKey: authKey || undefined,
            passphrase: passphrase || undefined,
            readyTimeout: 8000,
            keepaliveInterval: 0,
        });
    });

    try {
        // ── Combined stats command ─────────────────────────────────────────────
        // Uses vmstat for CPU idle, free -m for RAM, df for disk, uptime for load
        // Delimiter '---' separates sections in stdout
        const statsCmd = [
            "vmstat 1 2 | tail -1 | awk '{print $15}'",   // CPU idle %
            "echo '---'",
            "free -m | awk '/^Mem:/{print $2,$3,$7}'",     // RAM: total used available
            "echo '---'",
            "df -h / | tail -1 | awk '{print $2,$3,$4,$5}'",  // Disk: total used avail %
            "echo '---'",
            "cat /proc/loadavg | awk '{print $1,$2,$3}'",  // Load: 1m 5m 15m
            "echo '---'",
            "uptime -p 2>/dev/null || uptime",             // Uptime
        ].join(' ; ');

        const { stdout, code } = await exec(conn, statsCmd);
        conn.end();

        if (code !== 0 && !stdout) {
            return { ok: false, serverId, error: `SSH command failed (exit ${code})` };
        }

        const sections = stdout.split('---').map(s => s.trim());

        // ── Parse CPU ─────────────────────────────────────────────────────────
        const cpuIdle = parseFloat(sections[0] ?? '0') || 0;
        const cpuPercent = Math.max(0, Math.min(100, Math.round(100 - cpuIdle)));

        // ── Parse RAM ─────────────────────────────────────────────────────────
        const ramParts = (sections[1] ?? '').split(/\s+/);
        const ramTotal = parseInt(ramParts[0], 10) || 1;
        const ramUsed = parseInt(ramParts[1], 10) || 0;
        const ramPercent = Math.round((ramUsed / ramTotal) * 100);

        // ── Parse Disk ────────────────────────────────────────────────────────
        const diskParts = (sections[2] ?? '').split(/\s+/);
        const diskTotal = diskParts[0] || '0G';
        const diskUsed = diskParts[1] || '0G';
        const diskPercent = parseInt((diskParts[3] || '0%').replace('%', ''), 10) || 0;

        // ── Parse Load ────────────────────────────────────────────────────────
        const loadParts = (sections[3] ?? '').split(/\s+/);
        const loadOne = parseFloat(loadParts[0]) || 0;
        const loadFive = parseFloat(loadParts[1]) || 0;
        const loadFifteen = parseFloat(loadParts[2]) || 0;

        // ── Parse Uptime ──────────────────────────────────────────────────────
        const uptime = (sections[4] ?? '').split('\n')[0].trim() || 'unknown';

        return {
            ok: true,
            serverId,
            cpu:   { percent: cpuPercent },
            ram:   { used: ramUsed, total: ramTotal, percent: ramPercent },
            disk:  { used: diskUsed, total: diskTotal, percent: diskPercent },
            load:  { one: loadOne, five: loadFive, fifteen: loadFifteen },
            uptime,
        };

    } catch (err) {
        try { conn.end(); } catch { /* ignore */ }
        return { ok: false, serverId, error: err.message };
    }
};
