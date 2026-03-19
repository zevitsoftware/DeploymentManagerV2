'use strict';
/**
 * ipc/db/dbBackup.js
 *
 * IPC handlers for database backup operations using CLI tools.
 * Covers: db:check-cli, db:browse-backup-dir, db:run-backup
 *
 * Supported: mysqldump, pg_dump, mongodump, redis-cli --rdb
 * Sends real-time progress to renderer via db:backup-progress events.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { _resolveConnection } = require('./dbConfigHandlers');
const { readFullConfig, writeFullConfig } = require('../../services/configStore');

/** Cache last CLI detection results so backup functions can use resolved paths */
let _lastCliCheck = null;

// ── CLI Tool Detection ────────────────────────────────────────────────────────

/** Read custom CLI paths from config */
function getCustomCliPaths() {
    try {
        const config = readFullConfig();
        return config.dbCliPaths ?? {};
    } catch { return {}; }
}

async function detectCliTools() {
    const checks = {};
    const customPaths = getCustomCliPaths();

    const which = (cmd) => new Promise((resolve) => {
        const proc = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true,
            windowsHide: true,
        });
        let output = '';
        proc.stdout.on('data', (d) => output += d.toString());
        proc.on('close', (code) => resolve(code === 0 ? output.trim().split('\n')[0].trim() : null));
        proc.on('error', () => resolve(null));
    });

    const scanPaths = (candidates) => {
        for (const p of candidates) {
            try { if (fs.existsSync(p)) return p; } catch { /* skip */ }
        }
        return null;
    };

    /** Check custom path first, then which, then scan */
    const resolveExe = async (key, cmd, winCandidates) => {
        // Priority 1: User-configured custom path
        if (customPaths[key]) {
            try {
                if (fs.existsSync(customPaths[key])) return customPaths[key];
            } catch { /* skip invalid path */ }
        }
        // Priority 2: System PATH
        let found = await which(cmd);
        if (found) return found;
        // Priority 3: Common installation directories (Windows)
        if (process.platform === 'win32' && winCandidates?.length) {
            found = scanPaths(winCandidates);
        }
        return found;
    };

    const isWin = process.platform === 'win32';
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

    // --- mysqldump ---
    const mysqlPath = await resolveExe('mysql', 'mysqldump', [
        `${pf}\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe`,
        `${pf}\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe`,
        `${pf}\\MySQL\\MySQL Server 8.2\\bin\\mysqldump.exe`,
        `${pf}\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe`,
        `${pf86}\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe`,
        `C:\\xampp\\mysql\\bin\\mysqldump.exe`,
        `C:\\laragon\\bin\\mysql\\mysql-8.0\\bin\\mysqldump.exe`,
        `C:\\laragon\\bin\\mysql\\mysql-5.7\\bin\\mysqldump.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe`,
    ]);
    checks.mysql = { available: !!mysqlPath, path: mysqlPath, tool: 'mysqldump', custom: !!customPaths.mysql };

    // --- pg_dump ---
    const pgVersions = ['17', '16', '15', '14', '13', '12'];
    const pgPath = await resolveExe('pgsql', 'pg_dump',
        pgVersions.map(v => `${pf}\\PostgreSQL\\${v}\\bin\\pg_dump.exe`)
    );
    checks.pgsql = { available: !!pgPath, path: pgPath, tool: 'pg_dump', custom: !!customPaths.pgsql };

    // --- mongodump ---
    const mongoPath = await resolveExe('mongodb', 'mongodump', [
        `${pf}\\MongoDB\\Tools\\100\\bin\\mongodump.exe`,
        `${pf}\\MongoDB\\Server\\8.0\\bin\\mongodump.exe`,
        `${pf}\\MongoDB\\Server\\7.0\\bin\\mongodump.exe`,
        `${pf}\\MongoDB\\Server\\6.0\\bin\\mongodump.exe`,
        `C:\\mongodb\\bin\\mongodump.exe`,
        `${process.env.LOCALAPPDATA}\\Programs\\mongosh\\mongodump.exe`,
    ]);
    checks.mongodb = { available: !!mongoPath, path: mongoPath, tool: 'mongodump', custom: !!customPaths.mongodb };

    // --- redis-cli ---
    const redisPath = await resolveExe('redis', 'redis-cli', [
        `${pf}\\Redis\\redis-cli.exe`,
        `C:\\Redis\\redis-cli.exe`,
        `${process.env.LOCALAPPDATA}\\Redis\\redis-cli.exe`,
        `C:\\ProgramData\\chocolatey\\bin\\redis-cli.exe`,
        `${process.env.USERPROFILE}\\scoop\\shims\\redis-cli.exe`,
    ]);
    checks.redis = { available: !!redisPath, path: redisPath, tool: 'redis-cli', custom: !!customPaths.redis };
    return checks;
}

