/*
    Renderer side (Frontend)
    All .html files will using this script here 
*/

let lastShortcutTime = 0;
const shortcutThrottle = 250;
let keyboardInitialized = false;
let tabsInitialized = false;

/**
 * Manages the tab bar UI in the renderer process.
 */
class InlineTabManager {
    constructor(tabbar, addBtn) {
        this.tabbar = tabbar;
        this.addBtn = addBtn;
        this.tabs = new Map();
        this.tabOrder = [];
        this.activeTabId = null;
        this.nextId = 1;
        this.isSyncing = false;
        this.lastSyncData = null;
        this._addClickHandler = null;
        this._addBtnAttached = false;
    }

    /**
     * Creates a single tab DOM element.
     */
    createTabElement(id, title, isActive = false) {
        const tab = document.createElement('div');
        tab.className = `tab${isActive ? ' active' : ''}`;
        tab.dataset.tabId = id;
        tab.draggable = true;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'tab-title';
        titleSpan.textContent = title;

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close';
        closeBtn.setAttribute('aria-label', 'Close tab');
        closeBtn.innerHTML = '×';

        tab.appendChild(titleSpan);
        tab.appendChild(closeBtn);

        // Event handlers with proper cleanup references
        const clickHandler = (e) => {
            if (e.target === closeBtn) return;
            const index = this.tabOrder.indexOf(id);
            if (index !== -1 && window.electronAPI?.switchTab) {
                window.electronAPI.switchTab(index);
            }
        };

        const closeHandler = (e) => {
            e.stopPropagation();
            const index = this.tabOrder.indexOf(id);
            if (index !== -1 && window.electronAPI?.closeTab) {
                window.electronAPI.closeTab(index);
            }
        };

        // Store handlers for cleanup
        tab._handlers = {
            click: clickHandler,
            close: closeHandler
        };

        tab.addEventListener('click', clickHandler);
        closeBtn.addEventListener('click', closeHandler);

        return tab;
    }

