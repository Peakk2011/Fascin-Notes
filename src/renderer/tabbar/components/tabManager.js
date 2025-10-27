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

        // Components
        this.idManager = new IdManager();
        this.ipcBridge = new TabIPCBridge();
        this.validator = new TabValidator();

        this.init();
    }

    init() {
        this.setupIPC();
        this.setupEventListeners();
    }

    setupIPC() {
        this.ipcBridge.init();
        this.ipcBridge.onTabsUpdated((data) => {
            if (!this.isDestroyed) {
                this.syncWithMainProcess(data);
            }
        });
    }

    setupEventListeners() {
        if (!this.addBtn) return;

        this.addBtn.addEventListener('click', () => {
            if (!this.isDestroyed) {
                this.createTab();
            }
        }, { passive: true });
    }

    createTab(title = 'New Tab', setActive = true) {
        if (this.isDestroyed || !this.tabbar) {
            return null;
        }

        // Validate
        const canCreate = this.validator.canCreateTab(this.tabOrder.length);
        if (!canCreate.valid) {
            alert(canCreate.reason);
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

        // Notify IPC
        this.ipcBridge.notifyNewTab(sanitizedTitle);

        return id;
    }

    switchTab(id) {
        if (this.isDestroyed || !this.tabs.has(id) || this.activeTabId === id) {
            return;
        }

        try {
            // Deactivate all
            this.tabs.forEach(tab => tab.setActive(false));

            // Activate selected
            const tab = this.tabs.get(id);
            tab.setActive(true);
            this.activeTabId = id;

            // Notify IPC
            const index = this.tabOrder.indexOf(id);
            if (index !== -1) {
                this.ipcBridge.notifySwitchTab(index);
            }
        } catch (error) {
            console.error('Error switching tab:', error);
        }
    }

    async closeTab(id) {
        if (this.isDestroyed || !this.tabs.has(id)) {
            return;
        }

        try {
            const index = this.tabOrder.indexOf(id);
            const tab = this.tabs.get(id);

            // Close with animation
            await tab.close();

            // Update state
            this.tabs.delete(id);
            this.tabOrder.splice(index, 1);
            this.idManager.releaseId(id);

            // Check if all tabs closed
            if (this.tabOrder.length === 0) {
                this.ipcBridge.notifyCloseApp();
                return;
            }

            // Switch to adjacent tab
            const nextIndex = Math.min(
                index,
                this.tabOrder.length - 1
            );
            if (nextIndex >= 0) {
                this.switchTab(this.tabOrder[nextIndex]);
            }

            // Notify IPC
            this.ipcBridge.notifyCloseTab(index);
        } catch (error) {
            console.error('Error closing tab:', error);
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

            // Reorder in DOM
            const tab = this.tabs.get(id);
            const nextElement = toIndex < this.tabOrder.length - 1 ?
                this.tabs.get(this.tabOrder[toIndex + 1]).getElement() :
                this.addBtn;

            if (this.tabbar && nextElement) {
                this.tabbar.insertBefore(tab.getElement(), nextElement);
            }

            // Animation
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
        };

        try {
            const { tabs, activeIndex } = data;

            // Clean up
            this.cleanupAllTabs();

            if (Array.isArray(tabs)) {
                tabs.forEach((tabData, index) => {
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
                    const tab = new Tab(id, tabData.title);

                    tab.onClose = (id) => this.closeTab(id);
                    tab.onClick = (id) => this.switchTab(id);

                    this.tabbar.insertBefore(
                        tab.getElement(),
                        this.addBtn
                    );
                    this.tabs.set(id, tab);
                    this.tabOrder.push(id);
                });

                // Set active tab
                if (activeIndex >= 0 && activeIndex < this.tabOrder.length) {
                    this.switchTab(
                        this.tabOrder[activeIndex]
                    );
                } else if (this.tabOrder.length > 0) {
                    this.switchTab(
                        this.tabOrder[0]
                    );
                }
            }
        } catch (error) {
            console.error(
                'Error syncing with main process:',
                error
            );
        }
    }
    cleanupAllTabs() {
        try {
            this.tabs.forEach((tab) => {
                const element = tab.getElement();
                if (element && element.parentNode === this.tabbar) {
                    element.remove();
                }
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

    // Utility methods
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
        };

        return {
            ...tab.getInfo(),
            index: this.tabOrder.indexOf(id)
        };
    }

    destroy() {
        this.isDestroyed = true;

        try {
            // Remove add button listener
            if (this.addBtn) {
                this.addBtn.replaceWith(
                    this.addBtn.cloneNode(true)
                );
            }

            // Clean up all tabs
            this.cleanupAllTabs();

            // Reset components
            this.idManager.reset();

        } catch (error) {
            console.error('Error during destruction:', error);
        }
    }
}