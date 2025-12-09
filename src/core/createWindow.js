import {
    initializeWindow,
    initializeCoreManagers
} from './window/initializer.js';
import {
    setupCleanup,
} from './window/lifeCycle.js';
import { loadInterface } from './window/interfaceLoader.js';

/**
 * Creates and configures the main application window.
 * @async
 * @returns {Promise<{
 *      mainWindow: BrowserWindow,
 *      ipcManager: IpcManager
 * }>
 * }
 */

export const createWindow = async () => {
    const startTime = Date.now();

    // 1. Create and show window
    const mainWindow = initializeWindow();
    console.log(`Window shown: ${Date.now() - startTime}ms`);

    // 2. Initialize core managers
    const { ipcManager } = initializeCoreManagers(mainWindow);
    console.log(`Core initialized: ${Date.now() - startTime}ms`);

    // 3. Load interface
    try {
        await loadInterface(mainWindow);
    } catch (err) {
        console.error('Failed to load interface:', err);
    }

    console.log(`UI loaded: ${Date.now() - startTime}ms`);

    // 4. Setup lifecycle handlers
    mainWindow.on('closed', () => { });

    setupCleanup(mainWindow, ipcManager);

    console.log(`App ready: ${Date.now() - startTime}ms\n`);

    return {
        mainWindow,
        ipcManager
    };
};