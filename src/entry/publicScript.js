/*
    Renderer side (Frontend)
    All .html files will using this script here 
    
    The data in this file will be copied from
    other files and will not be imported from
    that file as it is used entirely in .html
    and its location is independent of the
    functions and methods immediately
    independent. Therefore, any files that
    already have native functions, such as
    those already in place, will be considered
    as additional files, such as `tabbar.html.`
*/

let lastShortcutTime = 0;
const shortcutThrottle = 250;
let keyboardInitialized = false;
let tabsInitialized = false;

/**
 * Manages the tab bar UI in the renderer process. It creates, removes, and updates
 * tab elements based on data synced from the main process.
 */
class InlineTabManager {
    /**
     * @param {HTMLElement} tabbar The container element for the tabs.
     * @param {HTMLElement} addBtn The button element for adding new tabs.
     */
    constructor(tabbar, addBtn) {
        this.tabbar = tabbar;
        this.addBtn = addBtn;
        this.tabs = new Map();
        this.tabOrder = [];
        this.activeTabId = null;
        this.nextId = 1;
        this.isSyncing = false;
        this.lastSyncData = null;
    }

    /**
     * Creates a single tab DOM element.
     * @param {number} id The unique identifier for the tab.
     * @param {string} title The title to display on the tab.
     * @param {boolean} [isActive=false] Whether the tab should be marked as active.
     * @returns {HTMLDivElement} The created tab element.
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

        // Store bound functions for cleanup
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
                if (window.electronAPI?.closeTab) {
                    window.electronAPI.closeTab(index);
                }
            }
        };

        // Store handlers for cleanup
        tab._clickHandler = clickHandler;
        tab._closeHandler = closeHandler;

        tab.addEventListener('click', clickHandler);
        closeBtn.addEventListener('click', closeHandler);

        return tab;
    }

    /**
     * Synchronizes the tab bar UI with the state received from the main process.
     * It clears the existing tabs and recreates them based on the new data to ensure consistency.
     * @param {object} data The synchronization data from the main process.
     * @param {Array<{title: string}>} data.tabs An array of tab objects.
     * @param {number} data.activeIndex The index of the currently active tab.
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

            this.tabs.forEach((element) => {
                if (element && element.parentNode) {
                    element.remove();
                }
            });

            this.tabs.clear();
            this.tabOrder = [];
            this.activeTabId = null;
            this.nextId = 1;

            // Create new tabs
            if (!Array.isArray(tabs) || tabs.length === 0) {
                console.log('Received empty or invalid tabs array, UI cleared.');
                this.isSyncing = false;
                this.lastSyncData = null; 
                return;
            }

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

            console.log(`Synced ${tabs?.length || 0} tabs from main process`);
        } catch (error) {
            console.error('Error syncing tabs:', error);
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Removes all tab elements from the DOM and clears internal state.
     * Used for cleanup when the page is unloaded.
     */
    destroy() {
        this.tabs.forEach((element) => {
            if (element && element.parentNode) {
                element.remove();
            }
        });
        this.tabs.clear();
        this.tabOrder = [];
        this.activeTabId = null;
    }
}

let tabManagerInstance = null;

/**
 * Fetches the operating system identifier from the main process
 * and adds it as a class to the body element for OS-specific styling.
 */
const initOS = async () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initOS, 50);
        return;
    }

    if (typeof window.electronAPI.getOS === 'function') {
        try {
            const os = await window.electronAPI.getOS();
            console.log('OS received via request:', os);
            document.body.classList.add(os);
            console.log('Body classes:', document.body.className);
        } catch (error) {
            console.error('Error getting OS:', error);
        }
    }
}

/**
 * Initializes the InlineTabManager instance for the current page.
 * @returns {InlineTabManager|null} The created instance or null if required elements are not found.
 */
const initTabManager = () => {
    const tabbar = document.getElementById('tabbar');
    const addTabBtn = document.getElementById('addTab');
    
    if (!tabbar || !addTabBtn) {
        console.warn('Tabbar elements not found');
        return null;
    }

    try {
        tabManagerInstance = new InlineTabManager(tabbar, addTabBtn);
        console.log('InlineTabManager initialized');
        return tabManagerInstance;
    } catch (error) {
        console.error('Failed to initialize TabManager:', error);
        return null;
    }
}

/**
 * Sets up the tab synchronization system. It initializes the tab manager,
 * registers a listener for 'tabs-sync' events from the main process,
 * and requests the initial tab state.
 */
const initTabsSync = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initTabsSync, 50);
        return;
    }

    if (tabsInitialized) {
        console.warn('Tabs sync already initialized');
        return;
    }

    // Initialize TabManager first
    if (!tabManagerInstance) {
        initTabManager();
    }

    // Listen for tabs sync from main process
    window.electronAPI.onTabsSync((tabsData) => {
        console.log('Tabs synced from main process:', tabsData);
        updateTabsUI(tabsData.tabs, tabsData.activeTabIndex);
    });

    // Request initial tabs sync
    window.electronAPI.requestTabsSync();
    console.log('Tabs sync system initialized');

    tabsInitialized = true;
}

/**
 * Updates the tab bar UI by passing the synchronized data to the TabManager instance.
 * @param {Array<object>} tabs An array of tab data objects.
 * @param {number} activeIndex The index of the active tab.
 */
