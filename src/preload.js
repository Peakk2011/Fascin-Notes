const { contextBridge, ipcRenderer } = require('electron');

try {
    contextBridge.exposeInMainWorld('electronAPI', {
        getOS: () => ipcRenderer.invoke('get-os'),
        closeApp: () => ipcRenderer.send('close-app'),
    });
} catch (error) {
    console.error('Error in preload:', error);
}