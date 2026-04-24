const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fichaje', {
  getBackendPort: () => ipcRenderer.invoke('backend:get-port'),
  getRuntimeInfo: () => ipcRenderer.invoke('app:runtime-info'),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getAutoStart: () => ipcRenderer.invoke('app:get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('app:set-auto-start', enabled),
  saveFile: (defaultName, contents) => ipcRenderer.invoke('file:save', { defaultName, contents }),
});