const updateTabsUI = (tabs, activeIndex) => {
    if (!tabManagerInstance) {
        console.warn('TabManager not initialized');
        initTabManager();
    }

    if (tabManagerInstance) {
        // Sync with TabManager
        tabManagerInstance.syncWithMainProcess({
            tabs: tabs.map(tab => ({
                title: tab.title || 'Untitled'
            })),
            activeIndex: activeIndex
        });
    }

    console.log(`Updated UI with ${tabs.length} tabs via InlineTabManager`);
}

/**
 * Initializes global keyboard shortcuts for tab management.
 * This function should be called on pages that need to respond to shortcuts,
 * like the main content view (`index.html`).
 */
const initKeyboardShortcuts = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initKeyboardShortcuts, 50);
        return;
    }

    if (keyboardInitialized) {
        console.warn('Keyboard shortcuts already initialized');
        return;
    }

    /**
     * Throttles shortcut execution to prevent rapid firing.
     * @returns {boolean} True if the shortcut can be executed, false otherwise.
     */
    const canExecuteShortcut = () => {
        const now = Date.now();
        if (now - lastShortcutTime < shortcutThrottle) {
            return false;
        }
        lastShortcutTime = now;
        return true;
    };

    document.addEventListener('keydown', (e) => {
        // (key repeat)
        if (e.repeat) {
            return;
        };

        const isMac = document.body.classList.contains('darwin');
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        // Ctrl/Cmd + T - New Tab
        if (modifier && e.code === 'KeyT') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            window.electronAPI.sendShortcut({ type: 'new-tab' });
            return;
        }

        // Ctrl/Cmd + W - Close Current Tab
        if (modifier && e.code === 'KeyW') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            window.electronAPI.sendShortcut({ type: 'close-tab' });
            return;
        }

        // Ctrl + Tab - Next Tab
        if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            window.electronAPI.sendShortcut({ type: 'next-tab' });
            return;
        }

        // Ctrl + Shift + Tab - Previous Tab
        if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            };
            window.electronAPI.sendShortcut({ type: 'prev-tab' });
            return;
        }

        // Ctrl/Cmd + 1-8 - Switch to specific tab
        if (modifier && e.key >= '1' && e.key <= '8') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            };
            const index = parseInt(e.key) - 1;
            window.electronAPI.sendShortcut({
                type: 'switch-to-index',
                index
            });
            return;
        }

        // Ctrl/Cmd + 9 - Switch to last tab
        if (modifier && e.key === '9') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return
            };
            console.log('Frontend: Ctrl+9 pressed');
            window.electronAPI.sendShortcut({ type: 'switch-to-last' });
            return;
        }

        // Ctrl/Cmd + S - Save tabs to storage (new shortcut)
        if (modifier && e.code === 'KeyS') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            console.log('Frontend: Ctrl+S pressed - saving tabs');
            saveCurrentTabsState();
            return;
        }
    }, true);

    keyboardInitialized = true;
}

/**
 * Triggers a request to the main process to save the current state of all tabs.
 * This is typically called via a shortcut (Ctrl+S).
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
 * Manually triggers a request to load tab data from storage.
 * Primarily used for debugging.
 * @returns {Promise<Array<object>>} A promise that resolves with the loaded tab data.
 */
const loadTabsFromStorage = async () => {
    if (typeof window.electronAPI?.loadTabs !== 'function') {
        console.warn('loadTabs API not available');
        return;
    }

    try {
        const result = await window.electronAPI.loadTabs();
        if (result.success) {
            console.log('Loaded tabs from storage:', result.tabs);
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
 * Requests the file path of the tab storage file from the main process.
 * Primarily used for debugging.
 * @returns {Promise<string|null>} A promise that resolves with the storage path.
 */
const getStorageInfo = async () => {
    if (typeof window.electronAPI?.getStoragePath !== 'function') {
        console.warn('getStoragePath API not available');
        return;
    }

    try {
        const result = await window.electronAPI.getStoragePath();
        if (result.success) {
            console.log('Tabs storage path:', result.path);
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
 * Sends a request to the main process to clear all saved tab data from storage.
 * Primarily used for debugging.
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
 * Manually requests a full tab state sync from the main process.
 * Primarily used for debugging.
 */
const manualSyncTabs = () => {
    if (typeof window.electronAPI?.requestTabsSync === 'function') {
        window.electronAPI.requestTabsSync();
        console.log('Manual tabs sync requested');
    }
}

// Cleanup on page unload to prevent memory leaks.
window.addEventListener('beforeunload', () => {
    // Cleanup TabManager
    if (tabManagerInstance && typeof tabManagerInstance.destroy === 'function') {
        tabManagerInstance.destroy();
        tabManagerInstance = null;
    }
    
    keyboardInitialized = false;
    tabsInitialized = false;
    lastShortcutTime = 0;
});

// Start all initialization
window.addEventListener('DOMContentLoaded', () => {
    initOS();
    initKeyboardShortcuts();
    initTabsSync();
});

window.tabsManager = {
    saveCurrentTabsState,
    loadTabsFromStorage,
    getStorageInfo,
    clearSavedTabs,
    manualSyncTabs,
    updateTabsUI,
    getTabManagerInstance: () => tabManagerInstance
};

console.log('Renderer tabs system initialized');