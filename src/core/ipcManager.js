import { ipcMain, app } from 'electron';
import { OS } from '../config/osConfig.js';
import { TabStorage } from './tabStorage.js';
import { safeLog, safeError } from '../utils/safeLogger.js';

// Debounce helper
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

export class IpcManager {
    constructor() {
        this.tabManager = null;
        this.handlers = new Map();
        this.tabStorage = new TabStorage();
        this.hasInitialSync = false;
        this.isQuitting = false;
        this.manualSaveCompleted = false;

        // Task queue for storage operations
        this.storageQueue = Promise.resolve();
        this.pendingStorage = null;

        // Debounced sync & save
        this.debouncedSync = debounce(() => this._performSyncAndSave(), 150);
    }

    init() {
        this.setupOSHandler();
        this.setupStorageHandlers();
        this.setupAppHandlers();
        safeLog('IPC Manager initialized');
    }

    // === OS ===
    setupOSHandler() {
        ipcMain.handle('get-os', () => OS);
    }

    // === Tab Handlers (เรียกใช้ TabManager) ===
    setupTabHandlers() {
        if (!this.tabManager || this.handlersRegistered) return;
        this.handlersRegistered = true;

        this.registerHandler('request-initial-tab', (event, title) => {
            if (this.tabManager.getTabCount() === 0) {
                this.tabManager.createTab(title || 'Welcome');
                this.scheduleSync();
            }
        });

        this.registerHandler('new-tab', (event, title = 'New Tab') => {
            this.tabManager.createTab(title);
            this.scheduleSync();
        });

        this.registerHandler('switch-tab', (_, index) => {
            const tab = this.tabManager.tabs[index];
            if (tab) this.tabManager.setActiveTab(tab);
            this.scheduleSync();
        });

        this.registerHandler('close-tab', (_, index) => {
            if (!this.tabManager?.closeTabByIndex) return;

            const tabCount = this.tabManager.getTabCount();
            if (tabCount <= 1) {
                app.quit();
            } else {
                this.tabManager.closeTabByIndex(index);
                this.scheduleSync();
            }
        });

        this.registerHandler('reorder-tabs', (_, from, to) => {
            this.tabManager.reorderTabs(from, to);
            this.scheduleSync();
        });

        this.registerHandler('close-app', () => {
            app.quit();
        });

        safeLog('Tab IPC handlers registered');
    }

    // === Storage Handlers (ใช้ queue) ===
    setupStorageHandlers() {
        // Save
        ipcMain.handle('save-tabs', async () => {
            return this.queueStorageOperation(() => this._saveTabs(false));
        });

        // Load
        ipcMain.handle('load-tabs', async () => {
            return this.queueStorageOperation(() => this.tabStorage.loadTabs().then(tabs => ({ success: true, tabs })).catch(err => {
                safeError('Load tabs error:', err);
                return { success: false, tabs: [], error: err.message };
            }));
        });

        // Clear
        ipcMain.handle('clear-tabs', async () => {
            return this.queueStorageOperation(() => this.tabStorage.clearTabs().then(() => ({ success: true })).catch(err => {
                safeError('Clear tabs error:', err);
                return { success: false, error: err.message };
            }));
        });

        // Path
        ipcMain.handle('get-storage-path', async () => {
            try {
                const path = await this.tabStorage.getStoragePath();
                return { success: true, path };
            } catch (err) {
                safeError('Get storage path error:', err);
                return { success: false, error: err.message };
            }
        });

        safeLog('Storage handlers registered');
    }

    // === App Quit ===
    setupAppHandlers() {
        let quitRequested = false;

        app.on('before-quit', async (event) => {
            if (quitRequested || !this.tabManager) return;
            quitRequested = true;
            event.preventDefault();

            this.isQuitting = true;
            this.manualSaveCompleted = false;

            this.saveBeforeQuit().finally(() => {
                app.exit(0); 
            });
        });
    }

    /**
     * A dedicated public method to handle saving all tabs before quitting.
     * This replaces the problematic `autoSaveTabs` call from external modules.
     */
    async saveBeforeQuit() {
        try {
            await this.queueStorageOperation(() => this._saveTabs(true));
            this.notifyManualSave();
        } catch (err) {
            safeError('Failed to save tabs before quitting:', err);
        }
    }

    // === Core Sync & Save ===
    performInitialSync() {
        if (this.hasInitialSync || !this.tabManager) return;
        this.hasInitialSync = true;
        this.scheduleSync();
    }

    scheduleSync() {
        if (this.isQuitting) return;
        this.debouncedSync();
    }