// ── Backup Implementations ────────────────────────────────────────────────────

async function _backupMySQL(conn, outputDir, safeName, timestamp, sendProgress, exePath) {
    const outFile = path.join(outputDir, `${safeName}_${timestamp}.sql`);
    sendProgress({ status: 'running', message: `Starting mysqldump → ${path.basename(outFile)}` });

    const args = [
        '-h', conn.host || '127.0.0.1',
        '-P', String(conn.port ?? 3306),
        '-u', conn.username || 'root',
    ];
    if (conn.password) args.push(`-p${conn.password}`);
    if (conn.ssl) args.push('--ssl-mode=REQUIRED');
    args.push('--single-transaction', '--routines', '--triggers', '--events');
    if (conn.database) { args.push(conn.database); } else { args.push('--all-databases'); }
    args.push('--result-file="' + outFile + '"');

    return new Promise((resolve) => {
        const proc = spawn(`"${exePath || 'mysqldump'}"`, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, windowsHide: true });
        let stderr = '';
        proc.stdout.on('data', () => sendProgress({ status: 'running', message: 'Dumping data…' }));
        proc.stderr.on('data', (d) => {
            stderr += d.toString();
            const line = d.toString().trim();
            if (line && !line.includes('Using a password on the command line')) {
                sendProgress({ status: 'running', message: line });
            }
        });
        proc.on('error', (err) => {
            sendProgress({ status: 'error', message: `mysqldump not found: ${err.message}` });
            resolve({ ok: false, error: `mysqldump not found. Is MySQL client installed and in PATH?\n${err.message}` });
        });
        proc.on('close', (code) => {
            if (code === 0) {
                const stats = fs.statSync(outFile);
                const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                sendProgress({ status: 'done', message: `✅ Backup complete: ${path.basename(outFile)} (${sizeMB} MB)` });
                resolve({ ok: true, file: outFile, size: stats.size });
            } else {
                const errMsg = stderr.trim() || `mysqldump exited with code ${code}`;
                sendProgress({ status: 'error', message: errMsg });
                resolve({ ok: false, error: errMsg });
            }
        });
    });
}

async function _backupPgSQL(conn, outputDir, safeName, timestamp, sendProgress, exePath) {
    const outFile = path.join(outputDir, `${safeName}_${timestamp}.sql`);
    sendProgress({ status: 'running', message: `Starting pg_dump → ${path.basename(outFile)}` });

    const args = [
        '-h', conn.host || '127.0.0.1', '-p', String(conn.port ?? 5432),
        '-U', conn.username || 'postgres', '-F', 'p', '-f', outFile, '--verbose',
    ];
    if (conn.database) args.push(conn.database);
    const env = { ...process.env };
    if (conn.password) env.PGPASSWORD = conn.password;

    return new Promise((resolve) => {
        const proc = spawn(`"${exePath}"`, args, { stdio: ['ignore', 'pipe', 'pipe'], env, shell: true, windowsHide: true });
        let stderr = '';
        proc.stdout.on('data', () => sendProgress({ status: 'running', message: 'Dumping data…' }));
        proc.stderr.on('data', (d) => {
            stderr += d.toString();
            for (const line of d.toString().trim().split('\n')) {
                if (line.trim()) sendProgress({ status: 'running', message: line.trim() });
            }
        });
        proc.on('error', (err) => {
            sendProgress({ status: 'error', message: `pg_dump not found: ${err.message}` });
            resolve({ ok: false, error: `pg_dump not found. Is PostgreSQL client installed and in PATH?\n${err.message}` });
        });
        proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(outFile)) {
                const stats = fs.statSync(outFile);
                const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                sendProgress({ status: 'done', message: `✅ Backup complete: ${path.basename(outFile)} (${sizeMB} MB)` });
                resolve({ ok: true, file: outFile, size: stats.size });
            } else {
                const errMsg = stderr.trim() || `pg_dump exited with code ${code}`;
                sendProgress({ status: 'error', message: errMsg });
                resolve({ ok: false, error: errMsg });
            }
        });
    });
}

