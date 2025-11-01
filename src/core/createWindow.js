import { BrowserWindow } from "electron";
import { TabManager } from './tabManager.js';
import { IpcManager } from './ipcManager.js';
import { TabStorage } from './tabStorage.js';
import {
    registerTabShortcuts,
    unregisterTabShortcuts
} from './registerTabShortcuts.js';
import { getWindowConfig } from '../config/windowConfig.js';
import { resolvePath } from '../utils/paths.js';
import { osConfig, OS } from '../config/osConfig.js';
import { TabChangeListener } from './tabChangeListener.js';

/**
 * Creates and configures the main application window and its core components.
 * This function orchestrates the entire setup process, including:
 * - Initializing the main browser window with platform-specific configurations.
 * - Setting up IPC communication between the main and renderer processes.
 * - Managing tabs, including restoring tabs from the previous session.
 * - Registering global keyboard shortcuts for tab navigation and management.
 * - Handling window lifecycle events like 'close' and 'closed' for cleanup and state persistence.
 *
 * @async
 * @returns {Promise<{mainWindow: BrowserWindow, tabManager: TabManager, ipcManager: IpcManager, tabChangeListener: TabChangeListener}>}
 * A Promise that resolves to an object containing the application's initialized core components:
 * - `mainWindow`: The main Electron BrowserWindow instance.
 * - `tabManager`: The instance that manages the application's tabs.
 * - `ipcManager`: The instance that handles IPC communication.
 * - `tabChangeListener`: The instance that listens for and broadcasts tab state changes.
 */
export const createWindow = async () => {
    const config = osConfig[OS] || osConfig.linux;

    const tabStorage = new TabStorage();
    const ipcManager = new IpcManager(null);
    ipcManager.init();

    const windowOptions = getWindowConfig();
    const mainWindow = new BrowserWindow(windowOptions);

    // Protect Ctrl+W/Cmd+W to closing the window
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const tabCount = tabManager?.tabs?.length || 0;

        if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
            if (tabCount > 1) {
                event.preventDefault();
                console.log(
                    'Blocked Ctrl/Cmd+W - multiple tabs open'
                );
            }
        }
    });

    mainWindow.setMenu(null);

    const tabManager = new TabManager(mainWindow);
    ipcManager.setTabManager(tabManager);

    // Open DevTools if not in production mode
    if (!import.meta.env?.PROD) {
        mainWindow.webContents.openDevTools(
            { mode: 'detach' }
        );
    }

    await mainWindow.loadFile(resolvePath(
        '../renderer/tabbar/tabbar.html'
    ));

    // Load saved tabs from the previous session
    const savedTabs = await ipcManager.tabStorage.loadTabs();

    if (savedTabs && savedTabs.length > 0) {
        console.log(`Restoring ${savedTabs.length} tabs.`);
        savedTabs.forEach(tabInfo => {
            const newTab = tabManager.createTab(
                tabInfo.title,
                false,
                tabInfo.content || null
            );
            
            if (tabInfo.url) {
                newTab.view.webContents.loadURL(
                    tabInfo.url
                );
            }
        });

        const activeIndex = savedTabs.findIndex(
            t => t.isActive
        );
        
        if (activeIndex >= 0 && tabManager.tabs[activeIndex]) {
            tabManager.setActiveTab(
                tabManager.tabs[
                    activeIndex
                ]
            );
        } else {
            tabManager.setActiveTab(
                tabManager.tabs[0]
            );
        }

        ipcManager.syncTabsToAllWindows();
    } else {
        tabManager.createTab('Welcome');
        // Sync this new "Welcome" tab to the renderer process
        ipcManager.syncTabsToAllWindows();
    }

    await new Promise(
        resolve => setTimeout(
            resolve,
            200
        )
    );

    const tabChangeListener = new TabChangeListener(
        tabManager,
        ipcManager
    );

    tabChangeListener.start();

    registerTabShortcuts(
        mainWindow,
        tabManager
    );

    console.log('Keyboard shortcuts registered');

    const handleClose = async () => {
        const tabs = tabManager.getAllTabs();
        await tabStorage.saveTabs(
            tabs,
            tabManager.getActiveTab()
        );
        await ipcManager.autoSaveTabs();
    };

    mainWindow.on('close', handleClose);

    mainWindow.once('closed', () => {
        tabChangeListener.stop();
        unregisterTabShortcuts();
        ipcManager.cleanup();
        tabManager.destroy();
        mainWindow.removeListener('close', handleClose);
    });

    return {
        mainWindow,
        tabManager,
        ipcManager,
        tabChangeListener
    };
};