    _performSyncAndSave() {
        if (!this.tabManager || this.isQuitting) return;

        // Sync UI
        const windows = this.tabManager.getWindows?.() || [this.tabManager.windows].filter(Boolean);
        windows.forEach(win => {
            if (win && !win.isDestroyed()) {
                this.syncTabsToRenderer(win.webContents);
            }
        });

        // Auto-save (only if not quitting and not manual-saved)
        if (!this.manualSaveCompleted) {
            this.queueStorageOperation(() => this._saveTabs(false), true);
        }
    }

    async _saveTabs(isManual = false) {
        if (!this.tabManager) return { success: false };

        const allTabs = this.tabManager.getAllTabs?.() || [];
        const activeTab = this.tabManager.getActiveTab?.();

        if (allTabs.length === 0) return { success: true };

        const tabsToSave = await Promise.all(
            allTabs.map(async (tab) => {
                let content = tab.contentToLoad || '';
                if (tab.view && !tab.view.webContents.isDestroyed()) {
                    try {
                        content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""',
                            true // use context isolation
                        );
                    } catch (err) {
                        safeError('Failed to get content from tab:', tab.tabId, err);
                    }
                }
                return {
                    id: tab.tabId || `tab_${Date.now()}_${Math.random()}`,
                    title: tab.title || 'Untitled',
                    content
                };
            })
        );

        try {
            await this.tabStorage.saveTabs(tabsToSave, activeTab);
            if (isManual) safeLog(`Manual saved ${tabsToSave.length} tabs`);
            else safeLog(`Auto-saved ${tabsToSave.length} tabs`);
            return { success: true };
        } catch (err) {
            safeError('Save failed:', err);
            return { success: false, error: err.message };
        }
    }

    // === Sync to Renderer ===
    syncTabsToRenderer(webContents) {
        if (!this.tabManager || !webContents || webContents.isDestroyed()) return;

        const tabs = this.tabManager.getAllTabs?.() || this.tabManager.tabs || [];
        const activeTab = this.tabManager.getActiveTab?.();

        const tabsData = tabs.map(tab => ({
            id: tab.tabId || null,
            title: tab.title || 'Untitled',
            url: tab.url || '',
            isActive: tab === activeTab
        }));

        const activeIndex = tabs.indexOf(activeTab);
        if (activeIndex === -1 && tabs.length > 0) {
            tabsData[0].isActive = true;
        }

        webContents.send('tabs-sync', {
            tabs: tabsData,
            activeTabIndex: activeIndex >= 0 ? activeIndex : 0
        });
    }

    // === Storage Queue (ป้องกัน race) ===
    queueStorageOperation(operation, lowPriority = false) {
        const task = this.pendingStorage || this.storageQueue.then(() => operation());
        this.pendingStorage = lowPriority ? null : task;

        this.storageQueue = this.storageQueue
            .then(() => task)
            .catch(err => safeError('Storage queue error:', err))
            .finally(() => {
                if (this.pendingStorage === task) this.pendingStorage = null;
            });

        return task;
    }

    // === Manual Save Notification ===
    notifyManualSave() {
        this.manualSaveCompleted = true;
    }

    // === Set TabManager ===
    setTabManager(tabManager) {
        this.tabManager = tabManager;
        this.setupTabHandlers(); // auto register
    }

    // === Register Handler (safe) ===
    registerHandler(channel, handler) {
        if (typeof channel !== 'string' || !channel.trim() || typeof handler !== 'function') {
            return safeError('Invalid handler registration');
        }

        // Remove old
        if (this.handlers.has(channel)) {
            const old = this.handlers.get(channel);
            ipcMain.removeListener(channel, old);
        }

        const wrapped = (event, ...args) => {
            if (event.__ipcGuard === channel) return;
            event.__ipcGuard = channel;
            try {
                handler(event, ...args);
            } catch (err) {
                safeError(`IPC Error [${channel}]:`, err, { args });
            } finally {
                delete event.__ipcGuard;
            }
        };

        this.handlers.set(channel, wrapped);
        ipcMain.on(channel, wrapped);
    }

    // === Cleanup ===
    cleanup() {
        safeLog('Starting IPC Manager cleanup...');
        this.isQuitting = true;
        this.debouncedSync.cancel?.();

        // Remove all
        this.handlers.forEach((handler, channel) => {
            ipcMain.removeListener(channel, handler);
        });
        this.handlers.clear();

        // Remove handlers
        ['get-os', 'save-tabs', 'load-tabs', 'clear-tabs', 'get-storage-path'].forEach(ch =>
            ipcMain.removeHandler(ch)
        );

        safeLog('IPC Manager cleaned up');
    }
}