async function _backupMongo(conn, outputDir, safeName, timestamp, sendProgress, exePath) {
    const outDir = path.join(outputDir, `${safeName}_${timestamp}`);
    sendProgress({ status: 'running', message: `Starting mongodump → ${path.basename(outDir)}/` });

    const args = ['--out', outDir];
    if (conn.uri) {
        args.push('--uri', conn.uri);
    } else {
        args.push('--host', conn.host || '127.0.0.1', '--port', String(conn.port ?? 27017));
        if (conn.username) args.push('-u', conn.username);
        if (conn.password) args.push('-p', conn.password);
        if (conn.database) args.push('--db', conn.database);
    }
    if (conn.ssl) args.push('--ssl');

    return new Promise((resolve) => {
        const proc = spawn(`"${exePath}"`, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, windowsHide: true });
        let stderr = '';
        proc.stdout.on('data', (d) => { const line = d.toString().trim(); if (line) sendProgress({ status: 'running', message: line }); });
        proc.stderr.on('data', (d) => {
            stderr += d.toString();
            for (const line of d.toString().trim().split('\n')) {
                if (line.trim()) sendProgress({ status: 'running', message: line.trim() });
            }
        });
        proc.on('error', (err) => {
            sendProgress({ status: 'error', message: `mongodump not found: ${err.message}` });
            resolve({ ok: false, error: `mongodump not found. Is MongoDB Database Tools installed and in PATH?\n${err.message}` });
        });
        proc.on('close', (code) => {
            if (code === 0) {
                let totalSize = 0;
                const walkDir = (dir) => {
                    if (!fs.existsSync(dir)) return;
                    for (const f of fs.readdirSync(dir)) {
                        const full = path.join(dir, f);
                        const stat = fs.statSync(full);
                        if (stat.isDirectory()) walkDir(full); else totalSize += stat.size;
                    }
                };
                walkDir(outDir);
                const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
                sendProgress({ status: 'done', message: `✅ Backup complete: ${path.basename(outDir)}/ (${sizeMB} MB)` });
                resolve({ ok: true, file: outDir, size: totalSize });
            } else {
                const errMsg = stderr.trim() || `mongodump exited with code ${code}`;
                sendProgress({ status: 'error', message: errMsg });
                resolve({ ok: false, error: errMsg });
            }
        });
    });
}

