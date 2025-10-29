import { Tab } from './tabs/tab.js';
import { IdManager } from './tabs/idManager.js';
import { TabIPCBridge } from './tabs/tabIPCBridge.js';
import { TabValidator } from './tabs/tabValidator.js';

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

        this.init();
    }

    init() {
        this.setupIPC();
        this.setupEventListeners();
    }

    setupIPC() {
        this.ipcBridge.init();

        // Store unsubscribe function (if ipcBridge supported)
        this.unsubscribeIPC = this.ipcBridge.onTabsUpdated((data) => {
            if (!this.isDestroyed) {
                this.syncWithMainProcess(data);
            }
        });
    }

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

        // Notify IPC
        this.ipcBridge.notifyNewTab(sanitizedTitle);

        return id;
    }

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
            }
        } catch (error) {
            console.error(
                'Error switching tab:',
                error
            );
        }
    }

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

    updateTabTitle(id, newTitle) {
        if (this.isDestroyed || !this.tabs.has(id)) {
            return;
        }

        const validation = this.validator.validateTitle(newTitle);
        const tab = this.tabs.get(id);
        tab.updateTitle(validation.sanitized || newTitle);
    }

    getTabOrder() {
        return [...this.tabOrder];
    }

    getActiveTabId() {
        return this.activeTabId;
    }

    hasTab(id) {
        return this.tabs.has(id);
    }

    getTabCount() {
        return this.tabOrder.length;
    }

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