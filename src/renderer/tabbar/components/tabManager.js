import { Tab } from './tabs/tab.js';
import { IdManager } from './tabs/idManager.js';
import { TabIPCBridge } from './tabs/tabIPCBridge.js';
import { TabValidator } from './tabs/tabValidator.js';

/**
 * Manages the entire lifecycle of tabs within the tab bar UI.
 */
export class TabManager {
    constructor(tabbar, addBtn) {
        this.tabbar = tabbar;
        this.addBtn = addBtn;

        // State
        this.tabs = new Map();
        this.tabOrder = [];
        this.activeTabId = null;
        this.isDestroyed = false;
        this.lastSyncData = null;
        this.isSyncing = false;

        // Components
        this.idManager = new IdManager();
        this.ipcBridge = new TabIPCBridge();
        this.validator = new TabValidator();

        // Event handlers
        this._addClickHandler = null;
        this._unsubscribeIPC = null;

        this.init();
    }

    /**
     * Initializes the TabManager
     */
    init() {
        if (this.isDestroyed) return;
        
        this.setupIPC();
        this.setupEventListeners();
    }

    /**
     * Sets up IPC communication
     */
    setupIPC() {
        if (!this.ipcBridge || this.isDestroyed) return;

        try {
            this.ipcBridge.init();
            this._unsubscribeIPC = this.ipcBridge.onTabsUpdated((data) => {
                if (!this.isDestroyed) {
                    this.syncWithMainProcess(data);
                }
            });
        } catch (error) {
            console.error('Failed to setup IPC:', error);
        }
    }

    /**
     * Sets up event listeners
     */
    setupEventListeners() {
        if (!this.addBtn || this.isDestroyed) return;

        // Remove existing listener if any
        if (this._addClickHandler) {
            this.addBtn.removeEventListener('click', this._addClickHandler);
        }

        this._addClickHandler = (event) => {
            if (this.isDestroyed) return;

            try {
                // Use IPC if available
                if (this.ipcBridge?.isAvailable) {
                    this.ipcBridge.notifyNewTab('New Tab');
                    return;
                }
                
                // Fallback to local creation
                this.createTab();
            } catch (error) {
                console.error('Error creating new tab:', error);
            }
        };

        this.addBtn.addEventListener('click', this._addClickHandler, { passive: true });
    }

    /**
     * Creates a new tab
     */
    createTab(title = 'New Tab', setActive = true) {
        if (this.isDestroyed || !this.tabbar) {
            return null;
        }

        // Validate
        const canCreate = this.validator.canCreateTab(this.tabOrder.length);
        if (!canCreate.valid) {
            console.warn(canCreate.reason);
            return null;
        }

        const titleValidation = this.validator.validateTitle(title);
        const sanitizedTitle = titleValidation.sanitized || title;

        // Create tab
        const id = this.idManager.getNewId();
        const tab = new Tab(id, sanitizedTitle);

        // Setup callbacks
        tab.onClose = (id) => this.closeTab(id);
        tab.onClick = (id) => this.switchTab(id);

        // Add to DOM and state
        this.tabbar.insertBefore(tab.getElement(), this.addBtn);
        this.tabs.set(id, tab);
        this.tabOrder.push(id);

        if (setActive) {
            this.switchTab(id);
        }

        // Notify main process
        if (this.ipcBridge) {
            this.ipcBridge.notifyNewTab(sanitizedTitle);
        }

        return id;
    }

    /**
     * Switches the active tab
     */
    switchTab(id) {
        if (this.isDestroyed || !this.tabs.has(id) || this.activeTabId === id) {
            return;
        }

        // Deactivate all tabs
        this.tabs.forEach(tab => tab.setActive(false));

        // Activate target tab
        const tab = this.tabs.get(id);
        tab.setActive(true);
        this.activeTabId = id;

        // Notify main process
        const index = this.tabOrder.indexOf(id);
        if (index !== -1 && this.ipcBridge) {
            this.ipcBridge.notifySwitchTab(index);
        }

        // Dispatch content ready event
        this.dispatchTabContentReady(id);
    }

    /**
     * Dispatches tab content ready event
     */
    dispatchTabContentReady(tabId) {
        try {
            const tab = this.tabs.get(tabId);
            if (!tab) return;

            window.dispatchEvent(new CustomEvent('tab-content-ready', {
                detail: {
                    tabId: tab.remoteId || tabId,
                    content: tab.contentToLoad || ''
                }
            }));
        } catch (error) {
            console.error('Error dispatching tab content event:', error);
        }
    }

    /**
     * Closes a tab
     */
    async closeTab(id) {
        if (this.isDestroyed || !this.tabs.has(id)) {
            return;
        }

        const index = this.tabOrder.indexOf(id);
        const tab = this.tabs.get(id);

        try {
            await tab.close();
            this.destroyTab(tab);

            this.tabs.delete(id);
            this.tabOrder.splice(index, 1);
            this.idManager.releaseId(id);

            // Handle app closure if no tabs left
            if (this.tabOrder.length === 0) {
                if (this.ipcBridge) {
                    this.ipcBridge.notifyCloseApp();
                }
                return;
            }

            // Switch to next appropriate tab
            const nextIndex = Math.min(index, this.tabOrder.length - 1);
            if (nextIndex >= 0) {
                this.switchTab(this.tabOrder[nextIndex]);
            }

            // Notify main process
            if (this.ipcBridge) {
                this.ipcBridge.notifyCloseTab(index);
            }
        } catch (error) {
            console.error('Error closing tab:', error);
        }
    }

