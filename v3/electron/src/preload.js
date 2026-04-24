const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fichaje', {
  getBackendPort: () => ipcRenderer.invoke('backend:get-port'),
  getRuntimeInfo: () => ipcRenderer.invoke('app:runtime-info'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  saveFile: (defaultName, contents) => ipcRenderer.invoke('file:save', { defaultName, contents }),
});
