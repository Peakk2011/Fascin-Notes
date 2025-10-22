const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    newTab: (title) => ipcRenderer.send('new-tab', title),
    switchTab: (index) => ipcRenderer.send('switch-tab', index),
    closeTab: (index) => ipcRenderer.send('close-tab', index),
    reorderTabs: (from, to) => ipcRenderer.send('reorder-tabs', from, to),
    onInitOS: (callback) => ipcRenderer.on('init-os', (event, OS) => callback(OS)),
});