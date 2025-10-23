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
            width: 600,
            height: 500,
        },
    };

    const windowOptions = {
        width: windowSizeConfig.width,
        height: windowSizeConfig.height,
        minWidth: windowSizeConfig.min.width,
        minHeight: windowSizeConfig.min.height,
        title: `NoteAPP (${config.name})`,
        icon: config.icon || undefined,
        // OS-specific titlebar styles
        ...(OS === 'darwin' && {
            titleBarStyle: 'hiddenInset',
        }),
        ...(OS === 'win32' && {
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#1f1f1f',
                symbolColor: '#ffffff',
                height: 36
            },
        }),
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
    await Promise.all([
        mainWindow.loadFile(resolvePath('../renderer/tabbar.html')),
        Promise.resolve(config.setup?.(mainWindow))
    ]);

    // Send OS to renderer (frontend)
    mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('init-os', OS);
    });

    // TabManager
    const tabs = new TabManager(mainWindow);
    tabs.createTab('Welcome');

    // IPC for renderer tabbar
    ipcMain.on(
        'new-tab',
        (e, title) => {
            tabs.createTab(title);
        }
    );

    ipcMain.on('switch-tab', (e, index) => {
        if (tabs.tabs[index]) {
            tabs.setActiveTab(tabs.tabs[index]);
        }
    });

    ipcMain.on('close-tab', (e, index) => {
        if (tabs?.closeTabByIndex) {
            tabs.closeTabByIndex(index);
        } else {
            console.error('TabManager not ready or closeTabByIndex missing');
        }
    });

    ipcMain.on('reorder-tabs', (e, fromIndex, toIndex) => {
        tabs.reorderTabs(fromIndex, toIndex);
    });

    mainWindow.on('resize', () => tabs.layoutActiveTab());

    // Cleanup listeners เมื่อปิด window
    mainWindow.once('closed', () => {
        ipcMain.removeAllListeners('new-tab');
        ipcMain.removeAllListeners('switch-tab');
        ipcMain.removeAllListeners('close-tab');
        ipcMain.removeAllListeners('reorder-tabs');
    });

    return { mainWindow, tabs };
};
