"use strict";
const electron = require("electron");
const path = require("path");
const utils = require("@electron-toolkit/utils");
const module$1 = require("module");
const icon = path.join(__dirname, "../../../../resources/icon.png");
const _req = module$1.createRequire(require("url").pathToFileURL(__filename).href);
const registerAuthIpc = _req("./ipc/authHandlers");
const registerFirewallIpc = _req("./ipc/firewallHandlers");
const registerAiIpc = _req("./ipc/aiHandlers");
const registerDeployIpc = _req("./ipc/deploy/deployIpc");
const registerDbIpc = _req("./ipc/db/dbIpc");
const registerCfIpc = _req("./ipc/cf/cfIpc");
const { destroyPools } = _req("./workers/pool");
const sshManager = _req("./services/sshManager");
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    frame: false,
    // Custom frameless window (TopBar handles controls)
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    backgroundColor: "#1a1a2e",
    // Matches --bg-primary CSS variable
    ...process.platform === "linux" ? { icon } : {},
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const appDir = electron.app.isPackaged ? process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath) : path.join(__dirname, "../../..");
  global.APP_DIR = appDir;
  global.CONFIG_PATH = path.join(appDir, "targets.enc");
  registerAuthIpc(electron.ipcMain);
  registerFirewallIpc(electron.ipcMain);
  registerAiIpc(electron.ipcMain);
  registerDeployIpc(electron.ipcMain, mainWindow, sshManager);
  registerDbIpc(electron.ipcMain, mainWindow);
  registerCfIpc(electron.ipcMain, mainWindow);
  electron.ipcMain.handle("dialog:open", async (e, options) => {
    const result = await electron.dialog.showOpenDialog(mainWindow, options);
    return result;
  });
  electron.ipcMain.on("win:minimize", () => mainWindow.minimize());
  electron.ipcMain.on("win:maximize", () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  electron.ipcMain.on("win:close", () => mainWindow.close());
  electron.ipcMain.handle("win:is-maximized", () => mainWindow.isMaximized());
  mainWindow.on("maximize", () => mainWindow.webContents.send("win:maximized-change", true));
  mainWindow.on("unmaximize", () => mainWindow.webContents.send("win:maximized-change", false));
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  return mainWindow;
}
electron.app.whenReady().then(() => {
  utils.electronApp.setAppUserModelId("com.zevitsoft.deployment-manager");
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", async () => {
  await destroyPools();
});
