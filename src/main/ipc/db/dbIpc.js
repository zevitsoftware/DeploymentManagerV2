'use strict';
/**
 * src/main/ipc/db/dbIpc.js
 *
 * Thin orchestrator for Database Manager IPC handlers.
 * Registers all handlers from the 4 db sub-modules.
 *
 * Usage in src/main/index.js:
 *   const registerDbIpc = require('./ipc/db/dbIpc');
 *   registerDbIpc(ipcMain, win);
 */

const { registerHandlers: regConfig } = require('./dbConfigHandlers');
const { registerHandlers: regConn } = require('./dbConnectionHandlers');
const { registerHandlers: regDiag } = require('./dbDiagnostics');
const { registerHandlers: regBackup } = require('./dbBackup');

module.exports = function registerDbIpc(ipcMain, win) {
    regConfig(ipcMain, win);
    regConn(ipcMain, win);
    regDiag(ipcMain, win);
    regBackup(ipcMain, win);
};
