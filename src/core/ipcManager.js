import { ipcMain, app } from 'electron';
import { OS } from '../config/osConfig.js';
import { TabStorage } from './tabStorage.js';
import { safeLog, safeError } from '../utils/safeLogger.js';

/**
 * Helper to register ipcMain.on
 * + auto try/catch + logging
 * @param {string} channel - event name
 * @param {Function} handler - callback and arguments
 */
export class IpcManager {
    constructor() {
        /** @type {import('./tabManager.js').TabManager | null} */
        this.tabManager = null;
        /** @type {Map<string, Function>} */
        this.handlers = new Map();
        /** @type {TabStorage} */
        this.tabStorage = new TabStorage();
        this.hasInitialSync = false;
        /** @type {NodeJS.Timeout | null} */
        this.syncTimeout = null;
        this.isQuitting = false;
        this.manualSaveCompleted = false;
    }

    /**
     * Sets up all IPC event handlers. This should be called after the manager is created.
     */
    init() {
        this.setupOSHandler();
        this.setupStorageHandlers();
        this.setupTabHandlers();
        this.setupAppHandlers();
        safeLog('IPC Manager initialized with all handlers');
    }

    /**
     * Registers an IPC handler to provide the operating system identifier to the renderer process.
     */
    setupOSHandler() {
        ipcMain.handle('get-os', () => {
            safeLog(
                'get-os requested, returning:',
                OS
            );
            /*
                Example you will got input like this on your OS 
                "get-os requested, returning: darwin"
            */
            return OS;
        });
    }

    /**
     * Registers IPC handlers for tab-related actions such as creating, switching,
     * closing, and reordering tabs. These handlers rely on the TabManager instance.
     */
    setupTabHandlers() {
        if (!this.tabManager) {
            safeLog('TabManager not ready for IPC handlers');
            return;
        }

        if (this.handlersRegistered) {
            safeLog('Handlers already registered');
            return;
        }

        this.handlersRegistered = true;

        this.registerHandler('new-tab', (event, title) => {
            try {
                if (!title || typeof title !== 'string') title = 'New Tab';
                this.tabManager.createTab(title);
            } catch (err) {
                safeError(
                    'Failed creating new tab:',
                    err, 
                    title
                );
            }
        });

        this.registerHandler('switch-tab', (event, index) => {
            try {
                const tab = this.tabManager.tabs[index];
                if (tab) {
                    this.tabManager.setActiveTab(tab);
                } else {
                    safeError('Invalid tab index for switch:', index);
                }
            } catch (err) {
                safeError('Error switching tab:', err, index);
            }
        });

        this.registerHandler('close-tab', (event, index) => {
            try {
                if (!this.tabManager?.closeTabByIndex) {
                    safeError('TabManager not ready or missing closeTabByIndex method');
                    return;
                }

                const tabCountBefore = this.tabManager.getTabCount();

                if (tabCountBefore <= 1) {
                    safeLog('Last tab closed - quitting app');
                    app.quit();
                } else {
                    this.tabManager.closeTabByIndex(index);
                }
            } catch (err) {
                safeError('Error closing tab:', err, index);
            }
        });

        this.registerHandler('reorder-tabs', (event, from, to) => {
            try {
                this.tabManager.reorderTabs(from, to);
                // this.syncTabsToAllWindows();
            } catch (err) {
                safeError('Error reordering tabs:', err, from, to);
            }
        });

        this.registerHandler('close-app', (event) => {
            try {
                safeLog('Close app requested');
                app.quit();
            } catch (err) {
                safeError('Error quitting app:', err);
            }
        });

        safeLog('All Tab IPC handlers registered successfully');
    }

    /**
     * Performs the initial synchronization of tab data to the renderer process.
     * This is typically called once the main window and tabs are ready.
     */
    performInitialSync() {
        if (this.hasInitialSync) {
            safeLog('Initial sync already performed');
            return
        }

        if (!this.tabManager) {
            safeLog(
                'TabManager not ready for initial sync'
            );
            return
        }

        safeLog('Performing initial tabs sync');
        this.syncTabsToAllWindows();
        this.hasInitialSync = true;
    }

