import path from 'node:path';
import { safeLog } from '../../utils/safeLogger.js';
import { app } from 'electron';

/**
 * Loads the main interface HTML into the window
 * @async
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<void>}
 */
export const loadInterface = async (mainWindow) => {
    const startTime = Date.now();
    const indexPath = path.join(
        app.getAppPath(),
        'src',
        'index.html'
    );

    const loadPromise = mainWindow.loadFile(indexPath);

    safeLog(`loadInterface() called: ${Date.now() - startTime}ms`);
    return loadPromise;
};