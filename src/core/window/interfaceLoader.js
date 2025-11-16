import { getCachedEncodedHTML, getCachedTabbarPath } from '../preloadAssets.js';

/**
 * Loads the main interface HTML into the window
 * Uses pre-cached HTML from memory for fast startup
 * @async
 * @param {BrowserWindow} mainWindow
 * @returns {Promise<void>}
 */
export const loadInterface = async (mainWindow) => {
    const encodedHtml = getCachedEncodedHTML();
    const tabbarPath = getCachedTabbarPath();

    return mainWindow.loadURL(
        `data:text/html;charset=UTF-8,${encodedHtml}`,
        {
            baseURLForDataURL: `file://${tabbarPath}`
        }
    );
};