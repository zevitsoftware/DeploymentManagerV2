'use strict';
/**
 * ipc/deploy/deploySftpHandlers.js
 *
 * IPC handlers for SFTP-based file editor operations on remote servers.
 * Covers: directory listing, file read/write/create/delete/rename,
 * directory create/delete, file upload/download.
 */

function registerHandlers(ipcMain, win, sshManager) {

    // ── File Editor IPC Handlers (SFTP-based) ────────────────────────────────

    /**
     * List files and directories at a given remote path via SFTP protocol.
     * Returns { ok, entries: [{ name, isDir, isLink, size, modified }], path }
     */
    ipcMain.handle('deploy:file-list', async (e, serverId, dirPath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const rawEntries = await sshManager.sftpReadDir(serverId, dirPath);
            // Enrich entries with type and path for the frontend
            const entries = rawEntries.map(entry => ({
                ...entry,
                type: entry.isDir ? 'directory' : 'file',
                path: (dirPath === '/' ? '/' : dirPath.replace(/\/$/, '') + '/') + entry.name,
            }));
            return { ok: true, entries, path: dirPath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Read the content of a remote file via SFTP protocol.
     * Rejects files > 1MB for safety.
     * Returns { ok, content, path, size }
     */
    ipcMain.handle('deploy:file-read', async (e, serverId, filePath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const { content, size } = await sshManager.sftpReadFile(serverId, filePath);
            return { ok: true, content, path: filePath, size };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Write content to a remote file via SFTP protocol.
     * Optionally creates a .bak backup before overwriting.
     * Returns { ok, path, backedUp }
     */
    ipcMain.handle('deploy:file-write', async (e, serverId, filePath, content, createBackup = true) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const { backedUp } = await sshManager.sftpWriteFile(serverId, filePath, content, { backup: createBackup });
            return { ok: true, path: filePath, backedUp };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Create a new empty file (or with initial content) via SFTP.
     * Returns { ok, path }
     */
    ipcMain.handle('deploy:file-create', async (e, serverId, filePath, content = '') => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            await sshManager.sftpWriteFile(serverId, filePath, content, { backup: false });
            return { ok: true, path: filePath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Create a new directory via SFTP.
     * Returns { ok, path }
     */
    ipcMain.handle('deploy:file-mkdir', async (e, serverId, dirPath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            await sshManager.sftpMkdir(serverId, dirPath);
            return { ok: true, path: dirPath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Delete a file via SFTP.
     * Returns { ok, path }
     */
    ipcMain.handle('deploy:file-delete', async (e, serverId, filePath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            await sshManager.sftpDelete(serverId, filePath);
            return { ok: true, path: filePath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Delete a directory via SFTP (optionally recursive).
     * Returns { ok, path }
     */
    ipcMain.handle('deploy:file-rmdir', async (e, serverId, dirPath, recursive = false) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            await sshManager.sftpRmdir(serverId, dirPath, recursive);
            return { ok: true, path: dirPath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Rename/move a file or directory via SFTP.
     * Returns { ok, oldPath, newPath }
     */
    ipcMain.handle('deploy:file-rename', async (e, serverId, oldPath, newPath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            await sshManager.sftpRename(serverId, oldPath, newPath);
            return { ok: true, oldPath, newPath };
        } catch (err) {
            return { ok: false, error: err.message };
        }
    });

    /**
     * Upload a local file to the remote server via SFTP.
     * Opens native file picker dialog, then uploads to remoteDirPath.
     * Emits 'deploy:sftp-progress' events during transfer.
     * Returns { ok, localPath, remotePath }
     */
    ipcMain.handle('deploy:file-upload', async (e, serverId, remoteDirPath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const { dialog } = require('electron');
            const result = await dialog.showOpenDialog(win, {
                title: 'Upload File to Server',
                properties: ['openFile'],
            });
            if (result.canceled || result.filePaths.length === 0) {
                return { ok: false, canceled: true };
            }
            const localPath = result.filePaths[0];
            const fileName = require('path').basename(localPath);
            const remotePath = remoteDirPath.replace(/\/$/, '') + '/' + fileName;

            // Notify renderer: transfer started
            win.webContents.send('deploy:sftp-progress', {
                type: 'upload', fileName, transferred: 0, total: 0, percent: 0, status: 'start',
            });

            await sshManager.sftpUpload(serverId, localPath, remotePath, (transferred, total) => {
                const percent = total > 0 ? Math.round((transferred / total) * 100) : 0;
                win.webContents.send('deploy:sftp-progress', {
                    type: 'upload', fileName, transferred, total, percent, status: 'progress',
                });
            });

            // Notify renderer: transfer complete
            win.webContents.send('deploy:sftp-progress', {
                type: 'upload', fileName, transferred: 0, total: 0, percent: 100, status: 'done',
            });

            return { ok: true, localPath, remotePath, fileName };
        } catch (err) {
            win.webContents.send('deploy:sftp-progress', {
                type: 'upload', fileName: '', transferred: 0, total: 0, percent: 0, status: 'error',
                error: err.message,
            });
            return { ok: false, error: err.message };
        }
    });

    /**
     * Download a remote file to local machine via SFTP.
     * Opens native save dialog, then downloads.
     * Emits 'deploy:sftp-progress' events during transfer.
     * Returns { ok, remotePath, localPath }
     */
    ipcMain.handle('deploy:file-download', async (e, serverId, remotePath) => {
        try {
            if (!sshManager.isConnected(serverId)) throw new Error('Server not connected.');
            const { dialog } = require('electron');
            const fileName = require('path').basename(remotePath);
            const result = await dialog.showSaveDialog(win, {
                title: 'Download File from Server',
                defaultPath: fileName,
            });
            if (result.canceled || !result.filePath) {
                return { ok: false, canceled: true };
            }

            // Notify renderer: transfer started
            win.webContents.send('deploy:sftp-progress', {
                type: 'download', fileName, transferred: 0, total: 0, percent: 0, status: 'start',
            });

            await sshManager.sftpDownload(serverId, remotePath, result.filePath, (transferred, total) => {
                const percent = total > 0 ? Math.round((transferred / total) * 100) : 0;
                win.webContents.send('deploy:sftp-progress', {
                    type: 'download', fileName, transferred, total, percent, status: 'progress',
                });
            });

            // Notify renderer: transfer complete
            win.webContents.send('deploy:sftp-progress', {
                type: 'download', fileName, transferred: 0, total: 0, percent: 100, status: 'done',
            });

            return { ok: true, remotePath, localPath: result.filePath };
        } catch (err) {
            win.webContents.send('deploy:sftp-progress', {
                type: 'download', fileName: '', transferred: 0, total: 0, percent: 0, status: 'error',
                error: err.message,
            });
            return { ok: false, error: err.message };
        }
    });
}

module.exports = { registerHandlers };
