'use strict';
/**
 * src/main/ipc/deploy/deployIpc.js
 *
 * Thin orchestrator for Deploy Manager IPC handlers.
 * Registers all handlers from the 4 deploy sub-modules.
 *
 * Usage in src/main/index.js:
 *   const registerDeployIpc = require('./ipc/deploy/deployIpc');
 *   registerDeployIpc(ipcMain, win, sshManager);
 */

const { registerHandlers: regConfig } = require('./deployConfigHandlers');
const { registerHandlers: regAction } = require('./deployActionHandlers');
const { registerHandlers: regSftp } = require('./deploySftpHandlers');
const { registerHandlers: regTerm } = require('./deployTerminalHandlers');

module.exports = function registerDeployIpc(ipcMain, win, sshManager) {
    regConfig(ipcMain, win, sshManager);
    regAction(ipcMain, win, sshManager);
    regSftp(ipcMain, win, sshManager);
    regTerm(ipcMain, win, sshManager);
};