    /**
     * Efficiently updates tabs without complete recreation when possible
     */
    syncWithMainProcess(data) {
        if (!data || this.isSyncing) return;

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

            // Validate input
            if (!Array.isArray(tabs) || tabs.length === 0) {
                this.clearAllTabs();
                this.isSyncing = false;
                return;
            }

            // Check if we can update existing tabs instead of recreating
            if (this.canIncrementalUpdate(tabs, activeIndex)) {
                this.incrementalUpdate(tabs, activeIndex);
            } else {
                this.fullUpdate(tabs, activeIndex);
            }

            console.log(`Synced ${tabs.length} tabs from main process`);
        } catch (error) {
            console.error('Error syncing tabs:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Checks if we can update tabs incrementally
     */
    canIncrementalUpdate(tabs, activeIndex) {
        if (this.tabs.size !== tabs.length) return false;
        if (this.tabOrder.length !== tabs.length) return false;
        
        // Check if tab titles match existing tabs
        for (let i = 0; i < tabs.length; i++) {
            const tabId = this.tabOrder[i];
            const existingTab = this.tabs.get(tabId);
            if (!existingTab) return false;
            
            const titleSpan = existingTab.querySelector('.tab-title');
            if (titleSpan && titleSpan.textContent !== tabs[i].title) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Updates tabs incrementally without complete recreation
     */
    incrementalUpdate(tabs, activeIndex) {
        // Update active state
        const newActiveTabId = this.tabOrder[activeIndex];
        if (this.activeTabId !== newActiveTabId) {
            // Deactivate current active tab
            if (this.activeTabId) {
                const currentActive = this.tabs.get(this.activeTabId);
                if (currentActive) {
                    currentActive.classList.remove('active');
                }
            }
            
            // Activate new tab
            if (newActiveTabId) {
                const newActive = this.tabs.get(newActiveTabId);
                if (newActive) {
                    newActive.classList.add('active');
                }
            }
            
            this.activeTabId = newActiveTabId;
        }
    }

    /**
     * Performs complete tab recreation when necessary
     */
    fullUpdate(tabs, activeIndex) {
        this.clearAllTabs();

        tabs.forEach((tabData, index) => {
            if (!tabData || !tabData.title) return;

            const id = this.nextId++;
            const isActive = index === activeIndex;
            const tabElement = this.createTabElement(id, tabData.title, isActive);

            this.tabbar.insertBefore(tabElement, this.addBtn);
            this.tabs.set(id, tabElement);
            this.tabOrder.push(id);

            if (isActive) {
                this.activeTabId = id;
            }
        });
    }

    /**
     * Clears all tabs with proper cleanup
     */
    clearAllTabs() {
        this.tabs.forEach((element, id) => {
            this.cleanupTabElement(element);
        });
        
        this.tabs.clear();
        this.tabOrder = [];
        this.activeTabId = null;
    }

    /**
     * Properly cleans up a single tab element
     */
    cleanupTabElement(element) {
        if (!element) return;
        
        // Remove event listeners
        if (element._handlers) {
            element.removeEventListener('click', element._handlers.click);
            const closeBtn = element.querySelector('.close');
            if (closeBtn && element._handlers.close) {
                closeBtn.removeEventListener('click', element._handlers.close);
            }
            delete element._handlers;
        }
        
        // Remove from DOM
        if (element.parentNode) {
            element.remove();
        }
    }

    /**
     * Attach add button click handler
     */
    attachAddButton() {
        if (!this.addBtn || this._addBtnAttached) return;

        this._addClickHandler = () => {
            try {
                if (window.electronAPI?.sendShortcut) {
                    window.electronAPI.sendShortcut({ type: 'new-tab' });
                } else if (window.electronAPI?.newTab) {
                    window.electronAPI.newTab('New Tab');
                } else {
                    console.warn('No API available to create a new tab');
                }
            } catch (error) {
                console.error('Error in add button click handler:', error);
            }
        };

        try {
            this.addBtn.addEventListener('click', this._addClickHandler, { passive: true });
            this._addBtnAttached = true;
        } catch (error) {
            console.error('Failed to attach add button listener:', error);
        }
    }

    /**
     * Remove add button handler
     */
    detachAddButton() {
        if (this.addBtn && this._addClickHandler) {
            try {
                this.addBtn.removeEventListener('click', this._addClickHandler);
            } catch (error) {
                console.error('Failed to detach add button listener:', error);
            } finally {
                this._addClickHandler = null;
                this._addBtnAttached = false;
            }
        }
    }

    /**
     * Cleanup all resources
     */
    destroy() {
        this.detachAddButton();
        this.clearAllTabs();
        
        this.tabbar = null;
        this.addBtn = null;
    }
}

let tabManagerInstance = null;

/**
 * Initialize OS detection
 */
const initOS = async () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initOS, 50);
        return;
    }

    if (typeof window.electronAPI.getOS === 'function') {
        try {
            const os = await window.electronAPI.getOS();
            document.body.classList.add(os);
        } catch (error) {
            console.error('Error getting OS:', error);
        }
    }
}

/**
 * Initialize tab manager instance
 */
const initTabManager = () => {
    if (tabManagerInstance) {
        return tabManagerInstance;
    }

    const tabbar = document.getElementById('tabbar');
    const addTabBtn = document.getElementById('addTab');

    if (!tabbar || !addTabBtn) {
        console.warn('Tabbar elements not found');
        return null;
    }

    try {
        tabManagerInstance = new InlineTabManager(tabbar, addTabBtn);
        tabManagerInstance.attachAddButton();
        return tabManagerInstance;
    } catch (error) {
        console.error('Failed to initialize TabManager:', error);
        return null;
    }
}

/**
 * Initialize tab synchronization
 */
const initTabsSync = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initTabsSync, 50);
        return;
    }

    if (tabsInitialized) {
        return;
    }

    // Initialize TabManager if needed
    if (!tabManagerInstance) {
        initTabManager();
    }

    // Listen for tabs sync from main process
    if (window.electronAPI.onTabsSync) {
        window.electronAPI.onTabsSync((tabsData) => {
            updateTabsUI(tabsData.tabs, tabsData.activeTabIndex);
        });
    }

    // Request initial tabs sync
    if (window.electronAPI.requestTabsSync) {
        window.electronAPI.requestTabsSync();
    }
    
    tabsInitialized = true;
}

/**
 * Update tabs UI with new data
 */
const updateTabsUI = (tabs, activeIndex) => {
    if (!tabManagerInstance) {
        initTabManager();
    }

    if (tabManagerInstance) {
        tabManagerInstance.syncWithMainProcess({
            tabs: Array.isArray(tabs) ? tabs.map(tab => ({
                title: tab.title || 'Untitled'
            })) : [],
            activeIndex: typeof activeIndex === 'number' ? activeIndex : 0
        });
    }
}

/**
 * Initialize keyboard shortcuts
 */
