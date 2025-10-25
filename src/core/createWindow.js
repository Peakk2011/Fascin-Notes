import { BrowserWindow } from "electron";
import { TabManager } from './tabManager.js';
import { IpcManager } from './ipcManager.js';
import { registerTabShortcuts, unregisterTabShortcuts } from './registerTabShortcuts.js';
import { getWindowConfig } from '../config/windowConfig.js';
import { resolvePath } from '../utils/paths.js';
import { osConfig, OS } from '../config/osConfig.js';

export const createWindow = async () => {
    const config = osConfig[OS] || osConfig.linux;

    // Set the IPC 
    const ipcManager = new IpcManager(null);
    ipcManager.init();

    // Create window
    const windowOptions = getWindowConfig();
    const mainWindow = new BrowserWindow(windowOptions);

    // Create tabManager and connect ipcManager
    const tabManager = new TabManager(mainWindow);
    ipcManager.setTabManager(tabManager);

    // Register keyboard shortcuts
    registerTabShortcuts(mainWindow, tabManager);

    // DevTools
    if (!import.meta.env?.PROD) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // Fetch renderer
    await Promise.all([
        mainWindow.loadFile(resolvePath('../renderer/tabbar/tabbar.html')),
        Promise.resolve(config.setup?.(mainWindow))
    ]);

    // Create tab
    tabManager.createTab('Welcome');

    // Event handlers
    mainWindow.on('resize', () => tabManager.layoutActiveTab());
    mainWindow.once('closed', () => {
        ipcManager.cleanup();
        tabManager.destroy();
        unregisterTabShortcuts();
    });

    return {
        mainWindow,
        tabManager,
        ipcManager
    };
};