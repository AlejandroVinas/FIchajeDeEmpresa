const { fork }   = require('child_process');
const path       = require('path');
const { app }    = require('electron');

let backendProcess = null;

/**
 * Lanza el servidor Express como proceso hijo.
 * @param {number} port - Puerto libre encontrado por portFinder
 * @param {string} dbPath - Ruta absoluta al fichero de base de datos
 * @returns {Promise<void>} Resuelve cuando el backend confirma que está escuchando
 */
function launchBackend(port, dbPath) {
  return new Promise((resolve, reject) => {
    // En producción los recursos están en process.resourcesPath
    // En desarrollo están en la carpeta del repo
    const isDev       = !app.isPackaged;
    const backendRoot = isDev
      ? path.join(__dirname, '../../backend')
      : path.join(process.resourcesPath, 'backend');

    const serverPath = path.join(backendRoot, 'server.js');

    // Variables de entorno que necesita el backend.
    // JWT_SECRET y el resto se leen del .env que está en userData
    // (copiado en el primer arranque — ver main.js)
    const env = {
      ...process.env,
      PORT:    String(port),
      DB_PATH: dbPath,
      // Indica al backend que no use pino-pretty (salida limpia en child process)
      NODE_ENV: isDev ? 'development' : 'production',
    };

    backendProcess = fork(serverPath, [], {
      env,
      cwd:    backendRoot,
      silent: true, // stdout/stderr vienen por IPC, no se mezclan con Electron
    });

    // El backend loguea "Backend escuchando" cuando está listo
    backendProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('escuchando') || msg.includes('listening')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('[backend]', data.toString());
    });

    backendProcess.on('error', reject);

    backendProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(`[backend] Proceso terminó con código ${code}, señal ${signal}`);
      }
      backendProcess = null;
    });

    // Timeout de seguridad: si el backend no arranca en 15s algo va mal
    setTimeout(() => reject(new Error('El backend tardó demasiado en arrancar')), 15000);
  });
}

function killBackend() {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
}

module.exports = { launchBackend, killBackend };
