import { osConfig, OS } from './osConfig.js';
import { resolvePath } from '../utils/paths.js';

/**
 * Generates the configuration object for the main BrowserWindow.
 * It combines a base configuration (like size and webPreferences) with
 * platform-specific settings (like title bar style and transparency)
 * based on the current operating system.
 *
 * @returns {import('electron').BrowserWindowConstructorOptions} The configuration object for creating a new BrowserWindow.
 */
export const getWindowConfig = () => {
    const config = osConfig[OS] || osConfig.linux;

    const windowSizeConfig = {
        width: 600,
        height: 500,
        min: {
            width: 360,
            height: 400
        }
    }

    return {
        width: windowSizeConfig.width,
        height: windowSizeConfig.height,
        minWidth: windowSizeConfig.min.width,
        minHeight: windowSizeConfig.min.height,
        title: `NoteAPP (${config.name})`,
        icon: config.icon || undefined,
        ...(OS === 'darwin' && {
            titleBarStyle: 'hiddenInset',
            transparent: true,
            vibrancy: 'sidebar',
            visualEffectState: 'active',
            hasShadow: true,
        }),
        ...(OS === 'win32' && {
            titleBarStyle: 'hidden',
            titleBarOverlay: {
                color: '#121212',
                symbolColor: '#ffffff',
                height: 36
            }
        }),
        webPreferences: {
            preload: resolvePath('../preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    };
};