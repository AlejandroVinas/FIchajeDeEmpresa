const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const { getFreePort } = require('./portFinder');

let mainWindow = null;
let backendServer = null;
let backendPort = null;

Menu.setApplicationMenu(null);

function getElectronRoot() {
  return path.join(__dirname, '..');
}

function getRuntimeDataDir() {
  return app.isPackaged
    ? app.getPath('userData')
    : path.join(getElectronRoot(), '.runtime');
}

function getRuntimeEnvPath() {
  return app.isPackaged
    ? path.join(getRuntimeDataDir(), '.env')
    : path.join(getElectronRoot(), '.env');
}

function getPanelDistPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'panel_dist', 'index.html')
    : path.join(getElectronRoot(), '..', 'admin_panel', 'dist', 'index.html');
}

function ensureRuntimeFiles() {
  const electronRoot = getElectronRoot();
  const dataDir = getRuntimeDataDir();
  const envPath = getRuntimeEnvPath();
  const envExamplePath = path.join(electronRoot, '.env.example');

  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
  }

  return {
    electronRoot,
    dataDir,
    envPath,
    dbPath: path.join(dataDir, 'fichajes.db'),
  };
}

function configureAutoStart() {
  try {
    const options = { openAtLogin: true };

    // En desarrollo evita registrar solo electron.exe sin el proyecto.
    if (!app.isPackaged && process.platform === 'win32') {
      options.path = process.execPath;
      options.args = [getElectronRoot()];
    }

    app.setLoginItemSettings(options);
  } catch {
    // El arranque automÃ¡tico no debe impedir que la aplicaciÃ³n se abra.
  }
}


async function canReach(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1200);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return !!response;
  } catch {
    return false;
  }
}

async function resolveRendererTarget() {
  if (process.env.ELECTRON_RENDERER_URL) {
    return { type: 'url', value: process.env.ELECTRON_RENDERER_URL };
  }

  const distPath = getPanelDistPath();
  if (fs.existsSync(distPath)) {
    return { type: 'file', value: distPath };
  }

  throw new Error('No encontré admin_panel/dist/index.html. Ejecuta npm run build en admin_panel.');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    show: false,
    backgroundColor: '#0f172a',
    title: 'Fichaje',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'assets', 'splash.html'));
}

async function startEmbeddedBackend() {
  const port = await getFreePort();
  const runtime = ensureRuntimeFiles();

  process.env.PORT = String(port);
  process.env.APP_DATA_DIR = runtime.dataDir;
  process.env.DB_PATH = runtime.dbPath;
  process.env.DOTENV_CONFIG_PATH = runtime.envPath;
  process.env.TRUST_PROXY = 'false';

  const backendEntry = path.join(runtime.electronRoot, 'backend', 'server.js');
  delete require.cache[require.resolve(backendEntry)];
  const { startBackend } = require(backendEntry);

  const started = await startBackend({ port });
  backendServer = started.server;
  backendPort = started.port;

  return { ...runtime, port: started.port };
}

async function boot() {
  createWindow();
  await startEmbeddedBackend();

  const target = await resolveRendererTarget();
  if (target.type === 'url') {
    await mainWindow.loadURL(target.value);
  } else {
    await mainWindow.loadFile(target.value);
  }
}

ipcMain.handle('backend:get-port', () => backendPort);
ipcMain.handle('app:runtime-info', () => ({
  backendPort,
  userDataPath: getRuntimeDataDir(),
  envPath: getRuntimeEnvPath(),
  isPackaged: app.isPackaged,
}));
ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('app:get-auto-start', () => app.getLoginItemSettings());
ipcMain.handle('app:set-auto-start', (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return app.getLoginItemSettings();
});
ipcMain.handle('file:save', async (_event, { defaultName, contents }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName || 'export.csv',
    filters: [
      { name: 'CSV', extensions: ['csv'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(result.filePath, contents, 'utf8');
  return { ok: true, path: result.filePath };
});

app.whenReady().then(async () => {
  configureAutoStart();

  try {
    await boot();
  } catch (error) {
    dialog.showErrorBox('Error al iniciar Fichaje', `${error.message}

Revisa que el panel estÃ© compilado o que Vite estÃ© arrancado.`);
    app.quit();
    return;
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      try {
        await boot();
      } catch {
        app.quit();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (backendServer) {
    try { backendServer.close(); } catch {}
    backendServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendServer) {
    try { backendServer.close(); } catch {}
    backendServer = null;
  }
});
