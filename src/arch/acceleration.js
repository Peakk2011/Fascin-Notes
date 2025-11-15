import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';

/**
 * Cache Management System
 * Handle cache to boast speed while app opened
 */

const CACHE_DIR = path.join(app.getPath('userData'), 'tab-cache');
const APP_CACHE_FILE = path.join(app.getPath('userData'), 'app-state.cache');

// Cache directory
export const ensureCacheDir = async () => {
    try {
        await fs.mkdir(
            CACHE_DIR,
            {
                recursive: true
            }
        );
    } catch (error) {
        console.error(
            'Failed to create cache directory: ',
            error
        );
    }
};

// Create cache paths for each of the tab
export const getCachePath = (tabId) => {
    return path.join(
        CACHE_DIR,
        `${tabId}.html`
    );
}

// Save HTML cache content for each of the tab
export const saveTabCache = async (tabId, htmlContent) => {
    try {

    } catch (error) {
        console.error(
            `Failed to save cache for tab ${tabId}`,
            error
        );
        return false;
    }
};

// Load the tab's HTML content from the cache.
export const loadTabCache = async (tabId) => {
    try {
        const cachePath = getCachePath(tabId);
        const content = await fs.readFile(
            cachePath,
            'utf-8'
        );
        return content;
    } catch (error) {
        // Hm.. Not need for that
        return null;
    }
};

// Delete cache that not use anymore
export const clearOldCache = async () => {
    try {
        const files = await fs.readdir(CACHE_DIR);
        const validIds = new Set(
            activeTabIds.map(
                id => `${id}.html`
            )
        );

        let deletedCount = 0;

        for (const file of files) {
            if (!validIds.has(file)) {
                await fs.unlink(path.join(CACHE_DIR, file));
                deletedCount++;
            }
        }


        if (deletedCount > 0) {
            console.log(`Removed ${deletedCount}`);
        }
    } catch (error) {
        console.error(
            'Failed to clear old cache',
            error
        );
    }
};

// Save all app state cache snapshot
export const saveAppStateCache = async (state) => {
    try {
        const data = JSON.stringify(state);
        await fs.writeFile(
            APP_CACHE_FILE,
            data,
            'utf-8'
        );

        console.log(
            `App state cached (${(data.length / 1024).toFixed(1)}KB)`
        );
        return true;
    } catch (error) {
        console.error(
            'Failed to save app state cache',
            error
        );
        return false;
    }
};

// Load app state cache
export const loadAppStateCache = async () => {
    try {
        const data = await fs.readFile(
            APP_CACHE_FILE,
            'utf-8'
        );

        const state = JSON.parse(data);
        console.log(
            `App state cache loaded (${(data.length / 1024).toFixed(1)}KB)`
        );
        return state;
    } catch (error) {
        return null;
    }
};

// Delete all cache (used for reset)
export const clearAllCache = async () => {
    try {
        const files = await fs.readdir(CACHE_DIR);

        for (const file of files) {
            await fs.unlink(
                path.join(
                    CACHE_DIR,
                    file
                )
            );
        }
    } catch (error) {
        console.error(
            'Failed to clear cache:',
            error
        );
        return false;
    }
};

// Check the cache size
export const getCacheSize = async () => {
    try {
        const files = await fs.readdir(CACHE_DIR);
        let totalSize = 0;

        for (const file of files) {
            const stat = await fs.stat(
                path.join(CACHE_DIR, file)
            );
            totalSize += stat.size;
        }

        return totalSize;
    } catch (error) {
        return 0;
    }
};