const initKeyboardShortcuts = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initKeyboardShortcuts, 50);
        return;
    }

    if (keyboardInitialized) {
        return;
    }

    const canExecuteShortcut = () => {
        const now = Date.now();
        if (now - lastShortcutTime < shortcutThrottle) {
            return false;
        }
        lastShortcutTime = now;
        return true;
    };

    const keyHandler = (e) => {
        if (e.repeat) return;

        const isMac = document.body.classList.contains('darwin');
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        // Define shortcut handlers
        const shortcuts = {
            'KeyT': () => {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (canExecuteShortcut()) {
                    window.electronAPI.sendShortcut({ type: 'new-tab' });
                }
            },
            'KeyW': () => {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (canExecuteShortcut()) {
                    window.electronAPI.sendShortcut({ type: 'close-tab' });
                }
            },
            'Tab': () => {
                if (e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (canExecuteShortcut()) {
                        window.electronAPI.sendShortcut({ type: 'next-tab' });
                    }
                } else if (e.ctrlKey && e.shiftKey) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    if (canExecuteShortcut()) {
                        window.electronAPI.sendShortcut({ type: 'prev-tab' });
                    }
                }
            },
            'Digit1': () => handleNumberShortcut(0),
            'Digit2': () => handleNumberShortcut(1),
            'Digit3': () => handleNumberShortcut(2),
            'Digit4': () => handleNumberShortcut(3),
            'Digit5': () => handleNumberShortcut(4),
            'Digit6': () => handleNumberShortcut(5),
            'Digit7': () => handleNumberShortcut(6),
            'Digit8': () => handleNumberShortcut(7),
            'Digit9': () => {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (canExecuteShortcut()) {
                    window.electronAPI.sendShortcut({ type: 'switch-to-last' });
                }
            },
            'KeyS': () => {
                e.preventDefault();
                e.stopImmediatePropagation();
                if (canExecuteShortcut()) {
                    saveCurrentTabsState();
                }
            }
        };

        const handleNumberShortcut = (index) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (canExecuteShortcut()) {
                window.electronAPI.sendShortcut({
                    type: 'switch-to-index',
                    index
                });
            }
        };

        // Execute shortcut if modifier is pressed and key matches
        if (modifier && shortcuts[e.code]) {
            shortcuts[e.code]();
        }
    };

    document.addEventListener('keydown', keyHandler, true);
    keyboardInitialized = true;
}

/**
 * Save current tabs state
 */
const saveCurrentTabsState = async () => {
    if (typeof window.electronAPI?.saveTabs !== 'function') {
        console.warn('saveTabs API not available');
        return;
    }

    try {
        const result = await window.electronAPI.saveTabs();
        if (result.success) {
            console.log('Tabs saved successfully via Ctrl+S');
        } else {
            console.error('Failed to save tabs:', result.error);
        }
    } catch (error) {
        console.error('Error saving tabs:', error);
    }
}

/**
 * Load tabs from storage
 */
const loadTabsFromStorage = async () => {
    if (typeof window.electronAPI?.loadTabs !== 'function') {
        console.warn('loadTabs API not available');
        return [];
    }

    try {
        const result = await window.electronAPI.loadTabs();
        if (result.success) {
            return result.tabs;
        } else {
            console.error('Failed to load tabs:', result.error);
            return [];
        }
    } catch (error) {
        console.error('Error loading tabs:', error);
        return [];
    }
}

/**
 * Get storage info
 */
const getStorageInfo = async () => {
    if (typeof window.electronAPI?.getStoragePath !== 'function') {
        console.warn('getStoragePath API not available');
        return null;
    }

    try {
        const result = await window.electronAPI.getStoragePath();
        if (result.success) {
            return result.path;
        } else {
            console.error('Failed to get storage path:', result.error);
            return null;
        }
    } catch (error) {
        console.error('Error getting storage path:', error);
        return null;
    }
}

/**
 * Clear saved tabs
 */
const clearSavedTabs = async () => {
    if (typeof window.electronAPI?.clearTabs !== 'function') {
        console.warn('clearTabs API not available');
        return;
    }

    try {
        const result = await window.electronAPI.clearTabs();
        if (result.success) {
            console.log('All saved tabs cleared');
        } else {
            console.error('Failed to clear tabs:', result.error);
        }
    } catch (error) {
        console.error('Error clearing tabs:', error);
    }
}

/**
 * Manual sync tabs
 */
const manualSyncTabs = () => {
    if (typeof window.electronAPI?.requestTabsSync === 'function') {
        window.electronAPI.requestTabsSync();
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (tabManagerInstance) {
        tabManagerInstance.destroy();
        tabManagerInstance = null;
    }

    keyboardInitialized = false;
    tabsInitialized = false;
    lastShortcutTime = 0;
});

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    initOS();
    initKeyboardShortcuts();
    initTabsSync();
});

// Export public API
window.tabsManager = {
    saveCurrentTabsState,
    loadTabsFromStorage,
    getStorageInfo,
    clearSavedTabs,
    manualSyncTabs,
    updateTabsUI,
    getTabManagerInstance: () => tabManagerInstance
};