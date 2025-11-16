import { loadAppStateCache } from '../arch/acceleration.js';
import {
    initializeWindow,
    initializeCoreManagers,
    setupTabChangeListener
} from './window/initializer.js';
import {
    setupInputHandlers,
    setupCloseHandler,
    setupCleanup,
    setupPostInitOperations
} from './window/lifeCycle.js';
import { initializeTabs } from './window/tabInitializer.js';
import { loadInterface } from './window/interfaceLoader.js';

/**
 * Creates and configures the main application window.
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

    // 1. Create and show window
    const mainWindow = initializeWindow();
    console.log(`Window shown: ${Date.now() - startTime}ms`);

    // 2. Initialize core managers
    const { tabManager, tabStorage, ipcManager } = initializeCoreManagers(mainWindow);
    console.log(`Core initialized: ${Date.now() - startTime}ms`);

    // 3. Setup tab change listener and shortcuts
    const tabChangeListener = setupTabChangeListener(mainWindow, tabManager, ipcManager);
    console.log(`Shortcuts registered: ${Date.now() - startTime}ms`);

    // 4. Load interface and cache in parallel
    const [_, cachedAppState] = await Promise.all([
        loadInterface(mainWindow),
        loadAppStateCache()
    ]);

    if (cachedAppState) {
        console.log(`Cache hit: ${Date.now() - startTime}ms`);
    }

    // 5. Initialize tabs
    await initializeTabs(tabManager, cachedAppState);
    console.log(`Tabs structure ready: ${Date.now() - startTime}ms`);
    console.log(`UI loaded: ${Date.now() - startTime}ms`);

    // 6. Setup lifecycle handlers
    setupInputHandlers(mainWindow, tabManager);
    const handleClose = setupCloseHandler(mainWindow, tabManager, tabStorage, ipcManager);
    setupCleanup(mainWindow, tabChangeListener, ipcManager, tabManager, handleClose);

    // 7. Setup post-init operations
    setupPostInitOperations(
        mainWindow,
        tabManager,
        tabStorage,
        ipcManager,
        cachedAppState,
        startTime
    );

    console.log(`App ready: ${Date.now() - startTime}ms\n`);

    return {
        mainWindow,
        tabManager,
        ipcManager,
        tabChangeListener
    };
};