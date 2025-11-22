import { ipcMain, app } from 'electron';
import { OS } from '../config/osConfig.js';
import fs from 'fs/promises';
import path from 'path';
import { TabStorage } from './tabStorage.js';

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
        console.log('IPC Manager initialized with all handlers');
    }

    /**
     * Registers an IPC handler to provide the operating system identifier to the renderer process.
     */
    setupOSHandler() {
        ipcMain.handle('get-os', () => {
            console.log('get-os requested, returning:', OS);
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
            console.warn(
                'TabManager not ready for IPC handlers'
            );
            return;
        }

        this.registerHandler('new-tab', (event, title) => {
            this.tabManager.createTab(title);
        });

        this.registerHandler('switch-tab', (event, index) => {
            const tab = this.tabManager.tabs[index];
            if (tab) {
                this.tabManager.setActiveTab(tab);
                // this.syncTabsToAllWindows();
            } else {
                console.error(
                    'Invalid tab index for switch:',
                    index
                );
            }
        });

        this.registerHandler('close-tab', (event, index) => {
            if (!this.tabManager?.closeTabByIndex) {
                console.error(
                    'TabManager not ready or missing closeTabByIndex method'
                );
                return;
            }

            // Get tab count before closing
            const tabCountBefore = this.tabManager.getTabCount();

            if (tabCountBefore <= 1) {
                console.log('Last tab closed - quitting app');
                app.quit();
            } else {
                // Sync tabs to renderer after closing
                this.tabManager.closeTabByIndex(index);
            }
        });

        this.registerHandler('reorder-tabs', (event, from, to) => {
            this.tabManager.reorderTabs(from, to);
            // this.syncTabsToAllWindows();
        });

        this.registerHandler('close-app', (event) => {
            console.log('Close app requested');
            app.quit();
        });

        this.registerHandler('keyboard-shortcut', (event, action) => {
            this.handleKeyboardShortcut(action);
        });
    }

    /**
     * Performs the initial synchronization of tab data to the renderer process.
     * This is typically called once the main window and tabs are ready.
     */
    performInitialSync() {
        if (this.hasInitialSync) {
            console.log('Initial sync already performed');
            return
        }

        if (!this.tabManager) {
            console.warn(
                'TabManager not ready for initial sync'
            );
            return
        }

        console.log('Performing initial tabs sync');
        this.syncTabsToAllWindows();
        this.hasInitialSync = true;
    }

    // Storage handlers
    setupStorageHandlers() {
        // console.log('Setting up storage handlers...');
        
        ipcMain.handle('save-tabs', async () => {
            console.log('save-tabs handler invoked');
            try {
                const allTabs = this.tabManager?.getAllTabs?.() || [];
                const activeTab = this.tabManager?.getActiveTab();

                const tabsToSave = await Promise.all(allTabs.map(async (tab) => {
                    if (tab.view && !tab.view.webContents.isDestroyed()) {
                        const content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""'
                        );
                        return { title: tab.title, content };
                    }
                    return { title: tab.title, content: tab.contentToLoad || '' };
                }));

                const success = await this.tabStorage.saveTabs(
                    tabsToSave,
                    activeTab
                );
                return {
                    success
                };
            } catch (error) {
                console.error(
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
            console.log('load-tabs handler invoked');
            try {
                const tabs = await this.tabStorage.loadTabs();
                return {
                    success: true,
                    tabs
                };
            } catch (error) {
                console.error(
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
            console.log('clear-tabs handler invoked');
            try {
                const success = await this.tabStorage.clearTabs();
                return { success };
            } catch (error) {
                console.error(
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
            console.log('get-storage-path handler invoked');
            try {
                const path = await this.tabStorage.getStoragePath();
                return {
                    success: true,
                    path
                };
            } catch (error) {
                console.error(
                    'Error getting storage path via IPC:',
                    error
                );
            }
        });
        
        console.log('Storage handlers registered: save-tabs, load-tabs, clear-tabs, get-storage-path');
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
                        return { title: tab.title, content };
                    }
                    return { title: tab.title, content: tab.contentToLoad || '' };
                }));

                await this.tabStorage.saveTabs(tabsToSave, activeTab);
                console.log('Saved tabs before quit');
            } catch (error) {
                console.error('Error saving tabs before quit:', error);
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
                    console.log('Last tab - closing app via shortcut');
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
            title: tab.title || 'Untitled',
            url: tab.url || '',
            isActive: tab === activeTab
        }));

        const activeIndex = tabs.indexOf(activeTab);

        const activeTabsCount = tabsData.filter(tab => tab.isActive).length;
        if (activeTabsCount > 1) {
            console.warn(
                `Multiple active tabs detected: ${activeTabsCount}`
            );
            // Kill all inactive except the real active one
            tabsData.forEach((tab, index) => {
                tab.isActive = (index === activeIndex && activeIndex >= 0);
            });
        }

        webContents.send('tabs-sync', {
            tabs: tabsData,
            activeTabIndex: activeIndex >= 0 ? activeIndex : 0
        });

        console.log(
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
            console.log('Skipping auto-save after manual save on close.');
            return;
        }

        if (this.isQuitting) {
            console.log('Skipping auto-save during quit process.');
            return;
        }

        try {
            if (!this.tabManager || !this.tabManager.getAllTabs) {
                console.warn('TabManager not ready for auto-saving');
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
                        return { title: tab.title, content };
                    }
                    return { title: tab.title, content: tab.contentToLoad || '' };
                }));
                const success = await this.tabStorage.saveTabs(
                    tabsToSave,
                    activeTab
                );
                console.log(`Auto-saved ${allTabs.length} tabs`);
            }
        } catch (error) {
            console.error(
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
     * @param {string} channel - The IPC channel name.
     * @param {(event: import('electron').IpcMainEvent, ...args: any[]) => void} handler - The callback function.
     */
    registerHandler(channel, handler) {
        // Store for cleanup
        this.handlers.set(
            channel,
            handler
        );

        ipcMain.on(channel, (event, ...args) => {
            // console.log(`IPC "${channel}" called with args:`, args);
            try {
                handler(
                    event,
                    ...args
                );
            } catch (err) {
                console.error(
                    `Error in handler for "${channel}":`, err
                );
            }
        });
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