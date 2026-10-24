const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mh3Desktop', {
  openSaveFiles: () => ipcRenderer.invoke('save:open-dialog'),
  openSaveFolder: () => ipcRenderer.invoke('save:open-folder'),
  onOpenSaveDialog: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('save:request-open-dialog', listener);
    return () => ipcRenderer.removeListener('save:request-open-dialog', listener);
  },
  onOpenSaveFolder: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('save:request-open-folder', listener);
    return () => ipcRenderer.removeListener('save:request-open-folder', listener);
  },
});
