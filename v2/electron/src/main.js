const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path   = require('path');
const fs     = require('fs');
const { findFreePort }              = require('./portFinder');
const { launchBackend, killBackend } = require('./backendLauncher');

// ── Estado global ─────────────────────────────────────────────────────────────
let mainWindow   = null;
let backendPort  = null;

// ── Rutas de datos de usuario ─────────────────────────────────────────────────
// userData es la carpeta donde la app puede escribir (AppData en Windows,
// ~/Library/Application Support en macOS, ~/.config en Linux)
function getUserDataPath(...segments) {
  return path.join(app.getPath('userData'), ...segments);
}

// ── Primer arranque: copiar .env.example si no existe .env ────────────────────
function ensureEnvFile() {
  const envDest = getUserDataPath('.env');
  if (fs.existsSync(envDest)) return;

  const isDev     = !app.isPackaged;
  const envSource = isDev
    ? path.join(__dirname, '../../backend/.env.example')
    : path.join(process.resourcesPath, 'backend/.env.example');

  if (fs.existsSync(envSource)) {
    fs.copyFileSync(envSource, envDest);
  }

  // Poner el .env en el PATH de dotenv del backend
  process.env.DOTENV_CONFIG_PATH = envDest;
}

// ── Crear ventana principal ───────────────────────────────────────────────────
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width:           1280,
    height:          800,
    minWidth:        900,
    minHeight:       600,
    title:           'Fichaje — Panel de Administración',
    icon:            path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload:             path.join(__dirname, 'preload.js'),
      contextIsolation:    true,   // Seguridad: el panel no accede a Node
      nodeIntegration:     false,  // Seguridad: idem
      sandbox:             false,  // Necesario para preload con ipcRenderer
      webSecurity:         true,
    },
    show: false, // Se muestra cuando está listo para evitar flash blanco
  });

  // Eliminar menú en producción — los usuarios no técnicos no lo necesitan
  if (app.isPackaged) {
    Menu.setApplicationMenu(null);
  }

  // Cargar el panel React compilado
  const isDev = !app.isPackaged;

  if (isDev) {
    // En desarrollo: Vite sirve en 5173
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const panelDist = path.join(process.resourcesPath, 'panel_dist', 'index.html');
    mainWindow.loadFile(panelDist);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Splash screen — ventana de carga mientras arranca el backend ──────────────
function createSplash() {
  const splash = new BrowserWindow({
    width:           400,
    height:          280,
    frame:           false,
    transparent:     true,
    alwaysOnTop:     true,
    resizable:       false,
    icon:            path.join(__dirname, '../assets/icon.png'),
    webPreferences:  { nodeIntegration: false, contextIsolation: true },
  });

  splash.loadFile(path.join(__dirname, '../assets/splash.html'));
  return splash;
}

// ── IPC handlers — responden a llamadas del preload ───────────────────────────
ipcMain.handle('get-backend-port', () => backendPort);
ipcMain.handle('get-app-version',  () => app.getVersion());

// Guardar archivo CSV usando el diálogo nativo del SO
ipcMain.handle('save-file', async (_event, defaultName, data) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters:     [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, data, 'utf8');
  return { ok: true, filePath };
});

// ── Ciclo de vida de la app ───────────────────────────────────────────────────
app.whenReady().then(async () => {
  const splash = createSplash();

  try {
    ensureEnvFile();

    const dbPath = getUserDataPath('fichajes.db');
    backendPort  = await findFreePort();

    await launchBackend(backendPort, dbPath);

    createWindow(backendPort);
    splash.destroy();
  } catch (err) {
    splash.destroy();
    dialog.showErrorBox(
      'Error al iniciar Fichaje',
      `No se pudo arrancar el servidor interno.\n\n${err.message}`
    );
    app.quit();
  }
});

// En macOS es normal que la app siga en el dock aunque se cierren todas las ventanas
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendPort) {
    createWindow(backendPort);
  }
});

app.on('window-all-closed', () => {
  // En macOS no cerramos hasta que el usuario lo pida explícitamente
  if (process.platform !== 'darwin') {
    killBackend();
    app.quit();
  }
});

app.on('before-quit', () => {
  killBackend();
});

// Prevenir que la app se abra dos veces simultáneamente
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
