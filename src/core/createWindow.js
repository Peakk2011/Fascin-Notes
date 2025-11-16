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
import { loadAppStateCache } from '../arch/acceleration.js';
import { initPostLoad } from '../arch/redistributables.js';
import {
    saveTabsOnClose,
    loadSavedTabs,
    createWelcomeTab
} from '../arch/fileSystem.js';
import { OpenDevTools } from './devtools.js';

/**
 * Creates and configures the main application window and its core components.
 * Fast startup using:
 * - Parallel operations 
 * - Cached configurations 
 * - Non-blocking awaits
 * - Deferred handlers 
 * 
 * Target: <20ms window show
 * 
 * @async
 * @returns {Promise<{
 *      mainWindow: BrowserWindow,
 *      tabManager: TabManager,
 *      ipcManager: IpcManager,
 *      tabChangeListener: TabChangeListener}>
 * }
 */
export const createWindow = async () => {
    const startTime = Date.now();
    const config = osConfig[OS] || osConfig.linux;

    // Create window
    const windowOptions = getWindowConfig();
    const mainWindow = new BrowserWindow(windowOptions);

    mainWindow.show();
    // Initialize DevTools Manager
    new OpenDevTools(mainWindow);

    console.log(`Window shown: ${Date.now() - startTime}ms`);

    // Lightweight init
    mainWindow.webContents.setBackgroundThrottling(true);
    mainWindow.setMenu(null);

    const tabManager = new TabManager(mainWindow);
    const tabStorage = new TabStorage();
    const ipcManager = new IpcManager();

    ipcManager.setTabManager(tabManager);
    ipcManager.init();

    console.log(
        `Core initialized: ${Date.now() - startTime}ms`
    );

    const loadMainInterface = mainWindow.loadFile(
        resolvePath('../renderer/tabbar/tabbar.html')
    );

    const cachePromise = loadAppStateCache();

    // Setup lightweight components
    const tabChangeListener = new TabChangeListener(
        tabManager,
        ipcManager
    );

    tabChangeListener.start();
    registerTabShortcuts(mainWindow, tabManager);

    console.log(
        `Shortcuts registered: ${Date.now() - startTime}ms`
    );

    const cachedAppState = await cachePromise;

    if (cachedAppState) {
        console.log(
            `Cache hit: ${Date.now() - startTime}ms`
        );
        await loadSavedTabs(cachedAppState, tabManager);
        console.log(
            `Tabs structure ready: ${Date.now() - startTime}ms`
        );
    } else {
        console.log('No cache, creating welcome tab');
        createWelcomeTab(tabManager);
    }

    await loadMainInterface;

    console.log(
        `UI loaded: ${Date.now() - startTime}ms`
    );

    // DOM ready schedule post-init operations
    mainWindow.webContents.once('dom-ready', () => {
        console.log(`DOM ready: ${Date.now() - startTime}ms`);

        // Heavy operations after dom was ready
        setImmediate(() => initPostLoad(
            mainWindow,
            tabManager,
            ipcManager,
            cachedAppState,
            startTime
        ));
    });

    // Defer non-critical event handlers
    setImmediate(() => {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            const tabCount = tabManager?.tabs?.length || 0;
            if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
                if (tabCount > 1) {
                    event.preventDefault();
                }
            }
        });
    });

    // Setup close handler
    const handleClose = () => saveTabsOnClose(
        tabManager,
        tabStorage,
        ipcManager
    );

    mainWindow.on('close', handleClose);

    // Setup cleanup
    mainWindow.once('closed', () => {
        tabChangeListener.stop();
        unregisterTabShortcuts();
        ipcManager.cleanup();
        tabManager.destroy();
        mainWindow.removeListener(
            'close',
            handleClose
        );
    });

    console.log(
        `App ready: ${Date.now() - startTime}ms\n`
    );

    return {
        mainWindow,
        tabManager,
        ipcManager,
        tabChangeListener
    };
};