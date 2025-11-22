/**
 * Redistributables - Post-Init Heavy Operations
 * Handle heavy operations that don't need to be performed at app launch.
 * Perform them after the DOM is ready to avoid blocking the UI.
 */

import { loadTabCache, saveTabCache } from './acceleration.js';

// Pre-warm active tab - Loads the cache of the currently active tab.
export const preWarmActiveTab = async (activeTab, startTime) => {
    if (!activeTab?.isPreloaded || !activeTab.tabId) {
        return false;
    }

    try {
        const cachedContent = await loadTabCache(activeTab.tabId);
        if (cachedContent) {
            console.log(
                `Active tab pre-warmed: ${Date.now() - startTime}ms`
            );

            activeTab.view.webContents.loadURL(
                `data:text/html;charset=utf-8,
                ${encodeURIComponent(cachedContent)}`
            );

            activeTab.hasLoaded = true;
            return true;
        }
    } catch (error) {
        console.error(
            'Failed to pre-warm active tab:',
            error
        );
    }

    return false;
};

// Setup lazy loading mechanism for tabs
export const setupLazyLoadMechanism = (tabManager) => {
    const originalSetActive = tabManager.setActiveTab.bind(tabManager);

    tabManager.setActiveTab = function (tab) {
        // Load cache before switch tab
        if (tab.isPreloaded && !tab.hasLoaded && tab.tabId) {
            setImmediate(async () => {
                const cachedContent = await loadTabCache(tab.tabId);

                if (cachedContent) {
                    tab.view.webContents.loadURL(
                        `data:text/html;charset=utf-8,
                        ${encodeURIComponent(cachedContent)}`
                    );
                }
            });
        }

        // Lazy load URL
        if (tab.pendingUrl && !tab.hasLoaded) {
            console.log(`Lazy loading: ${tab.title}`);
            
            tab.view.webContents.loadURL(tab.pendingUrl);
            tab.hasLoaded = true;
            tab.wasLazyLoaded = true;

            // Save cache when done downloading
            tab.view.webContents.once('did-finish-load', async () => {
                try {
                    const html = await tab.view.webContents.executeJavaScript(
                        'document.documentElement.outerHTML'
                    );
                    await saveTabCache(tab.tabId, html);
                    console.log(`Cache saved: ${tab.title}`);
                } catch (error) {
                    console.error('Failed to save cache:', error);
                }
            });
        }

        return originalSetActive(tab);
    };

    console.log('Lazy load mechanism ready');
};

/**
 * Pre-warm inactive tabs - Loads the cache of inactive tabs.
 * Performs in the background, staggered loading.
 */
export const preWarmInactiveTabs = (tabManager, activeTab, delayMs = 500) => {
    setTimeout(async () => {
        // console.log('Pre-warming inactive tabs');
        for (let i = 0; i < tabManager.tabs.length; i++) {
            const tab = tabManager.tabs[i];

            if (tab === activeTab) continue;
            if (!tab.isPreloaded || tab.hasLoaded || !tab.tabId) continue;

            // Stagger loads
            setTimeout(async () => {
                const cachedContent = await loadTabCache(tab.tabId);
                if (cachedContent) {
                    tab.view.webContents.loadURL(
                        `data:text/html;charset=utf-8,
                        ${encodeURIComponent(cachedContent)}`
                    );

                    tab.hasLoaded = true;
                    console.log(`Pre-warmed: ${tab.title}`);
                }
            }, i * 200);
        }
    }, delayMs);
};

// Sync storage data
export const syncStorageData = async (ipcManager, tabManager, cachedAppState, startTime, delayMs = 1000) => {
    setTimeout(async () => {
        try {
            const savedTabs = await ipcManager.tabStorage.loadTabs();
            console.log(`Storage synced: ${Date.now() - startTime}ms`);

            if (savedTabs && savedTabs.length > 0 &&
                cachedAppState &&
                tabManager.tabs.length > 0
            ) {
                // Sync URLs
                savedTabs.forEach((tabInfo, index) => {
                    const tab = tabManager.tabs[index];

                    if (tab && tabInfo.url && tab.pendingUrl !== tabInfo.url) {
                        tab.pendingUrl = tabInfo.url;
                        console.log(`URL updated: ${tab.title}`);
                    }
                });
    
            }
        } catch (error) {
            console.error(
                'Storage sync failed:',
                error
            );
        }
    }, delayMs);
};

// Perform initial sync
export const performInitialSync = (ipcManager, startTime, delayMs = 1500) => {
    setTimeout(() => {
        ipcManager.performInitialSync();
        console.log(
            `Initial sync: ${Date.now() - startTime}ms`
        );
    }, delayMs);
};

/**
 * Main post-init orchestrator
 * Coordinate all heavy operations after DOM ready.
 */
export const initPostLoad = async (mainWindow, tabManager, ipcManager, cachedAppState, startTime) => {
    console.log('\nPost init start');

    const activeTab = tabManager.getActiveTab();
    // Pre-warm active tab (priority)
    await preWarmActiveTab(activeTab, startTime);
    // Setup lazy loading mechanism
    setupLazyLoadMechanism(tabManager);
    // Pre-warm inactive tabs (background)
    preWarmInactiveTabs(tabManager, activeTab);
    // Sync storage data (background)
    syncStorageData(ipcManager, tabManager, cachedAppState, startTime);
    // Initial sync (background)
    performInitialSync(ipcManager, startTime);
};