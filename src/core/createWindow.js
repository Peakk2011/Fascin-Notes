import { BrowserWindow, ipcMain } from "electron";
import { TabManager } from './tabManager.js';
import path from 'node:path';
import { resolvePath } from '../utils/paths.js';
import { osConfig, OS } from '../config/osConfig.js';

export const createWindow = async () => {
    const config = osConfig[OS] || osConfig.linux;

    const windowSizeConfig = {
        width: 600,
        height: 500,
        min: {
            width: 800,
            height: 600,
        },
    }

    const windowOptions = {
        width: windowSizeConfig.width,
        height: windowSizeConfig.height,
        minWidth: windowSizeConfig.min.width,
        minHeight: windowSizeConfig.min.height,
        title: `NoteAPP (${config.name})`,
        // icon: config.icon || undefined,  
        // titleBarStyle: 'hiddenInset',
        // titleBarOverlay: {
        //     color: '#ffffff',
        //     symbolColor: '#0f0f0f',
        //     height: 36
        // },
        /*
            I cannot send the ipc across frontend and the main process to direct OS-specific
            Like add class like body.mac or body.windows and the main process on windowOptions
            So I comment this out for now next day I going to do it again

            Today I making:
            - Tabs Feature
            - Main process Components

        */
        webPreferences: {
            preload: resolvePath('../preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    };

    const mainWindow = new BrowserWindow(windowOptions);

    if (!import.meta.env?.PROD) mainWindow.webContents.openDevTools({ mode: 'detach' });

    console.log('OS:', OS);
    console.log('windowOptions:', windowOptions);


    // Load tabbar.html
    await mainWindow.loadFile(resolvePath('../renderer/tabbar.html'));
    config.setup(mainWindow);

    // TabManager
    const tabs = new TabManager(mainWindow);
    tabs.createTab('Welcome');

    // IPC for renderer tabbar
    ipcMain.on('new-tab', (e, title) => tabs.createTab(title));

    ipcMain.on('switch-tab', (e, index) => {
        if (tabs.tabs[index]) {
            tabs.setActiveTab(tabs.tabs[index]);
        };
    });

    ipcMain.on('close-tab', (e, index) => {
        // Tabs need to be tabManager instance
        if (tabs && typeof tabs.closeTabByIndex === 'function') {
            tabs.closeTabByIndex(index);
        } else {
            console.error('TabManager not ready or closeTabByIndex missing');
        }
    });


    ipcMain.on('reorder-tabs', (e, fromIndex, toIndex) => {
        tabs.reorderTabs(fromIndex, toIndex);
    });

    mainWindow.on('resize', () => tabs.layoutActiveTab());

    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('init-os', OS);
    });

    return { mainWindow, tabs };
};
