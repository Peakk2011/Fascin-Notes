import { globalShortcut } from 'electron';

/**
 * Register global keyboard shortcuts for tab management
 * @param {BrowserWindow} mainWindow - The main window instance
 * @param {TabManager} tabManager - The tab manager instance
 */
export const registerTabShortcuts = (mainWindow, tabManager) => {
    // Function to update UI with current tabs state
    const updateTabsUI = () => {
        mainWindow.webContents.send('tabs-updated', {
            tabs: tabManager.tabs.map(t => ({ title: t.title })),
            activeIndex: tabManager.tabs.indexOf(tabManager.activeTab)
        });
    };

    // Ctrl+T / Cmd+T - New Tab
    globalShortcut.register('CommandOrControl+T', () => {
        tabManager.createTab('New Tab');
        updateTabsUI();
    });

    // Ctrl+W / Cmd+W - Close Current Tab
    globalShortcut.register('CommandOrControl+W', () => {
        if (tabManager.activeTab) {
            tabManager.closeTab(tabManager.activeTab);
            updateTabsUI();
        }
    });

    // Ctrl+Tab - Next Tab
    globalShortcut.register('Control+Tab', () => {
        if (tabManager.tabs.length === 0) return;

        const currentIdx = tabManager.tabs.indexOf(tabManager.activeTab);
        const nextIdx = (currentIdx + 1) % tabManager.tabs.length;

        if (tabManager.tabs[nextIdx]) {
            tabManager.setActiveTab(tabManager.tabs[nextIdx]);
            updateTabsUI();
        }
    });

    // Ctrl+Shift+Tab - Previous Tab
    globalShortcut.register('Control+Shift+Tab', () => {
        if (tabManager.tabs.length === 0) return;

        const currentIdx = tabManager.tabs.indexOf(tabManager.activeTab);
        const prevIdx = currentIdx - 1 < 0 ? tabManager.tabs.length - 1 : currentIdx - 1;

        if (tabManager.tabs[prevIdx]) {
            tabManager.setActiveTab(tabManager.tabs[prevIdx]);
            updateTabsUI();
        }
    });

    // Ctrl+1 to Ctrl+8 - Switch to specific tab (1-8)
    for (let i = 1; i <= 8; i++) {
        globalShortcut.register(`CommandOrControl+${i}`, () => {
            const tabIndex = i - 1;
            if (tabManager.tabs[tabIndex]) {
                tabManager.setActiveTab(tabManager.tabs[tabIndex]);
                updateTabsUI();
            }
        });
    }

    // Ctrl+9 - Switch to last tab
    globalShortcut.register('CommandOrControl+9', () => {
        const lastIdx = tabManager.tabs.length - 1;
        if (lastIdx >= 0 && tabManager.tabs[lastIdx]) {
            tabManager.setActiveTab(tabManager.tabs[lastIdx]);
            updateTabsUI();
        }
    });
    
}

/**
 * Unregister all global shortcuts
 * Call this when the app is closing
 */
export const unregisterTabShortcuts = () => {
    globalShortcut.unregisterAll();
}