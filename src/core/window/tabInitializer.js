import { loadSavedTabs, createWelcomeTab } from '../../arch/fileSystem.js';

/**
 * Tabs based on cached state
 * Either loads saved tabs or just creates a welcome tab
 * @async
 * @param {TabManager} tabManager
 * @param {Object|null} cachedAppState
 * @returns {Promise<void>}
 */
export const initializeTabs = async (tabManager, cachedAppState) => {
    if (cachedAppState) {
        console.log('Loading saved tabs from cache');
        
        await loadSavedTabs(
            cachedAppState,
            tabManager
        );
    } else {
        console.log('No cache, creating welcome tab');
        
        createWelcomeTab(
            tabManager,
            {
                deferSave: true
            }
        );
    }
};