/**
 * @file Manages the opening of Developer Tools for a BrowserWindow.
 * @typedef {object} DevToolsOptions
 * @property {boolean} [enabled=true] - Whether DevTools should be opened. Defaults to true in development environment.
 * @property {'undocked' | 'right' | 'bottom' | 'detach'} [mode='undocked'] - The mode to open DevTools in.
 */

export class OpenDevTools {
    /**
     * @param {import('electron').BrowserWindow} window - The window to open DevTools for.
     * @param {DevToolsOptions} [options={}]            - Configuration options.
     */
    constructor(window, options = {}) {
        if (!window || !window.webContents) {
            throw new Error('A valid BrowserWindow instance must be provided.');
        }

        this.window = window;
        this.options = {
            enabled: options.enabled ?? process.env.NODE_ENV === 'development',
            mode: options.mode || 'undocked',
        };

        if (this.options.enabled) {
            this.open();
        }
    }

    // Opens the Developer Tools based on the configured options.
    open() {
        this.window.webContents.openDevTools({ mode: this.options.mode });
    }
}