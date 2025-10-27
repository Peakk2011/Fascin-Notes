import { ipcMain, app } from 'electron';
import { OS } from '../config/osConfig.js';

/**
 * Helper to register ipcMain.on
 * + auto try/catch + logging
 * @param {string} channel - event name
 * @param {Function} handler - callback and arguments
 */
export class IpcManager {
    constructor() {
        this.tabManager = this.tabManager;
        this.handlers = new Map();
    }

    init() {
        this.setupOSHandler();
        this.setupTabHandlers();
    }

    setupOSHandler() {
        ipcMain.handle('get-os', () => {
            console.log('get-os requested, returning:', OS);
            /*
                Example you will got input like this on your OS 
                "get-os requested, returning: darwin"
            */
            return OS;
        });
    }

    setupTabHandlers() {
        if (!this.tabManager) {
            console.warn('TabManager not ready for IPC handlers');
            return;
        }

        this.registerHandler('new-tab', (event, title) => {
            this.tabManager.createTab(title);
        });

        this.registerHandler('switch-tab', (event, index) => {
            const tab = this.tabManager.tabs[index];
            if (tab) {
                this.tabManager.setActiveTab(tab);
            } else {
                console.error('Invalid tab index for switch:', index);
            }
        });

        this.registerHandler('close-tab', (event, index) => {
            if (this.tabManager?.closeTabByIndex) {
                this.tabManager.closeTabByIndex(index);
            } else {
                console.error('TabManager not ready or missing closeTabByIndex method');
            }
        });

        this.registerHandler('reorder-tabs', (event, from, to) => {
            this.tabManager.reorderTabs(from, to);
        });

        this.registerHandler('close-app', (event) => {
            app.quit();
        });
    }

    setTabManager(tabManager) {
        this.tabManager = tabManager;
        this.setupTabHandlers();
    }

    registerHandler(channel, handler) {
        // Store for cleanup
        this.handlers.set(channel, handler);

        ipcMain.on(channel, (event, ...args) => {
            // console.log(`IPC "${channel}" called with args:`, args);
            try {
                handler(event, ...args);
            } catch (err) {
                console.error(`Error in handler for "${channel}":`, err);
            }
        });
    }

    cleanup() {
        const channels = Array.from(this.handlers.keys());
        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            ipcMain.removeAllListeners(channel);
        }

        this.handlers.clear();
        ipcMain.removeHandler('get-os');
    }
}