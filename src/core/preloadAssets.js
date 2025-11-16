import { promises as fs } from 'fs';
import { resolvePath } from '../utils/paths.js';

let cachedTabbarHtml = null;
let cachedEncodedHtml = null;
let cachedTabbarPath = null;

export const preloadAssets = async () => {
    const startTime = Date.now();

    if (!cachedTabbarHtml) {
        cachedTabbarPath = resolvePath(
            '../renderer/tabbar/tabbar.html'
        );
        cachedTabbarHtml = await fs.readFile(
            cachedTabbarPath,
            'utf-8'
        );
        cachedEncodedHtml = encodeURIComponent(cachedTabbarHtml);
        console.log(`Assets preloaded in ${Date.now() - startTime}ms`);
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