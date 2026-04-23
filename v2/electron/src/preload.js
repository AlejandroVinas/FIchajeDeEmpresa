const { contextBridge, ipcRenderer } = require('electron');

// Expone al panel React SOLO lo que necesita — nada más.
// contextBridge garantiza que el panel no tiene acceso a Node.js ni a Electron.
contextBridge.exposeInMainWorld('fichaje', {
  // El panel React llama a esto para saber en qué puerto está el backend
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),

  // Para mostrar la versión en el panel si se quiere
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Abre el explorador de archivos para guardar el CSV exportado
  saveFile: (defaultName, data) =>
    ipcRenderer.invoke('save-file', defaultName, data),
});
