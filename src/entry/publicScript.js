// Renderer side (Frontend)
// All .html files will using this script here 

let lastShortcutTime = 0;
const shortcutThrottle = 250;
let keyboardInitialized = false;
let tabsInitialized = false;

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

// Initialize tabs sync system
const initTabsSync = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initTabsSync, 50);
        return;
    }

    if (tabsInitialized) {
        console.warn('Tabs sync already initialized');
        return;
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

// Update tabs UI based on synced data
const updateTabsUI = (tabs, activeIndex) => {
    const tabbar = document.getElementById('tabbar');
    if (!tabbar) {
        console.warn('Tabbar container not found');
        return;
    }

    // Keep the addTab button, remove old tabs
    const addTabButton = document.getElementById('addTab');
    const oldTabs = tabbar.querySelectorAll('.tab:not(#addTab)');
    
    oldTabs.forEach(tab => tab.remove());

    // Create tab elements (insert before addTab button)
    tabs.forEach((tab, index) => {
        const tabElement = document.createElement('div');
        tabElement.className = `tab ${index === activeIndex ? 'active' : ''}`;
        tabElement.textContent = tab.title || 'Untitled';
        
        // Add click event to switch tab
        tabElement.addEventListener('click', () => {
            window.electronAPI.switchTab(index);
        });

        // Add close button
        const closeButton = document.createElement('span');
        closeButton.className = 'tab-close';
        closeButton.innerHTML = '×';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            window.electronAPI.closeTab(index);
        });

        tabElement.appendChild(closeButton);
        
        // Insert before the addTab button
        tabbar.insertBefore(tabElement, addTabButton);
    });

    console.log(`Updated UI with ${tabs.length} tabs, active: ${activeIndex}`);
}

// Initialize keyboard shortcuts (USE FOR index.html)
const initKeyboardShortcuts = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initKeyboardShortcuts, 50);
        return;
    }

    if (keyboardInitialized) {
        console.warn('Keyboard shortcuts already initialized');
        return;
    }

    const canExecuteShortcut = () => {
        const now = Date.now();
        if (now - lastShortcutTime < shortcutThrottle) {
            // console.log('Shortcut throttled');
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
            // console.log('Frontend: Ctrl+T pressed');
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
            // console.log('Frontend: Ctrl+W pressed');
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
            // console.log('Frontend: Ctrl+Tab pressed');
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
            // console.log('Frontend: Ctrl+Shift+Tab pressed');
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
            // console.log(`Frontend: Ctrl+${e.key} pressed`);
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
    // console.log('Keyboard shortcuts initialized');
}

// Save current tabs state to storage
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

// Load tabs from storage (manual trigger)
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

// Get storage path info
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

// Clear all saved tabs
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

// Manual sync trigger
const manualSyncTabs = () => {
    if (typeof window.electronAPI?.requestTabsSync === 'function') {
        window.electronAPI.requestTabsSync();
        console.log('Manual tabs sync requested');
    }
}

// Add event listener for the addTab button
const initAddTabButton = () => {
    const addTabButton = document.getElementById('addTab');
    if (addTabButton) {
        addTabButton.addEventListener('click', () => {
            window.electronAPI.newTab('New Tab');
        });
        console.log('Add tab button initialized');
    } else {
        console.warn('Add tab button not found');
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    keyboardInitialized = false;
    tabsInitialized = false;
    lastShortcutTime = 0;
    // console.log('Tabs sync and keyboard shortcuts cleaned up');
});

// Start all initialization
window.addEventListener('DOMContentLoaded', () => {
    initOS();
    initKeyboardShortcuts();
    initTabsSync();
    initAddTabButton();
});

window.tabsManager = {
    saveCurrentTabsState,
    loadTabsFromStorage,
    getStorageInfo,
    clearSavedTabs,
    manualSyncTabs,
    updateTabsUI
};

console.log('Renderer tabs system initialized');