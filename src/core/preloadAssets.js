import { promises as fs } from 'fs';
import { safeLog } from '../utils/safeLogger.js';
import { resolvePath } from '../utils/paths.js';

let cachedTabbarHtml = null;
let cachedEncodedHtml = null;
let cachedTabbarPath = null;

export const preloadAssets = async () => {
    const startTime = Date.now();

    // Path to load HTML
    if (!cachedTabbarHtml) {
        cachedTabbarPath = resolvePath(
            '../index.html'
        );
        cachedTabbarHtml = await fs.readFile(
            cachedTabbarPath,
            'utf-8'
        );
        cachedEncodedHtml = encodeURIComponent(cachedTabbarHtml);
        safeLog(`Assets preloaded in ${Date.now() - startTime}ms`);
    }
};

export const getCachedEncodedHTML = () => {
    if (!cachedEncodedHtml) {
        throw new Error(
            'Assets not preloaded yet'
        );
    }
    return cachedEncodedHtml;
};

export const getCachedTabbarPath = () => {
    if (!cachedTabbarPath) {
        throw new Error(
            'Assets not preloaded yet'
        );
    }
    return cachedTabbarPath;
};

export const clearCache = () => {
    cachedEncodedHtml = null;
    cachedTabbarPath = null;
    cachedTabbarHtml = null;
};