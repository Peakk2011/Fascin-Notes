/**
 * @file Provides operating system-specific configurations for the application.
 * This includes details like the OS name, icon paths, and platform-specific setup functions
 * to be applied to the main window.
 */

import { resolvePath } from '../utils/paths.js';

/**
 * The current operating system identifier, derived from `process.platform`.
 * Common values include 'win32', 'darwin' (for macOS), and 'linux'.
 * @type {'win32' | 'darwin' | 'linux' | string}
 */
export const OS = process.platform;

/**
 * @typedef {object} PlatformConfig
 * @property {string} name - The display name of the operating system.
 * @property {string} icon - The absolute path to the application icon file for the platform.
 * @property {function(import('electron').BrowserWindow): void} setup - A function to apply platform-specific settings to the main window.
 */

/**
 * An object containing configuration settings specific to each supported operating system.
 * The keys correspond to the values of `process.platform`.
 * @type {Object<string, PlatformConfig>}
 */
export const osConfig = {
    win32: {
        name: 'Windows',
        icon: resolvePath('../../assets/icons/icon.ico'),
        setup: (win) => {
            win.setMenuBarVisibility(false);
        },
    },
    darwin: {
        name: 'macOS',
        icon: resolvePath('../../assets/icons/icon.icns'), 
        setup: (win) => {
            win.setVibrancy('sidebar');
        },
    },
    linux: {
        name: 'Linux',
        icon: resolvePath('../../assets/icons/icon.png'), 
        setup: () => { },
    }
};