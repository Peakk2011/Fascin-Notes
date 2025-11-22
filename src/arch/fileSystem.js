/**
 * File System Operations
 * Handle file system operations
 */

import { saveTabCache, saveAppStateCache, clearOldCache } from './acceleration.js';

// Save tabs and cache when closing the app
export const saveTabsOnClose = async (tabManager, tabStorage, ipcManager) => {
    const tabs = tabManager.getAllTabs();

    console.log(`Saving ${tabs.length} tabs on close`);

    // Save HTML cache of all loaded tabs
    const cachePromises = tabs
        .filter(
            tab => tab.hasLoaded && tab.view?.webContents
        )
        .map(async (tab) => {
            try {
                const html = await tab.view.webContents.executeJavaScript(
                    'document.documentElement.outerHTML'
                );

                return saveTabCache(tab.tabId, html);
            } catch (error) {
                console.error(
                    `Failed to cache tab ${tab.tabId}:`,
                    error
                );

                return false;
            }
        });

    await Promise.all(cachePromises);

    // Prepare tabs data
    const tabsWithLoadState = tabs.map(tab => ({
        ...tab,
        id: tab.tabId || `tab_${Date.now()}_${Math.random()}`,
        isPreloaded: tab.hasLoaded === true,
        content: tab.hasLoaded ? tab.content : null
    }));

    // Save tabs data
    await tabStorage.saveTabs(
        tabsWithLoadState,
        tabManager.getActiveTab()
    );

    // Save app state cache
    await saveAppStateCache({
        savedTabs: tabsWithLoadState,
        timestamp: Date.now()
    });

    // Delete old cache files that are no longer needed
    const activeTabIds = tabs.map(t => t.tabId).filter(id => id);
    await clearOldCache(activeTabIds);

    // Notify manual save
    // ipcManager.notifyManualSave();

    console.log('✓ All data saved on close');
};

export const loadSavedTabs = async (cachedAppState, tabManager) => {
    if (!cachedAppState?.savedTabs ||
        cachedAppState.savedTabs.length === 0
    ) {
        return null;
    }

    console.log(
        `Loading ${cachedAppState.savedTabs.length} tabs from cache`
    );

    // Tab structures
    cachedAppState.savedTabs.forEach((tabInfo) => {
        const newTab = tabManager.createTab(
            tabInfo.title,
            false,
            null
        );

        newTab.tabId = tabInfo.id;
        newTab.pendingUrl = tabInfo.url;
        newTab.isPreloaded = tabInfo.isPreloaded;
        newTab.hasLoaded = false;
    });

    // Set active tab
    const activeIndex = cachedAppState.savedTabs.findIndex(
        t => t.isActive
    );

    if (activeIndex >= 0 && tabManager.tabs[activeIndex]) {
        tabManager.setActiveTab(
            tabManager.tabs[activeIndex]
        );
    } else if (tabManager.tabs[0]) {
        tabManager.setActiveTab(
            tabManager.tabs[0]
        );
    }

    console.log('Tabs structure loaded');

    return {
        count: cachedAppState.savedTabs.length,
        activeIndex
    };
};

export const createWelcomeTab = (tabManager, options = {}) => {
    const { deferSave = false } = options;

    console.log('Creating welcome tab');
    const tab = tabManager.createTab('Welcome');

    if (deferSave) {
        console.log('Deferring welcome tab save until UI ready');
        return tab;
    }

    return tab;
};


// Setup file system watchers
// Placeholder for file watching functionality
export const setupFileWatchers = (paths) => {
    console.log('File watchers ready');
};

// Export tabs data
export const exportTabsData = async (tabManager, outputPath) => {
    try {
        const tabs = tabManager.getAllTabs();
        const data = {
            tabs: tabs.map(tab => ({
                id: tab.tabId,
                title: tab.title,
                url: tab.pendingUrl || tab.url,
                isActive: tab === tabManager.getActiveTab()
            })),
            exportDate: new Date().toISOString()
        };

        const fs = await import('fs/promises');

        await fs.writeFile(
            outputPath,
            JSON.stringify(data, null, 2),
            'utf-8'
        );

        console.log(
            `Tabs exported to: ${outputPath}`
        );
        return true;
    } catch (error) {
        console.error(
            'Export failed:',
            error
        );

        return false;
    }
};

// Import tabs data
export const importTabsData = async (inputPath, tabManager) => {
    try {
        const fs = await import('fs/promises');
        const data = JSON.parse(
            await fs.readFile(inputPath, 'utf-8')
        );

        if (!data.tabs || !Array.isArray(data.tabs)) {
            throw new Error('Invalid tabs data format');
        }

        // Clear existing tabs
        const existingTabs = [...tabManager.getAllTabs()];

        existingTabs.forEach(
            tab => tabManager.closeTab(tab)
        );

        // Create tabs from import
        data.tabs.forEach(tabData => {
            const newTab = tabManager.createTab(
                tabData.title,
                false
            );

            newTab.tabId = tabData.id;
            newTab.pendingUrl = tabData.url;

            if (tabData.isActive) {
                tabManager.setActiveTab(newTab);
            }
        });

        console.log(
            `Imported ${data.tabs.length} tabs from backup`
        );
        return true;
    } catch (error) {
        console.error(
            'Import failed:',
            error
        );
        return false;
    }
};