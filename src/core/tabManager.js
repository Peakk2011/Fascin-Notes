import { BrowserView, dialog } from "electron";
import path from 'node:path';
import { resolvePath } from '../utils/paths.js';

const TAB_BAR_HEIGHT = 38;
const MAX_TABS = 7;

/**
 * Manages tabs using BrowserView inside a BrowserWindow.
 * Optimized for performance, memory safety, and responsiveness.
 */
export class TabManager {
    constructor(mainWindow) {
        if (!mainWindow) throw new Error("mainWindow is required");

        this.mainWindow = mainWindow;
        this.tabs = [];
        this.activeTab = null;
        this.isDestroyed = false;
        this._nextTabId = 1;
        this._boundHandlers = new Map();

        // Debounce layout
        this._debouncedLayout = this._debounce(() => this.layoutActiveTab(), 16);

        this._attachWindowListeners();
    }

    // === Private Helpers ===
    _debounce(fn, wait) {
        let timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(fn, wait);
        };
    }

    _attachWindowListeners() {
        if (this._boundHandlers.size > 0) return;

        const handlers = {
            resize: () => this._debouncedLayout(),
            'enter-full-screen': () => this._debouncedLayout(),
            'leave-full-screen': () => this._debouncedLayout(),
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            this.mainWindow.on(event, handler);
            this._boundHandlers.set(event, handler);
        });
    }

    _removeWindowListeners() {
        this._boundHandlers.forEach((handler, event) => {
            try {
                this.mainWindow.removeListener(event, handler);
            } catch (_) {}
        });
        this._boundHandlers.clear();
    }

    _destroyView(view) {
        if (!view) return;
        try {
            if (!view.isDestroyed?.()) view.destroy();
        } catch (_) {}
        try {
            if (view.webContents && !view.webContents.isDestroyed()) {
                view.webContents.destroy();
            }
        } catch (_) {}
    }

    // === Public API ===
    createTab(title = `Tab ${this.tabs.length + 1}`, shouldActivate = true, contentToLoad = null) {
        if (this.isDestroyed) return null;
        if (this.tabs.length >= MAX_TABS) {
            dialog.showMessageBoxSync(this.mainWindow, {
                type: 'warning',
                title: 'Fascinate Note',
                message: `Maximum ${MAX_TABS} tabs allowed.\nPlease close one or resize window.`,
            });
            return null;
        }

        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: resolvePath('../preload.js'),
            }
        });

        const tab = {
            tabId: `tab_${Date.now()}_${this._nextTabId++}`,
            title,
            view,
            loaded: false,
            contentToLoad,
        };

        this.tabs.push(tab);

        if (shouldActivate) {
            this.setActiveTab(tab);
        } else {
            this.activeTab = tab;
        }

        return tab;
    }

    setActiveTab(tab) {
        if (this.isDestroyed || !tab || this.activeTab === tab) return;

        // Remove old
        if (this.activeTab?.view) {
            try {
                this.mainWindow.removeBrowserView(this.activeTab.view);
            } catch (_) {}
        }

        this.activeTab = tab;

        // Load content if first time
        if (!tab.loaded) {
            tab.view.webContents.loadFile(resolvePath('../index.html'));

            if (tab.contentToLoad != null) {
                tab.view.webContents.once('did-finish-load', () => {
                    setTimeout(async () => {
                        try {
                            const escaped = JSON.stringify(tab.contentToLoad);
                            await tab.view.webContents.executeJavaScript(`
                                (function() {
                                    const el = document.getElementById("autoSaveTextarea");
                                    if (el) el.value = ${escaped};
                                })();
                            `);
                            tab.contentToLoad = null;
                        } catch (err) {
                            console.error('Restore content failed:', err);
                        }
                    }, 80);
                });
            }
            tab.loaded = true;
        }

        // Add new
        try {
            this.mainWindow.addBrowserView(tab.view);
            this.layoutActiveTab();
        } catch (err) {
            console.error('Add BrowserView failed:', err);
        }
    }

    layoutActiveTab() {
        if (!this.activeTab?.view || this.isDestroyed) return;

        try {
            const [width, height] = this.mainWindow.getContentSize();
            this.activeTab.view.setBounds({
                x: 0,
                y: TAB_BAR_HEIGHT,
                width,
                height: height - TAB_BAR_HEIGHT
            });
        } catch (err) {
            console.warn('Layout failed:', err);
        }
    }

    reorderTabs(from, to) {
        if (this.isDestroyed) return;
        if (from < 0 || from >= this.tabs.length || to < 0 || to >= this.tabs.length || from === to) return;

        const [tab] = this.tabs.splice(from, 1);
        this.tabs.splice(to, 0, tab);
    }

    closeTab(tab) {
        if (this.isDestroyed || !tab) return;

        const idx = this.tabs.indexOf(tab);
        if (idx === -1) return;

        const wasActive = this.activeTab === tab;

        // Remove from window
        if (tab.view) {
            try { this.mainWindow.removeBrowserView(tab.view); } catch (_) {}
            this._destroyView(tab.view);
            tab.view = null;
        }

        this.tabs.splice(idx, 1);

        if (wasActive && this.tabs.length > 0) {
            const nextIdx = Math.min(idx, this.tabs.length - 1);
            this.setActiveTab(this.tabs[nextIdx]);
        } else if (wasActive) {
            this.activeTab = null;
        }
    }

    closeTabByIndex(index) {
        if (index < 0 || index >= this.tabs.length) return;
        this.closeTab(this.tabs[index]);
    }

    getTabCount() {
        return this.tabs.length;
    }

    getActiveTab() {
        return this.activeTab;
    }

    getAllTabs() {
        return [...this.tabs];
    }

    closeAllTabs() {
        if (this.isDestroyed) return;
        [...this.tabs].forEach(tab => this.closeTab(tab));
    }

    // === Cleanup ===
    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        // Close all tabs
        this.closeAllTabs();

        // Remove listeners
        this._removeWindowListeners();

        // Clear refs
        this.mainWindow = null;
        this.activeTab = null;
        this.tabs = [];
    }

    isManagerDestroyed() {
        return this.isDestroyed;
    }
}