import { BrowserWindow } from "electron";
import { TabManager } from '../tabManager.js';
import { IpcManager } from '../ipcManager.js';
import { TabStorage } from '../tabStorage.js';
import { TabChangeListener } from '../tabChangeListener.js';
import { registerTabShortcuts } from '../registerTabShortcuts.js';
import { getWindowConfig } from '../../config/windowConfig.js';
import { OpenDevTools } from '../devtools.js';

/**
 * Creates and configures the main BrowserWindow
 * @returns {BrowserWindow}
 */
export const initializeWindow = () => {
    const windowOptions = getWindowConfig();
    const mainWindow = new BrowserWindow(windowOptions);

    mainWindow.show();
    mainWindow.webContents
        .setBackgroundThrottling(true);
    
    mainWindow.setMenu(null);
    new OpenDevTools(mainWindow);

    return mainWindow;
};

/**
 * Creates and connects all core managers
 * @param {BrowserWindow} mainWindow
 * @returns {{ 
 *      tabManager: TabManager,
 *      tabStorage: TabStorage,
 *      ipcManager: IpcManager
 * }}
 */
export const initializeCoreManagers = (mainWindow) => {
    const tabManager = new TabManager(mainWindow);
    const tabStorage = new TabStorage();
    const ipcManager = new IpcManager();

    ipcManager.setTabManager(tabManager);
    ipcManager.init();

    return {
        tabManager,
        tabStorage,
        ipcManager
    };
};

/**
 * Sets up tab change listener and keyboard shortcuts
 * @param {BrowserWindow} mainWindow
 * @param {TabManager} tabManager
 * @param {IpcManager} ipcManager
 * @returns {TabChangeListener}
 */
export const setupTabChangeListener = (mainWindow, tabManager, ipcManager) => {
    const tabChangeListener = new TabChangeListener(
        tabManager,
        ipcManager
    );

    tabChangeListener.start();
    
    registerTabShortcuts(
        mainWindow,
        tabManager
    );

    return tabChangeListener;
};