    // Storage handlers
    setupStorageHandlers() {

        ipcMain.handle('save-tabs', async () => {
            try {
                const allTabs = this.tabManager?.getAllTabs?.() || [];
                const activeTab = this.tabManager?.getActiveTab();

                const tabsToSave = await Promise.all(allTabs.map(async (tab) => {
                    if (tab.view && !tab.view.webContents.isDestroyed()) {
                        const content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""'
                        );
                        return { id: tab.tabId || `tab_${Date.now()}_${Math.random()}`, title: tab.title, content };
                    }
                    return { id: tab.tabId || `tab_${Date.now()}_${Math.random()}`, title: tab.title, content: tab.contentToLoad || '' };
                }));

                const success = await this.tabStorage.saveTabs(
                    tabsToSave,
                    activeTab
                );
                return {
                    success
                };
            } catch (error) {
                safeError(
                    'Error saving tabs via IPC:',
                    error
                );
                return {
                    success: false,
                    error: error.message
                }
            }
        });

        // Load Tabs Handler
        ipcMain.handle('load-tabs', async () => {
            try {
                const tabs = await this.tabStorage.loadTabs();
                return {
                    success: true,
                    tabs
                };
            } catch (error) {
                safeError(
                    'Error loading tabs via IPC:',
                    error
                );
                return {
                    success: false,
                    tabs: [],
                    error: error.message
                };
            }
        });

        // Clear Tabs Handler
        ipcMain.handle('clear-tabs', async () => {
            try {
                const success = await this.tabStorage.clearTabs();
                return { success };
            } catch (error) {
                safeError(
                    'Error clearing tabs via IPC:',
                    error
                );
                return {
                    success: false,
                    error: error.message
                };
            }
        });

        // Handler to request path stroage
        ipcMain.handle('get-storage-path', async () => {
            try {
                const path = await this.tabStorage.getStoragePath();
                return {
                    success: true,
                    path
                };
            } catch (error) {
                safeError(
                    'Error getting storage path via IPC:',
                    error
                );
            }
        });

