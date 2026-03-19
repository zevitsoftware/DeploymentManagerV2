'use strict';
/**
 * src/main/ipc/cf/cfIpc.js
 *
 * Thin orchestrator for Cloudflare Management IPC handlers.
 * Registers all handlers from the 4 cf sub-modules.
 *
 * Usage in src/main/index.js:
 *   const registerCfIpc = require('./ipc/cf/cfIpc');
 *   registerCfIpc(ipcMain, win);
 */

const { registerHandlers: regAccount } = require('./cfAccountHandlers');
const { registerHandlers: regZone } = require('./cfZoneHandlers');
const { registerHandlers: regDns } = require('./cfDnsHandlers');
const { registerHandlers: regTunnel } = require('./cfTunnelHandlers');

module.exports = function registerCfIpc(ipcMain, win) {
    regAccount(ipcMain, win);
    regZone(ipcMain, win);
    regDns(ipcMain, win);
    regTunnel(ipcMain, win);
};