async function _backupRedis(conn, outputDir, safeName, timestamp, sendProgress, exePath) {
    const outFile = path.join(outputDir, `${safeName}_${timestamp}.rdb`);
    sendProgress({ status: 'running', message: `Starting redis-cli --rdb → ${path.basename(outFile)}` });

    const args = ['-h', conn.host || '127.0.0.1', '-p', String(conn.port ?? 6379)];
    if (conn.password) args.push('-a', conn.password);
    args.push('--rdb', outFile);

    return new Promise((resolve) => {
        const proc = spawn(`"${exePath}"`, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true, windowsHide: true });
        let stderr = '';
        proc.stdout.on('data', (d) => { const line = d.toString().trim(); if (line) sendProgress({ status: 'running', message: line }); });
        proc.stderr.on('data', (d) => {
            stderr += d.toString();
            const line = d.toString().trim();
            if (line) sendProgress({ status: 'running', message: line });
        });
        proc.on('error', (err) => {
            sendProgress({ status: 'error', message: `redis-cli not found: ${err.message}` });
            resolve({ ok: false, error: `redis-cli not found. Is Redis CLI installed and in PATH?\n${err.message}` });
        });
        proc.on('close', (code) => {
            if (code === 0 && fs.existsSync(outFile)) {
                const stats = fs.statSync(outFile);
                const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
                sendProgress({ status: 'done', message: `✅ Backup complete: ${path.basename(outFile)} (${sizeMB} MB)` });
                resolve({ ok: true, file: outFile, size: stats.size });
            } else {
                const errMsg = stderr.trim() || `redis-cli exited with code ${code}`;
                sendProgress({ status: 'error', message: errMsg });
                resolve({ ok: false, error: errMsg });
            }
        });
    });
}

// ── Register Handlers ─────────────────────────────────────────────────────────

function registerHandlers(ipcMain, win) {

    ipcMain.handle('db:check-cli', async () => {
        const results = await detectCliTools();
        _lastCliCheck = results;
        return results;
    });

    ipcMain.handle('db:browse-backup-dir', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog(win, {
            title: 'Select Backup Destination',
            properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || !result.filePaths.length) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('db:run-backup', async (e, { connId, outputDir }) => {
        const conn = _resolveConnection(connId);
        if (!conn) return { ok: false, error: 'Connection not found.' };

        if (!outputDir || !fs.existsSync(outputDir)) {
            return { ok: false, error: 'Output directory does not exist.' };
        }
        if (!_lastCliCheck) {
            return { ok: false, error: 'CLI tools have not been checked. Please re-open the connection panel.' };
        }

        const cliInfo = _lastCliCheck[conn.type];
        if (!cliInfo?.available || !cliInfo.path) {
            return { ok: false, error: `CLI tool "${cliInfo?.tool ?? 'unknown'}" not found on this system.` };
        }
        const exePath = cliInfo.path;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const safeName = (conn.name || 'db').replace(/[^a-zA-Z0-9_-]/g, '_');

        const sendProgress = (data) => {
            try { win.webContents.send('db:backup-progress', data); } catch { /* window closed */ }
        };

        try {
            if (conn.type === 'mysql') return await _backupMySQL(conn, outputDir, safeName, timestamp, sendProgress, exePath);
            if (conn.type === 'pgsql') return await _backupPgSQL(conn, outputDir, safeName, timestamp, sendProgress, exePath);
            if (conn.type === 'mongodb') return await _backupMongo(conn, outputDir, safeName, timestamp, sendProgress, exePath);
            if (conn.type === 'redis') return await _backupRedis(conn, outputDir, safeName, timestamp, sendProgress, exePath);
            return { ok: false, error: `Unsupported database type: ${conn.type}` };
        } catch (err) {
            sendProgress({ status: 'error', message: err.message });
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('db:get-cli-paths', () => {
        return getCustomCliPaths();
    });

    ipcMain.handle('db:save-cli-paths', (e, paths) => {
        try {
            const config = readFullConfig();
            config.dbCliPaths = paths ?? {};
            writeFullConfig(config);
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    ipcMain.handle('db:browse-cli-path', async (e, { tool }) => {
        const { dialog } = require('electron');
        const filters = process.platform === 'win32'
            ? [{ name: 'Executable', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }]
            : [{ name: 'All Files', extensions: ['*'] }];
        const result = await dialog.showOpenDialog(win, {
            title: `Locate ${tool ?? 'CLI Tool'}`,
            properties: ['openFile'],
            filters,
        });
        if (result.canceled || !result.filePaths.length) return null;
        return result.filePaths[0];
    });
}

module.exports = { registerHandlers };
