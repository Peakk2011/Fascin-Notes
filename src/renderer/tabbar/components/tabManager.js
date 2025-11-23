import { Tab } from './tabs/tab.js';
import { IdManager } from './tabs/idManager.js';
import { TabIPCBridge } from './tabs/tabIPCBridge.js';
import { TabValidator } from './tabs/tabValidator.js';

/**
 * Manages the entire lifecycle of tabs within the tab bar UI.
 * This class is responsible for creating, switching, closing, reordering,
 * and synchronizing tabs with the main process. It delegates specific tasks
 * to specialized components like IdManager, TabIPCBridge, and TabValidator.
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

        // Handler to cleanup
        this.handleAddClick = null;
        this.unsubscribeIPC = null;

        this.isInitialSync = false;
        this.init();
    }

    /**
     * Initializes the TabManager by setting up IPC communication and event listeners.
     */
    init() {
        this.setupIPC();
        this.setupEventListeners();
    }

    /**
     * Sets up the IPC bridge to listen for tab state updates from the main process.
     * @private
     */
    setupIPC() {
        this.ipcBridge.init();

        // Store unsubscribe function (if ipcBridge supported)
        this.unsubscribeIPC = this.ipcBridge.onTabsUpdated((data) => {
            if (!this.isDestroyed) {
                this.syncWithMainProcess(data);
            }
        });
    }

    /**
     * Attaches event listeners, primarily the click handler for the 'add tab' button.
     * @private
     */
    setupEventListeners() {
        if (!this.addBtn) return;

        // Handler function
        this.handleAddClick = () => {
            if (!this.isDestroyed) {
                this.createTab();
            }
        };

        this.addBtn.addEventListener(
            'click',
            this.handleAddClick,
            {
                passive: true
            }
        );
    }

    /**
     * Creates a new tab, adds it to the DOM and internal state, and notifies the main process.
     * @param {string} [title='New Tab'] - The initial title for the new tab.
     * @param {boolean} [setActive=true] - Whether to make the new tab active immediately.
     * @returns {number|null} The ID of the newly created tab, or null if creation failed (e.g., tab limit reached).
     */
    createTab(title = 'New Tab', setActive = true) {
        if (this.isDestroyed || !this.tabbar) {
            return null;
        }

        // Validate
        const canCreate = this.validator.canCreateTab(
            this.tabOrder.length
        );

        if (!canCreate.valid) {
            alert(canCreate.reason);
            return null;
        }

        const titleValidation = this.validator.validateTitle(title);
        const sanitizedTitle = titleValidation.sanitized || title;

        // Create tab
        const id = this.idManager.getNewId();
        const tab = new Tab(
            id,
            sanitizedTitle
        );

        // Setup callbacks
        tab.onClose = (id) => this.closeTab(id);
        tab.onClick = (id) => this.switchTab(id);

        // Add to DOM and state
        this.tabbar.insertBefore(
            tab.getElement(),
            this.addBtn
        );

        this.tabs.set(
            id,
            tab
        );

        this.tabOrder.push(id);

        if (setActive) {
            this.switchTab(id);
        }

        // Always notify main process when creating tabs
        this.ipcBridge.notifyNewTab(sanitizedTitle);

        return id;
    }

    /**
     * Switches the active tab to the one specified by the ID.
     * @param {number} id - The ID of the tab to activate.
     */
    switchTab(id) {
        if (this.isDestroyed || !this.tabs.has(id) || this.activeTabId === id) {
            return;
        }

        try {
            this.tabs.forEach(
                tab => tab.setActive(false)
            );

            const tab = this.tabs.get(id);
            tab.setActive(true);
            this.activeTabId = id;

            const index = this.tabOrder.indexOf(id);
            if (index !== -1) {
                this.ipcBridge.notifySwitchTab(index);
                // Emit content ready event for the newly active tab so note editor can load it
                try {
                    const activeTab = this.tabs.get(id);
                    const content = (activeTab && activeTab.contentToLoad) ? activeTab.contentToLoad : '';
                    window.dispatchEvent(new CustomEvent('tab-content-ready', {
                        detail: {
                            tabId: (activeTab && activeTab.remoteId) ? activeTab.remoteId : id,
                            content
                        }
                    }));
                } catch (e) {
                    // ignore
                }
            }
        } catch (error) {
            console.error(
                'Error switching tab:',
                error
            );
        }
    }

    /**
     * Closes a tab specified by its ID, removes it from the DOM, and cleans up its resources.
     * It also handles activating the next appropriate tab.
     * @param {number} id - The ID of the tab to close.
     */
    async closeTab(id) {
        if (this.isDestroyed || !this.tabs.has(id)) {
            return;
        }

        try {
            const index = this.tabOrder.indexOf(id);
            const tab = this.tabs.get(id);

            await tab.close();

            this.destroyTab(tab);

            this.tabs.delete(id);
            this.tabOrder.splice(index, 1);
            this.idManager.releaseId(id);

            if (this.tabOrder.length === 0) {
                this.ipcBridge.notifyCloseApp();
                return;
            }

            const nextIndex = Math.min(
                index,
                this.tabOrder.length - 1
            );

            if (nextIndex >= 0) {
                this.switchTab(this.tabOrder[nextIndex]);
            }

            this.ipcBridge.notifyCloseTab(index);
        } catch (error) {
            console.error(
                'Error closing tab:',
                error
            );
        }
    }

    /**
     * A helper method to fully destroy a tab object and its associated DOM element.
     * @param {Tab} tab - The tab instance to destroy.
     * @private
     */
    destroyTab(tab) {
        if (!tab) return;

        try {
            // Clear callbacks
            tab.onClose = null;
            tab.onClick = null;

            if (typeof tab.destroy === 'function') {
                tab.destroy();
            }

            const element = tab.getElement();
            if (element && element.parentNode) {
                element.remove();
            }
        } catch (error) {
            console.error(
                'Error destroying tab:',
                error
            );
        }
    }

    /**
     * Reorders a tab from one index to another, updating the internal state and the DOM.
     * @param {number} fromIndex - The original index of the tab.
     * @param {number} toIndex - The new index for the tab.
     */
    reorderTabs(fromIndex, toIndex) {
        if (this.isDestroyed) return;

        const isValid = this.validator.validateReorder(
            fromIndex,
            toIndex,
            this.tabOrder.length
        );

        if (!isValid) return;

        try {
            // Reorder in state
            const id = this.tabOrder[fromIndex];
            this.tabOrder.splice(fromIndex, 1);
            this.tabOrder.splice(toIndex, 0, id);

            const tab = this.tabs.get(id);
            let nextElement;
            
            if (toIndex < this.tabOrder.length - 1) {
                const nextTabId = this.tabOrder[toIndex + 1];
                const nextTab = this.tabs.get(nextTabId);
                nextElement = nextTab ? nextTab.getElement() : null;
            } else {
                nextElement = this.addBtn;
            }

            if (this.tabbar && nextElement) {
                this.tabbar.insertBefore(tab.getElement(), nextElement);
            }

            tab.addMergeAnimation();

            // Notify IPC
            this.ipcBridge.notifyReorderTabs(fromIndex, toIndex);
        } catch (error) {
            console.error(
                'Error reordering tabs:',
                error
            );
        }
    }

    /**
     * Synchronizes the tab bar's state with the authoritative state received from the main process.
     * This method clears all existing tabs and rebuilds them based on the provided data,
     * ensuring the UI is consistent with the application's backend state.
     * @param {object} data - The synchronization data from the main process.
     */
    syncWithMainProcess(data) {
        if (this.isDestroyed || !data) {
            return;
        }

        if (this.isSyncing) {
            // console.warn('Already syncing');
            return;
        }

        const newSyncData = JSON.stringify({
            tabs: data.tabs?.map(t => t.title) || [],
            activeIndex: data.activeIndex
        });

        if (this.lastSyncData === newSyncData) {
            // console.log('Sync data unchanged');
            return;
        }

        this.isSyncing = true;
        this.lastSyncData = newSyncData;

        try {
            const { tabs, activeIndex } = data;

            this.cleanupAllTabs();

            if (Array.isArray(tabs)) {
                tabs.forEach((tabData) => {
                    if (!tabData || !tabData.title) {
                        return;
                    }

                    const canCreate = this.validator.canCreateTab(
                        this.tabOrder.length
                    );
                    if (!canCreate.valid) {
                        console.warn(
                            `Tab limit reached. Skipping tab: ${tabData.title}`
                        );
                        return;
                    }

                    const id = this.idManager.getNewId();

                    const tab = new Tab(
                        id,
                        tabData.title
                    );

                    // Attach any preloaded content (merged by IPC bridge) so other
                    // renderer modules (note editor) can pick it up.
                    try {
                        tab.contentToLoad = tabData.content || '';
                        // store the main-process stable id for mapping
                        tab.remoteId = tabData.id || null;
                    } catch (e) {
                        tab.contentToLoad = '';
                    }

                    tab.onClose = (id) => this.closeTab(id);
                    tab.onClick = (id) => this.switchTab(id);

                    this.tabbar.insertBefore(
                        tab.getElement(),
                        this.addBtn
                    );

                    this.tabs.set(
                        id,
                        tab
                    );

                    // Notify other renderer modules that content is available for this tab id
                    try {
                        window.dispatchEvent(new CustomEvent('tab-content-ready', {
                            detail: {
                                // prefer stable remote id when available
                                tabId: tab.remoteId || id,
                                content: tab.contentToLoad || ''
                            }
                        }));
                    } catch (e) {
                        // ignore
                    }

                    this.tabOrder.push(id);
                });

                if (activeIndex >= 0 && activeIndex < this.tabOrder.length) {
                    this.switchTab(
                        this.tabOrder[
                            activeIndex
                        ]
                    );
                } else if (this.tabOrder.length > 0) {
                    this.switchTab(this.tabOrder[0]);
                }
            }

            if (!this.isInitialSync) {
                this.isInitialSync = true;
                console.log('Initial sync completed');
            }

            console.log(
                `Synced ${tabs?.length || 0} tabs from main process`
            );
        } catch (error) {
            console.error(
                'Error syncing with main process:',
                error
            );
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Destroys all currently managed tabs and clears the internal state.
     * @private
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
            console.error(
                'Error cleaning up tabs:',
                error
            );
        }
    }

    /**
     * Updates the title of a specific tab.
     * @param {number} id - The ID of the tab to update.
     * @param {string} newTitle - The new title for the tab.
     */
    updateTabTitle(id, newTitle) {
        if (this.isDestroyed || !this.tabs.has(id)) {
            return;
        }

        const validation = this.validator.validateTitle(newTitle);
        const tab = this.tabs.get(id);
        tab.updateTitle(validation.sanitized || newTitle);
    }

    /**
     * @returns {Array<number>} A copy of the array representing the current order of tab IDs.
     */
    getTabOrder() {
        return [...this.tabOrder];
    }

    /**
     * @returns {number|null} The ID of the currently active tab.
     */
    getActiveTabId() {
        return this.activeTabId;
    }

    /**
     * Checks if a tab with the given ID exists.
     * @param {number} id - The tab ID to check.
     * @returns {boolean} True if the tab exists, false otherwise.
     */
    hasTab(id) {
        return this.tabs.has(id);
    }

    /**
     * @returns {number} The total number of open tabs.
     */
    getTabCount() {
        return this.tabOrder.length;
    }

    /**
     * Retrieves information about a specific tab.
     * @param {number} id - The ID of the tab.
     * @returns {object|null} An object with tab info (id, title, active status, index) or null if not found.
     */
    getTabInfo(id) {
        const tab = this.tabs.get(id);
        if (!tab) {
            return null;
        }

        return {
            ...tab.getInfo(),
            index: this.tabOrder.indexOf(id)
        };
    }

    /**
     * Completely destroys the TabManager instance, cleaning up all tabs,
     * event listeners, and IPC subscriptions to prevent memory leaks.
     */
    destroy() {
        this.isDestroyed = true;

        try {
            // Remove IPC listener
            if (typeof this.unsubscribeIPC === 'function') {
                this.unsubscribeIPC();
            }

            // Remove add button listener
            if (this.addBtn && this.handleAddClick) {
                this.addBtn.removeEventListener('click', this.handleAddClick);
            }

            // Clean up tabs
            this.cleanupAllTabs();

            // Reset components
            if (this.idManager && typeof this.idManager.reset === 'function') {
                this.idManager.reset();
            }

            // Destroy IPC bridge
            if (this.ipcBridge && typeof this.ipcBridge.destroy === 'function') {
                this.ipcBridge.destroy();
            }

            // Clear all reference
            this.tabs = null;
            this.tabOrder = null;
            this.activeTabId = null;
            this.tabbar = null;
            this.addBtn = null;
            this.handleAddClick = null;
            this.unsubscribeIPC = null;
            this.idManager = null;
            this.ipcBridge = null;
            this.validator = null;
            this.lastSyncData = null;
            this.isSyncing = false; 

        } catch (error) {
            console.error(
                'Error during destruction:',
                error
            );
        }
    }
}