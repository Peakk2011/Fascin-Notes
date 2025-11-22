import { getCachedEncodedHTML, getCachedTabbarPath } from '../preloadAssets.js';
import { safeLog } from '../../utils/safeLogger.js';

/**
 * Loads the main interface HTML into the window
 * Uses pre-cached HTML from memory for fast startup
 * @async
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<void>}
 */
export const loadInterface = async (mainWindow) => {
    const startTime = Date.now();
    const encodedHtml = getCachedEncodedHTML();
    const tabbarPath = getCachedTabbarPath();

    const loadPromise = mainWindow.loadURL(
        `data:text/html;charset=UTF-8,${encodedHtml}`,
        {
            baseURLForDataURL: `file://${tabbarPath}`
        }
    );

    safeLog(`loadInterface() called: ${Date.now() - startTime}ms`);
    return loadPromise;
};