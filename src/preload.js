const { contextBridge, ipcRenderer } = require('electron');

try {
    contextBridge.exposeInMainWorld('electronAPI', {
        newTab: (title) => ipcRenderer.send(
            'new-tab',
            title
        ),
        switchTab: (index) => ipcRenderer.send(
            'switch-tab',
            index
        ),
        closeTab: (index) => ipcRenderer.send(
            'close-tab',
            index
        ),
        reorderTabs: (from, to) => ipcRenderer.send(
            'reorder-tabs',
            from,
            to
        ),

        getOS: () => ipcRenderer.invoke('get-os'),
        closeApp: () => ipcRenderer.send('close-app'),

        sendShortcut: (action) => ipcRenderer.send(
            'keyboard-shortcut',
            action
        ),

        onTabsUpdated: (callback) => {
            const listener = (event, data) => callback(data);
            ipcRenderer.on('tabs-updated', listener);

            return () => {
                ipcRenderer.removeListener('tabs-updated', listener);
            };
        },

        // tab storage
        saveTabs: (tabs) => ipcRenderer.invoke(
            'save-tabs',
            tabs
        ),

        loadTabs: () => ipcRenderer.invoke('load-tabs'),
        clearTabs: () => ipcRenderer.invoke('clear-tabs'),
        getStoragePath: () => ipcRenderer.invoke('get-storage-path'),

        onTabsSync: (callback) => {
            const listener = (event, tabsData) => {
                callback(tabsData);
            }
            ipcRenderer.on(
                'tabs-sync',
                listener
            );
            
            return () => {
                ipcRenderer.removeListener(
                    'tabs-sync',
                    listener
                );
            }
        },

        requestTabsSync: () => ipcRenderer.send(
            'request-tabs-sync'
        ),
    });
} catch (error) {
    console.error('Error in preload:', error);
}