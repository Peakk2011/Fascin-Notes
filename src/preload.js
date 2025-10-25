const { contextBridge, ipcRenderer } = require('electron');

try {
    contextBridge.exposeInMainWorld('electronAPI', {
        newTab: (title) => ipcRenderer.send('new-tab', title),
        switchTab: (index) => ipcRenderer.send('switch-tab', index),
        closeTab: (index) => ipcRenderer.send('close-tab', index),
        reorderTabs: (from, to) => ipcRenderer.send('reorder-tabs', from, to),
        getOS: () => ipcRenderer.invoke('get-os'),
        closeApp: () => ipcRenderer.send('close-app'),

        onTabsUpdated: (callback) => {
            const listener = (event, data) => callback(data);
            ipcRenderer.on('tabs-updated', listener);

            return () => {
                ipcRenderer.removeListener('tabs-updated', listener);
            }
        }
    });
    // console.log('electronAPI exposed successfully');
} catch (error) {
    console.error('Error in preload:', error);
}