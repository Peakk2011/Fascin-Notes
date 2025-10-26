import { BrowserWindow } from "electron";
import { TabManager } from './tabManager.js';
import { IpcManager } from './ipcManager.js';
import { 
    registerTabShortcuts,
    unregisterTabShortcuts
} from './registerTabShortcuts.js';
import { getWindowConfig } from '../config/windowConfig.js';
import { resolvePath } from '../utils/paths.js';
import { osConfig, OS } from '../config/osConfig.js';

export const createWindow = async () => {
    const config = osConfig[OS] || osConfig.linux;

    const ipcManager = new IpcManager(null);
    ipcManager.init();

    const windowOptions = getWindowConfig();
    const mainWindow = new BrowserWindow(windowOptions);

    // Protect Ctrl+W/Cmd+W to closing the window
    mainWindow.on('close', (e) => {
        const tabCount = tabManager?.tabs?.length || 0;
        if (tabCount > 1) {
            e.preventDefault();
            // console.log('Prevented window close multiple tabs are open');
        }
    });

    // Protect the default shortcuts (DISABLE)
    // mainWindow.webContents.on('before-input-event', (event, input) => {
    //     // Ctrl+W / Cmd+W
    //     if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
    //         event.preventDefault();
    //         console.log('Blocked default Ctrl/Cmd+W');
    //     }
    // });

    mainWindow.setMenu(null);

    const tabManager = new TabManager(mainWindow);
    ipcManager.setTabManager(tabManager);

    if (!import.meta.env?.PROD) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    await mainWindow.loadFile(resolvePath(
        '../renderer/tabbar/tabbar.html'
    ));

    tabManager.createTab('Welcome');

    await new Promise(
        resolve => setTimeout(resolve, 200)
    );

    registerTabShortcuts(mainWindow, tabManager);
    console.log('Keyboard shortcuts registered');

    mainWindow.on('resize', () => {
        tabManager.layoutActiveTab();
    });
    mainWindow.once('closed', () => {
        unregisterTabShortcuts();
        ipcManager.cleanup();
        tabManager.destroy();
    });

    return {
        mainWindow,
        tabManager,
        ipcManager
    };
};