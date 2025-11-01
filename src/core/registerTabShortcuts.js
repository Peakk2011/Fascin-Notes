import { ipcMain, app } from 'electron';

let isRegistered = false;
let lastActionTime = 0;
let actionInProgress = false;
const throttleDelay = 250;

export const registerTabShortcuts = (mainWindow, tabManager) => {
    if (isRegistered) {
        return;
    }

    if (!tabManager || !tabManager.tabs) {
        console.error('TabManager is not ready!');
        return;
    }

    const canExecute = () => {
        const now = Date.now();

        if (actionInProgress) {
            return false;
        }

        if (now - lastActionTime < throttleDelay) {
            return false;
        }

        lastActionTime = now;
        return true;
    };

    const updateTabsUI = () => {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return;
        }

        try {
            const mappedTabs = [];
            for (let i = 0; i < tabManager.tabs.length; i++) {
                mappedTabs.push({
                    title: tabManager.tabs[i].title
                });
            }

            mainWindow.webContents.send('tabs-updated', {
                tabs: mappedTabs,
                activeIndex: tabManager.tabs.indexOf(
                    tabManager.activeTab
                )
            });
        } catch (error) {
            console.error('Error updating tabs UI:', error);
        }
    };

    ipcMain.removeAllListeners('keyboard-shortcut');

    // Register new handler
    ipcMain.on('keyboard-shortcut', (event, action) => {
        // Throttle check
        if (!canExecute()) {
            return;
        }

        // Flags
        actionInProgress = true;

        try {
            switch (action.type) {
                case 'new-tab':
                    if (typeof tabManager.createTab === 'function') {
                        tabManager.createTab('New Tab');
                        console.log(' New tab created');
                    } else {
                        console.error('createTab method not found');
                    }
                    break;

                case 'close-tab':
                    if (tabManager.activeTab && typeof tabManager.closeTab === 'function') {
                        // Check the left tabs
                        if (tabManager.tabs.length <= 1) {
                            app.quit();
                        } else {
                            tabManager.closeTab(tabManager.activeTab);
                        }
                    } else {
                        console.warn('No active tab or closeTab method');
                    }
                    break;

                case 'next-tab':
                    if (tabManager.tabs && tabManager.tabs.length > 0) {
                        const currentIdx = tabManager.tabs.indexOf(
                            tabManager.activeTab
                        );
                        const nextIdx = (currentIdx + 1) % tabManager.tabs.length;
                        if (tabManager.tabs[nextIdx] && typeof tabManager.setActiveTab === 'function') {
                            tabManager.setActiveTab(
                                tabManager.tabs[nextIdx]
                            );
                            // console.log(`Next tab: ${nextIdx}`);
                        }
                    }
                    break;

                case 'prev-tab':
                    if (tabManager.tabs && tabManager.tabs.length > 0) {
                        const currentIdx = tabManager.tabs.indexOf(
                            tabManager.activeTab
                        );
                        let prevIdx;
                        if (currentIdx - 1 < 0) {
                            prevIdx = tabManager.tabs.length - 1;
                        } else {
                            prevIdx = currentIdx - 1;
                        }
                        if (tabManager.tabs[prevIdx] && typeof tabManager.setActiveTab === 'function') {
                            tabManager.setActiveTab(
                                tabManager.tabs[prevIdx]
                            );
                            // console.log(`Prev tab: ${prevIdx}`);
                        }
                    }
                    break;

                case 'switch-to-index':
                    if (tabManager.tabs && tabManager.tabs[action.index] && typeof tabManager.setActiveTab === 'function') {
                        tabManager.setActiveTab(
                            tabManager.tabs[
                                action.index
                            ]
                        );
                        // console.log(`Switch to tab: ${action.index}`);
                    } else {
                        console.warn(`Tab index ${action.index} not found`);
                    }
                    break;

                case 'switch-to-last':
                    if (tabManager.tabs && tabManager.tabs.length > 0 && typeof tabManager.setActiveTab === 'function') {
                        const lastIdx = tabManager.tabs.length - 1;
                        tabManager.setActiveTab(
                            tabManager.tabs[lastIdx]
                        );
                        // console.log(`Switch to last tab: ${lastIdx}`);
                    }
                    break;

                default:
                    console.warn('Unknown action:', action.type);
            }

            updateTabsUI();

        } catch (error) {
            console.error('Error executing shortcut:', error);
        } finally {
            // Release the lock after a short delay to allow UI to settle
            setTimeout(() => {
                actionInProgress = false;
            }, 100);
        }
    });

    isRegistered = true;
    // console.log('Tab shortcuts registered successfully');
};

export const unregisterTabShortcuts = () => {
    if (!isRegistered) {
        return;
    }

    ipcMain.removeAllListeners('keyboard-shortcut');
    isRegistered = false;
    lastActionTime = 0;
    actionInProgress = false;
};