        safeLog('Storage handlers registered: save-tabs, load-tabs, clear-tabs, get-storage-path');
    }

    // Save tabs before app quits
    setupAppHandlers() {
        app.on('before-quit', async (event) => {
            this.prepareForQuit();

            if (!this.tabManager) {
                return;
            }

            event.preventDefault();
            try {
                const allTabs = this.tabManager.getAllTabs?.() || [];
                const activeTab = this.tabManager.getActiveTab?.() || this.tabManager.getActiveTab();

                const tabsToSave = await Promise.all(allTabs.map(async (tab) => {
                    if (tab.view && !tab.view.webContents.isDestroyed()) {
                        const content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""'
                        );
                        return { id: tab.tabId || `tab_${Date.now()}_${Math.random()}`, title: tab.title, content };
                    }
                    return { id: tab.tabId || `tab_${Date.now()}_${Math.random()}`, title: tab.title, content: tab.contentToLoad || '' };
                }));

                await this.tabStorage.saveTabs(tabsToSave, activeTab);
                safeLog('Saved tabs before quit');
            } catch (error) {
                safeError('Error saving tabs before quit:', error);
            } finally {
                app.exit(0);
            }
        });
    }

    /**
     * Prepares the manager for application shutdown.
     * Sets the quitting flag and clears any pending auto-save timeouts.
     */
    prepareForQuit() {
        this.isQuitting = true;
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
    }

    /**
     * Handles keyboard shortcut actions forwarded from the renderer process.
     * It calls the appropriate TabManager methods based on the action type.
     * @param {{type: string, index?: number}} action - The shortcut action to perform.
     */
    handleKeyboardShortcut(action) {
        if (!this.tabManager) {
            return;
        }

        const tabs = this.tabManager.tabs || [];
        const activeIndex = tabs.indexOf(
            this.tabManager.getActiveTab()
        );

        switch (action.type) {
            case 'new-tab':
                this.tabManager.createTab('New Tab');
                break;

            case 'close-tab':
                // Check if last tab
                if (tabs.length === 1) {
                    safeLog('Last tab - closing app via shortcut');
                    app.quit();
                } else if (tabs.length > 1) {
                    // Reuse the existing 'close-tab' handler
                    // This ensures the logic is identical
                    const handler = this.handlers.get('close-tab');
                    handler(null, activeIndex);
                }
                break;

            case 'next-tab':
                if (tabs.length > 1) {
                    const nextIndex = (activeIndex + 1) % tabs.length;
                    this.tabManager.setActiveTab(
                        tabs[
                        nextIndex
                        ]
                    );
                }
                break;

            case 'prev-tab':
                if (tabs.length > 1) {
                    const prevIndex = (activeIndex - 1 + tabs.length) % tabs.length;
                    this.tabManager.setActiveTab(
                        tabs[
                        prevIndex
                        ]
                    );
                }
                break;

            case 'switch-to-index':
                if (action.index >= 0 && action.index < tabs.length) {
                    this.tabManager.setActiveTab(
                        tabs[
                        action.index
                        ]
                    );
                }
                break;

            case 'switch-to-last':
                if (tabs.length > 0) {
                    this.tabManager.setActiveTab(
                        tabs[
                        tabs.length - 1
                        ]
                    );
                }
                break;

        }
    }

    /**
     * Sends the current tab state (all tabs and the active index) to a specific renderer process.
     * @param {import('electron').WebContents} webContents - The renderer's webContents to send the data to.
     */
    syncTabsToRenderer(webContents) {
        if (!this.tabManager || !webContents || webContents.isDestroyed()) {
            return;
        }

        const tabs = this.tabManager.getAllTabs?.() || this.tabManager.tabs || [];
        const activeTab = this.tabManager.getActiveTab?.();

        const tabsData = tabs.map(tab => ({
            id: tab.tabId || null,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            isActive: tab === activeTab
        }));

        const activeIndex = tabs.indexOf(activeTab);

        const activeTabsCount = tabsData.filter(tab => tab.isActive).length;
        if (activeTabsCount > 1) {
            safeLog(
                `Multiple active tabs detected: ${activeTabsCount}`
            );
            // Kill all inactive except the real active one
            tabsData.forEach((tab, index) => {
                tab.isActive = (index === activeIndex && activeIndex >= 0);
            });
        }

        webContents.send('tabs-sync', {
            tabs: tabsData,
            activeTabIndex: activeIndex >= 0 ? activeIndex : 0,
            activeIndex: activeIndex >= 0 ? activeIndex : 0
        });

        safeLog(
            `Synced ${tabs.length} tabs to renderer`
        );
    }

    /**
     * A throttled method to synchronize the tab state with all renderer windows.
     * It also triggers an auto-save of the current tab state.
     */
    syncTabsToAllWindows() {
        if (!this.tabManager) {
            return;
        }

        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = setTimeout(() => {
            const windows = this.tabManager.getWindows?.() || [this.tabManager.windows];
            windows.forEach(window => {
                if (window && !window.isDestroyed()) {
                    this.syncTabsToRenderer(
                        window.webContents
                    );
                }
            });

            this.autoSaveTabs();
            this.syncTimeout = null;
        }, 100);
    }

    /**
     * Automatically saves the current state of all tabs to persistent storage.
     * This is typically called after any change in the tab structure.
     */
    async autoSaveTabs() {
        if (this.manualSaveCompleted) {
            safeLog('Skipping auto-save after manual save on close.');
            return;
        }

        if (this.isQuitting) {
            safeLog('Skipping auto-save during quit process.');
            return;
        }

        try {
            if (!this.tabManager || !this.tabManager.getAllTabs) {
                safeLog('TabManager not ready for auto-saving');
                return;
            }

            const allTabs = this.tabManager.getAllTabs() || [];
            const activeTab = this.tabManager.getActiveTab ? this.tabManager.getActiveTab() : null;

            if (allTabs.length > 0) {
                const tabsToSave = await Promise.all(allTabs.map(async (tab) => {
                    if (tab.view && !tab.view.webContents.isDestroyed()) {
                        const content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""'
                        );
                        return { id: tab.tabId || `tab_${Date.now()}_${Math.random()}`, title: tab.title, content };
                    }
                    return { id: tab.tabId || `tab_${Date.now()}_${Math.random()}`, title: tab.title, content: tab.contentToLoad || '' };
                }));
                const success = await this.tabStorage.saveTabs(
                    tabsToSave,
                    activeTab
                );
                safeLog(`Auto-saved ${allTabs.length} tabs`);
            }
        } catch (error) {
            safeError(
                'Error auto-saving tabs:',
                error
            );
        }
    }

    /**
     * Notifies the manager that a manual save has occurred, typically on shutdown.
     */
    notifyManualSave() {
        this.manualSaveCompleted = true;
    }

    /**
     * Sets the TabManager instance and initializes the tab-related IPC handlers.
     * This is called after the TabManager has been created.
     * @param {import('./tabManager.js').TabManager} tabManager - The TabManager instance.
     */
    setTabManager(tabManager) {
        this.tabManager = tabManager;
    }

    /**
     * A helper method to register an `ipcMain.on` listener with added logging and error handling.
     * @param {string} channel - IPC channel name.
     * @param {(event: import('electron').IpcMainEvent, ...args: any[]) => void} handler - Callback function.
     * @throws Will log internal errors but never throw to caller.
     */
    registerHandler(channel, handler) {
        if (typeof channel !== 'string' || !channel.trim()) {
            safeError(
                `Invalid IPC channel:`,
                channel
            );
            return;
        }

        if (typeof handler !== 'function') {
            safeError(
                `Invalid IPC handler for "${channel}"`
            );
            return;
        }

        if (this.handlers.has(channel)) {
            const oldHandler = this.handlers.get(channel);
            try {
                ipcMain.removeListener(channel, oldHandler);
                safeLog(
                    `Removed old handler for channel "${channel}"`
                );
            } catch (err) {
                safeError(
                    `Failed removing old handler for "${channel}"`,
                    err
                );
            }
        }

        const wrapped = (event, ...args) => {
            // Fix event = undefined / null
            if (!event) {
                safeError(`IPC event missing for "${channel}"`);
                return;
            }

            try {
                // Protection against handler re-calls
                if (event.__ipcGuard === channel) {
                    safeError(`Recursive IPC call blocked on "${channel}"`);
                    return;
                }

                event.__ipcGuard = channel;
                handler(event, ...args);

            } catch (err) {
                safeError(`IPC Handler Error @ "${channel}":`, {
                    error: err,
                    stack: err?.stack,
                    args
                });

            } finally {
                try {
                    delete event.__ipcGuard;
                } catch (_) {
                    // ignore
                }
            }
        };

        this.handlers.set(channel, wrapped);

        try {
            ipcMain.on(channel, wrapped);
            safeLog(`Registered handler: "${channel}"`);
        } catch (err) {
            safeError(`Failed registering handler for "${channel}"`, err);
        }
    }

    /**
     * Removes all registered IPC listeners to prevent memory leaks when the application is closing.
     */
    cleanup() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }

        const channels = Array.from(
            this.handlers.keys()
        );

        for (let i = 0; i < channels.length; i++) {
            const channel = channels[i];
            ipcMain.removeAllListeners(channel);
        }

        this.handlers.clear();
        ipcMain.removeHandler('get-os');
        ipcMain.removeHandler('save-tabs');
        this.isQuitting = true;
        ipcMain.removeHandler('load-tabs');
        ipcMain.removeHandler('clear-tabs');
        ipcMain.removeHandler('get-storage-path');
    }
}