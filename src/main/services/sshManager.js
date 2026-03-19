'use strict';
/**
 * src/main/services/sshManager.js
 * Migrated from: sshManager.js (legacy root)
 *
 * SSH connection manager for Zevitsoft Deployment Manager v2.
 * Manages multiple simultaneous SSH connections (one per server ID).
 * Supports: password auth, private-key auth (with optional passphrase),
 *           exec, streaming exec, interactive PTY shell, and SFTP.
 *
 * Events emitted on the SSHManager instance:
 *   'connected'     (serverId)
 *   'disconnected'  (serverId)
 *   'ssh-error'     (serverId, Error)   ← use this, not 'error' (avoids Node.js crash)
 *   'shell-data'    (serverId, data: string)
 */

const { EventEmitter } = require('events');
const { Client } = require('ssh2');
const fs = require('fs');

class SSHManager extends EventEmitter {
    constructor() {
        super();
        /** @type {Map<string, import('ssh2').Client>} */
        this.connections = new Map();
        /** @type {Map<string, import('ssh2').ClientChannel>} */
        this.shells = new Map();
        // IMPORTANT: Add a default 'error' listener to prevent Node.js from
        // throwing ERR_UNHANDLED_ERROR when SSH connections fail.
        // callers can listen on 'ssh-error' for structured error handling.
        this.on('error', () => { /* suppress unhandled EventEmitter error crash */ });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // connect(serverConfig) → Promise<void>
    //
    // serverConfig shape (already decrypted from targets.enc):
    // {
    //   id, host, port, username,
    //   authType: 'password' | 'sshkey',
    //   password,        // when authType === 'password'
    //   keyPath,         // when authType === 'sshkey' (local path to .pem/.ppk)
    //   passphrase,      // optional for SSH key
    // }
    // ─────────────────────────────────────────────────────────────────────────
    connect(serverConfig) {
        return new Promise((resolve, reject) => {
            // If already connected, resolve immediately
            if (this.connections.has(serverConfig.id)) {
                resolve();
                return;
            }

            const conn = new Client();

            const connOptions = {
                host: serverConfig.host,
                port: serverConfig.port ?? 22,
                username: serverConfig.username,
                readyTimeout: 20000,
                keepaliveInterval: 10000,
                keepaliveCountMax: 3,
                // Broad algorithm support for modern OpenSSH (8.8+) and GCP instances.
                // GCP/Ubuntu 22+ disable ssh-rsa (SHA-1) and may require diffie-hellman-group-exchange.
                algorithms: {
                    kex: [
                        'curve25519-sha256', 'curve25519-sha256@libssh.org',
                        'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521',
                        'diffie-hellman-group-exchange-sha256', 'diffie-hellman-group14-sha256',
                        'diffie-hellman-group16-sha512', 'diffie-hellman-group18-sha512',
                        'diffie-hellman-group14-sha1',
                    ],
                    serverHostKey: [
                        'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521',
                        'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa',
                    ],
                    cipher: [
                        'aes128-gcm', 'aes128-gcm@openssh.com', 'aes256-gcm', 'aes256-gcm@openssh.com',
                        'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
                    ],
                    hmac: [
                        'hmac-sha2-256-etm@openssh.com', 'hmac-sha2-512-etm@openssh.com',
                        'hmac-sha2-256', 'hmac-sha2-512',
                    ],
                },
            };

            // Build auth options
            if (serverConfig.authType === 'sshkey') {
                try {
                    let keyContent = fs.readFileSync(serverConfig.keyPath);
                    // Normalize CRLF → LF — Windows editors can corrupt OpenSSH key files
                    const keyStr = keyContent.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                    keyContent = Buffer.from(keyStr, 'utf8');

                    // Pre-validate key format using ssh2's own parser for a clear error
                    const { utils } = require('ssh2');
                    const passphrase = serverConfig.passphrase || undefined;
                    const parsed = utils.parseKey(keyContent, passphrase);
                    if (parsed instanceof Error) {
                        const isPassphraseErr = parsed.message.toLowerCase().includes('no passphrase') ||
                            parsed.message.toLowerCase().includes('passphrase');
                        const hint = isPassphraseErr
                            ? ' — This key is encrypted; enter the passphrase.'
                            : ' — Unsupported key format or corrupt file.';
                        reject(new Error(`SSH key error: ${parsed.message}${hint}`));
                        return;
                    }

                    connOptions.privateKey = keyContent;
                    if (passphrase) {
                        connOptions.passphrase = passphrase;
                    }
                } catch (err) {
                    if (err.message.startsWith('SSH key error')) {
                        reject(err);
                    } else {
                        reject(new Error(`Cannot read SSH key file "${serverConfig.keyPath}": ${err.message}`));
                    }
                    return;
                }
            } else {
                // Default: password auth
                connOptions.password = serverConfig.password;
            }

            conn.on('ready', () => {
                this.connections.set(serverConfig.id, conn);
                this.emit('connected', serverConfig.id);
                resolve();
            });

            conn.on('error', (err) => {
                console.error(`[SSHManager] Connection error for ${serverConfig.id} (${serverConfig.host}):`, err.message);
                if (err.level) console.error(`[SSHManager]   level: ${err.level}`);
                this.connections.delete(serverConfig.id);
                this.emit('ssh-error', serverConfig.id, err); // safe alias — won't crash
                reject(err);
            });

            conn.on('close', () => {
                this.connections.delete(serverConfig.id);
                this.shells.delete(serverConfig.id);
                this.emit('disconnected', serverConfig.id);
            });

            conn.on('end', () => {
                this.connections.delete(serverConfig.id);
                this.shells.delete(serverConfig.id);
                this.emit('disconnected', serverConfig.id);
            });

            conn.connect(connOptions);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // disconnect(serverId) → void
    // ─────────────────────────────────────────────────────────────────────────
    disconnect(serverId) {
        const shell = this.shells.get(serverId);
        if (shell) {
            try { shell.end(); } catch (_) { /* ignore */ }
            this.shells.delete(serverId);
        }
        const conn = this.connections.get(serverId);
        if (conn) {
            try { conn.end(); } catch (_) { /* ignore */ }
            this.connections.delete(serverId);
        }
        this.emit('disconnected', serverId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // exec(serverId, command) → Promise<{ stdout, stderr, code }>
    //
    // Runs a single command and waits for full output.
    // ─────────────────────────────────────────────────────────────────────────
    exec(serverId, command) {
        return new Promise((resolve, reject) => {
            const conn = this.connections.get(serverId);
            if (!conn) {
                reject(new Error(`Not connected to server: ${serverId}`));
                return;
            }

            conn.exec(command, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                let stdout = '';
                let stderr = '';

                stream.on('data', (data) => { stdout += data.toString(); });
                stream.stderr.on('data', (data) => { stderr += data.toString(); });

                stream.on('close', (code) => {
                    resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code });
                });

                stream.on('error', reject);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // execStream(serverId, command, onData) → Promise<{ code }>
    //
    // Runs a long-running command and streams stdout+stderr line-by-line
    // via the onData callback. Used for git pull, npm install, builds, etc.
    // ─────────────────────────────────────────────────────────────────────────
    execStream(serverId, command, onData) {
        return new Promise((resolve, reject) => {
            const conn = this.connections.get(serverId);
            if (!conn) {
                reject(new Error(`Not connected to server: ${serverId}`));
                return;
            }

            conn.exec(command, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                let buffer = '';

                const dispatch = (chunk) => {
                    buffer += chunk;
                    // Emit complete lines
                    const lines = buffer.split('\n');
                    buffer = lines.pop(); // keep incomplete last segment
                    for (const line of lines) {
                        if (onData) onData(line + '\n');
                    }
                };

                stream.on('data', (data) => dispatch(data.toString()));
                stream.stderr.on('data', (data) => dispatch(data.toString()));

                stream.on('close', (code) => {
                    // Flush remaining buffer
                    if (buffer && onData) onData(buffer);
                    resolve({ code });
                });

                stream.on('error', reject);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // openShell(serverId, { cols, rows }) → Promise<void>
    //
    // Opens an interactive PTY shell. Data is emitted via 'shell-data' event.
    // ─────────────────────────────────────────────────────────────────────────
    openShell(serverId, { cols = 80, rows = 24 } = {}) {
        return new Promise((resolve, reject) => {
            const conn = this.connections.get(serverId);
            if (!conn) {
                reject(new Error(`Not connected to server: ${serverId}`));
                return;
            }

            // Close any existing shell first
            const existingShell = this.shells.get(serverId);
            if (existingShell) {
                try { existingShell.end(); } catch (_) { /* ignore */ }
                this.shells.delete(serverId);
            }

            conn.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
                if (err) {
                    reject(err);
                    return;
                }

                this.shells.set(serverId, stream);

                stream.on('data', (data) => {
                    this.emit('shell-data', serverId, data.toString());
                });

                stream.stderr.on('data', (data) => {
                    this.emit('shell-data', serverId, data.toString());
                });

                stream.on('close', () => {
                    this.shells.delete(serverId);
                    this.emit('shell-data', serverId, '\r\n[Shell closed]\r\n');
                });

                stream.on('error', (err) => {
                    this.emit('ssh-error', serverId, err); // safe alias
                });

                resolve();
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // writeShell(serverId, data) → void
    // ─────────────────────────────────────────────────────────────────────────
    writeShell(serverId, data) {
        const shell = this.shells.get(serverId);
        if (shell) {
            shell.write(data);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // resizeShell(serverId, { cols, rows }) → void
    // ─────────────────────────────────────────────────────────────────────────
    resizeShell(serverId, { cols = 80, rows = 24 } = {}) {
        const shell = this.shells.get(serverId);
        if (shell && typeof shell.setWindow === 'function') {
            shell.setWindow(rows, cols, 0, 0);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // closeShell(serverId) → void
    //
    // Closes the interactive shell but keeps the SSH connection alive.
    // ─────────────────────────────────────────────────────────────────────────
    closeShell(serverId) {
        const shell = this.shells.get(serverId);
        if (shell) {
            try { shell.end(); } catch (_) { /* ignore */ }
            this.shells.delete(serverId);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpUpload(serverId, localPath, remotePath, onProgress) → Promise<void>
    //
    // onProgress: (transferred: number, total: number) => void
    // ─────────────────────────────────────────────────────────────────────────
    sftpUpload(serverId, localPath, remotePath, onProgress) {
        return new Promise((resolve, reject) => {
            const conn = this.connections.get(serverId);
            if (!conn) {
                reject(new Error(`Not connected to server: ${serverId}`));
                return;
            }

            conn.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                    return;
                }

                let totalBytes = 0;
                try {
                    const stat = fs.statSync(localPath);
                    totalBytes = stat.size;
                } catch (_) { /* unknown size */ }

                const readStream = fs.createReadStream(localPath);
                const writeStream = sftp.createWriteStream(remotePath);

                let transferred = 0;

                readStream.on('data', (chunk) => {
                    transferred += chunk.length;
                    if (onProgress && totalBytes > 0) {
                        onProgress(transferred, totalBytes);
                    }
                });

                writeStream.on('close', () => {
                    sftp.end();
                    if (onProgress && totalBytes > 0) {
                        onProgress(totalBytes, totalBytes); // 100%
                    }
                    resolve();
                });

                writeStream.on('error', (err) => {
                    sftp.end();
                    reject(err);
                });

                readStream.on('error', (err) => {
                    sftp.end();
                    reject(err);
                });

                readStream.pipe(writeStream);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // _sftpSession(serverId) → Promise<SFTPWrapper>
    //
    // Internal helper: opens an SFTP channel from the existing SSH connection.
    // Caller is responsible for calling sftp.end() when done.
    // ─────────────────────────────────────────────────────────────────────────
    _sftpSession(serverId) {
        return new Promise((resolve, reject) => {
            const conn = this.connections.get(serverId);
            if (!conn) {
                reject(new Error(`Not connected to server: ${serverId}`));
                return;
            }
            conn.sftp((err, sftp) => {
                if (err) reject(err);
                else resolve(sftp);
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpReadDir(serverId, dirPath) → Promise<{ entries: Array }>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpReadDir(serverId, dirPath) {
        const sftp = await this._sftpSession(serverId);
        try {
            const list = await new Promise((resolve, reject) => {
                sftp.readdir(dirPath, (err, list) => {
                    if (err) reject(err);
                    else resolve(list || []);
                });
            });

            const entries = [];
            for (const item of list) {
                const name = item.filename;
                if (name === '.' || name === '..') continue;

                const attrs = item.attrs;
                const isDir = attrs.isDirectory();
                const isLink = attrs.isSymbolicLink();
                const size = attrs.size ?? 0;
                const modified = attrs.mtime
                    ? new Date(attrs.mtime * 1000).toISOString().slice(0, 16).replace('T', ' ')
                    : '';

                entries.push({ name, isDir, isLink, size, modified });
            }

            entries.sort((a, b) => {
                if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });

            return entries;
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpStat(serverId, filePath) → Promise<{ size, isDir, isLink, modified }>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpStat(serverId, filePath) {
        const sftp = await this._sftpSession(serverId);
        try {
            const attrs = await new Promise((resolve, reject) => {
                sftp.stat(filePath, (err, attrs) => {
                    if (err) reject(err);
                    else resolve(attrs);
                });
            });
            return {
                size: attrs.size ?? 0,
                isDir: attrs.isDirectory(),
                isLink: attrs.isSymbolicLink(),
                modified: attrs.mtime
                    ? new Date(attrs.mtime * 1000).toISOString().slice(0, 16).replace('T', ' ')
                    : '',
            };
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpReadFile(serverId, filePath, maxBytes) → Promise<{ content, size }>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpReadFile(serverId, filePath, maxBytes = 1 * 1024 * 1024) {
        const sftp = await this._sftpSession(serverId);
        try {
            const attrs = await new Promise((resolve, reject) => {
                sftp.stat(filePath, (err, attrs) => {
                    if (err) reject(err);
                    else resolve(attrs);
                });
            });

            const fileSize = attrs.size ?? 0;
            if (fileSize > maxBytes) {
                throw new Error(`File too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Max ${(maxBytes / 1024 / 1024).toFixed(0)}MB.`);
            }

            const content = await new Promise((resolve, reject) => {
                const chunks = [];
                const readStream = sftp.createReadStream(filePath);
                readStream.on('data', (chunk) => chunks.push(chunk));
                readStream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
                readStream.on('error', reject);
            });

            return { content, size: fileSize };
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpWriteFile(serverId, filePath, content, options) → Promise<{ backedUp }>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpWriteFile(serverId, filePath, content, { backup = true } = {}) {
        const sftp = await this._sftpSession(serverId);
        try {
            let backedUp = false;

            if (backup) {
                try {
                    await new Promise((resolve, reject) => {
                        sftp.stat(filePath, (err, attrs) => {
                            if (err) reject(err);
                            else resolve(attrs);
                        });
                    });

                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const backupPath = `${filePath}.bak.${timestamp}`;

                    await new Promise((resolve, reject) => {
                        const readStream = sftp.createReadStream(filePath);
                        const writeStream = sftp.createWriteStream(backupPath);
                        readStream.on('error', reject);
                        writeStream.on('error', reject);
                        writeStream.on('close', () => {
                            backedUp = true;
                            resolve();
                        });
                        readStream.pipe(writeStream);
                    });
                } catch (e) {
                    if (e.code !== 2) { // code 2 = SFTP "No such file"
                        throw e;
                    }
                }
            }

            const buf = Buffer.from(content, 'utf8');
            await new Promise((resolve, reject) => {
                const writeStream = sftp.createWriteStream(filePath);
                writeStream.on('error', reject);
                writeStream.on('close', resolve);
                writeStream.end(buf);
            });

            return { backedUp };
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpMkdir(serverId, dirPath) → Promise<void>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpMkdir(serverId, dirPath) {
        const sftp = await this._sftpSession(serverId);
        try {
            await new Promise((resolve, reject) => {
                sftp.mkdir(dirPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpDelete(serverId, filePath) → Promise<void>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpDelete(serverId, filePath) {
        const sftp = await this._sftpSession(serverId);
        try {
            await new Promise((resolve, reject) => {
                sftp.unlink(filePath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpRmdir(serverId, dirPath, recursive) → Promise<void>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpRmdir(serverId, dirPath, recursive = false) {
        const sftp = await this._sftpSession(serverId);
        try {
            if (recursive) {
                await this._sftpRmdirRecursive(sftp, dirPath);
            } else {
                await new Promise((resolve, reject) => {
                    sftp.rmdir(dirPath, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        } finally {
            sftp.end();
        }
    }

    /** @private Recursively remove directory contents then the directory */
    async _sftpRmdirRecursive(sftp, dirPath) {
        const list = await new Promise((resolve, reject) => {
            sftp.readdir(dirPath, (err, list) => {
                if (err) reject(err);
                else resolve(list || []);
            });
        });

        for (const item of list) {
            if (item.filename === '.' || item.filename === '..') continue;
            const fullPath = dirPath.replace(/\/$/, '') + '/' + item.filename;
            if (item.attrs.isDirectory()) {
                await this._sftpRmdirRecursive(sftp, fullPath);
            } else {
                await new Promise((resolve, reject) => {
                    sftp.unlink(fullPath, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }
        }

        await new Promise((resolve, reject) => {
            sftp.rmdir(dirPath, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpRename(serverId, oldPath, newPath) → Promise<void>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpRename(serverId, oldPath, newPath) {
        const sftp = await this._sftpSession(serverId);
        try {
            await new Promise((resolve, reject) => {
                sftp.rename(oldPath, newPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // sftpDownload(serverId, remotePath, localPath, onProgress) → Promise<void>
    // ─────────────────────────────────────────────────────────────────────────
    async sftpDownload(serverId, remotePath, localPath, onProgress) {
        const sftp = await this._sftpSession(serverId);
        try {
            let totalBytes = 0;
            try {
                const stat = await new Promise((resolve, reject) => {
                    sftp.stat(remotePath, (err, stats) => err ? reject(err) : resolve(stats));
                });
                totalBytes = stat.size ?? 0;
            } catch (_) { /* unknown size */ }

            await new Promise((resolve, reject) => {
                const readStream = sftp.createReadStream(remotePath);
                const writeStream = fs.createWriteStream(localPath);
                let transferred = 0;

                readStream.on('data', (chunk) => {
                    transferred += chunk.length;
                    if (onProgress && totalBytes > 0) {
                        onProgress(transferred, totalBytes);
                    }
                });

                readStream.on('error', reject);
                writeStream.on('error', reject);
                writeStream.on('close', () => {
                    if (onProgress && totalBytes > 0) {
                        onProgress(totalBytes, totalBytes); // 100%
                    }
                    resolve();
                });

                readStream.pipe(writeStream);
            });
        } finally {
            sftp.end();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // isConnected(serverId) → boolean
    // ─────────────────────────────────────────────────────────────────────────
    isConnected(serverId) {
        return this.connections.has(serverId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // getConnection(serverId) → ssh2.Client | null
    // ─────────────────────────────────────────────────────────────────────────
    getConnection(serverId) {
        return this.connections.get(serverId) ?? null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // disconnectAll() → void
    //
    // Cleanup: close all connections (called on app quit).
    // ─────────────────────────────────────────────────────────────────────────
    disconnectAll() {
        for (const id of [...this.connections.keys()]) {
            this.disconnect(id);
        }
    }
}

module.exports = new SSHManager();
