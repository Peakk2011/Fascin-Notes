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

    if (!import.meta.env?.PROD) {
        mainWindow.webContents.openDevTools(
            { mode: 'detach' }
        );
    }

    await mainWindow.loadFile(resolvePath(
        '../renderer/tabbar/tabbar.html'
    ));

    // Load saved tabs
    const savedTabs = await ipcManager.tabStorage.loadTabs();

    if (savedTabs && savedTabs.length > 0) {
        console.log(`Restoring ${savedTabs.length} tabs.`);
        savedTabs.forEach(tabInfo => {
            const newTab = tabManager.createTab(
                tabInfo.title,
                false
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

        // setTimeout(() => {
        //     ipcManager.syncTabsToRenderer(
        //         mainWindow.webContents
        //     );
        // }, 100);
    } else {
        tabManager.createTab('Welcome');
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

    setTimeout(() => {
        ipcManager.performInitialSync();
    }, 500);

    mainWindow.on('resize', () => {
        tabManager.layoutActiveTab();
    });

    mainWindow.on('close', async () => {
        const tabs = tabManager.getAllTabs();
        await tabStorage.saveTabs(
            tabs,
            tabManager.getActiveTab()
        );
        // await ipcManager.autoSaveTabs();
    });

    mainWindow.once('closed', () => {
        tabChangeListener.stop();
        unregisterTabShortcuts();
        ipcManager.cleanup();
        tabManager.destroy();
    });

    return {
        mainWindow,
        tabManager,
        ipcManager,
        tabChangeListener
    };
};