    /**
     * Destroys a single tab
     */
    destroyTab(tab) {
        if (!tab) return;

        try {
            // Clear callbacks to prevent memory leaks
            tab.onClose = null;
            tab.onClick = null;

            // Call tab's destroy method if available
            if (typeof tab.destroy === 'function') {
                tab.destroy();
            }

            // Remove from DOM
            const element = tab.getElement();
            if (element && element.parentNode) {
                element.remove();
            }
        } catch (error) {
            console.error('Error destroying tab:', error);
        }
    }

    /**
     * Reorders tabs
     */
    reorderTabs(fromIndex, toIndex) {
        if (this.isDestroyed) return;

        const isValid = this.validator.validateReorder(fromIndex, toIndex, this.tabOrder.length);
        if (!isValid) return;

        try {
            const id = this.tabOrder[fromIndex];
            
            // Update internal order
            this.tabOrder.splice(fromIndex, 1);
            this.tabOrder.splice(toIndex, 0, id);

            // Update DOM order
            const tab = this.tabs.get(id);
            let referenceElement = this.addBtn;

            if (toIndex < this.tabOrder.length - 1) {
                const nextTabId = this.tabOrder[toIndex + 1];
                const nextTab = this.tabs.get(nextTabId);
                if (nextTab) {
                    referenceElement = nextTab.getElement();
                }
            }

            if (this.tabbar && tab) {
                this.tabbar.insertBefore(tab.getElement(), referenceElement);
                tab.addMergeAnimation();
            }

            // Notify main process
            if (this.ipcBridge) {
                this.ipcBridge.notifyReorderTabs(fromIndex, toIndex);
            }
        } catch (error) {
            console.error('Error reordering tabs:', error);
        }
    }

    /**
     * Synchronizes with main process state
     */
    syncWithMainProcess(data) {
        if (this.isDestroyed || !data || this.isSyncing) {
            return;
        }

        const newSyncData = JSON.stringify({
            tabs: data.tabs?.map(t => t.title) || [],
            activeIndex: data.activeIndex
        });

        if (this.lastSyncData === newSyncData) {
            return;
        }

        this.isSyncing = true;
        this.lastSyncData = newSyncData;

        try {
            const { tabs, activeIndex } = data;

            // Clear existing tabs
            this.cleanupAllTabs();

            // Create new tabs from sync data
            if (Array.isArray(tabs)) {
                tabs.forEach((tabData, index) => {
                    if (!tabData?.title) return;

                    // Check tab limit
                    const canCreate = this.validator.canCreateTab(this.tabOrder.length);
                    if (!canCreate.valid) {
                        console.warn(`Tab limit reached. Skipping tab: ${tabData.title}`);
                        return;
                    }

                    const id = this.idManager.getNewId();
                    const tab = new Tab(id, tabData.title);

                    // Store additional data
                    tab.contentToLoad = tabData.content || '';
                    tab.remoteId = tabData.id || null;

                    // Setup callbacks
                    tab.onClose = (id) => this.closeTab(id);
                    tab.onClick = (id) => this.switchTab(id);

                    // Add to DOM and state
                    this.tabbar.insertBefore(tab.getElement(), this.addBtn);
                    this.tabs.set(id, tab);
                    this.tabOrder.push(id);

                    // Dispatch content event for all tabs during sync
                    this.dispatchTabContentReady(id);
                });

                // Set active tab
                if (activeIndex >= 0 && activeIndex < this.tabOrder.length) {
                    this.switchTab(this.tabOrder[activeIndex]);
                } else if (this.tabOrder.length > 0) {
                    this.switchTab(this.tabOrder[0]);
                }
            }

            console.log(`Synced ${tabs?.length || 0} tabs from main process`);
        } catch (error) {
            console.error('Error syncing with main process:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Cleans up all tabs
     */
    cleanupAllTabs() {
        try {
            this.tabs.forEach((tab) => {
                this.destroyTab(tab);
            });

            this.tabs.clear();
            this.tabOrder = [];
            this.activeTabId = null;
        } catch (error) {
            console.error('Error cleaning up tabs:', error);
        }
    }

    /**
     * Updates tab title
     */
    updateTabTitle(id, newTitle) {
        if (this.isDestroyed || !this.tabs.has(id)) {
            return;
        }

        const validation = this.validator.validateTitle(newTitle);
        const tab = this.tabs.get(id);
        tab.updateTitle(validation.sanitized || newTitle);
    }

    // Getters
    getTabOrder() { return [...this.tabOrder]; }
    getActiveTabId() { return this.activeTabId; }
    hasTab(id) { return this.tabs.has(id); }
    getTabCount() { return this.tabOrder.length; }

    getTabInfo(id) {
        const tab = this.tabs.get(id);
        if (!tab) return null;

        return {
            ...tab.getInfo(),
            index: this.tabOrder.indexOf(id)
        };
    }

    /**
     * Completely destroys the TabManager
     */
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;

        try {
            // Remove IPC listener
            if (typeof this._unsubscribeIPC === 'function') {
                this._unsubscribeIPC();
            }

            // Remove event listeners
            if (this.addBtn && this._addClickHandler) {
                this.addBtn.removeEventListener('click', this._addClickHandler);
            }

            // Clean up all tabs
            this.cleanupAllTabs();

            // Destroy components
            if (this.idManager && typeof this.idManager.destroy === 'function') {
                this.idManager.destroy();
            }

            if (this.ipcBridge && typeof this.ipcBridge.destroy === 'function') {
                this.ipcBridge.destroy();
            }

            // Clear references
            this.tabbar = null;
            this.addBtn = null;
            this._addClickHandler = null;
            this._unsubscribeIPC = null;
            
        } catch (error) {
            console.error('Error during TabManager destruction:', error);
        }
    }
}