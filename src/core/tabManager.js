import { BrowserView } from "electron";
import path from 'node:path';
import { resolvePath } from '../utils/paths.js';
import { OS } from '../config/osConfig.js';

/**
 * Manages a collection of tabs, where each tab is a BrowserView,
 * within a main BrowserWindow. It handles creating, activating,
 * closing, and laying out tabs.
 */
export class TabManager {
    /**
     * @param {import('electron').BrowserWindow} mainWindow The main window that will host the tabs.
     */
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tabs = [];
        this.activeTab = null;
        this.isDestroyed = false;
        this.mainWindow.setMaxListeners(20);

        // Store references of listeners for cleanup
        this.resizeHandler = () => {
            if (!this.isDestroyed) {
                this.layoutActiveTab();
            }
        };

        this.enterFullScreenHandler = () => {
            if (!this.isDestroyed) {
                this.layoutActiveTab();
            }
        };

        this.leaveFullScreenHandler = () => {
            if (!this.isDestroyed) {
                this.layoutActiveTab();
            }
        };

        this.mainWindow.on(
            'resize',
            this.resizeHandler
        );
        this.mainWindow.on(
            'enter-full-screen',
            this.enterFullScreenHandler
        );
        this.mainWindow.on(
            'leave-full-screen',
            this.leaveFullScreenHandler
        );
    }

    /**
     * Creates a new tab with a given title and optional content.
     * @param {string} [title=`Tab ${this.tabs.length + 1}`] - The title for the new tab.
     * @param {boolean} [shouldSync=true] - Whether to immediately set the new tab as active.
     * @param {string|null} [contentToLoad=null] - Initial text content to load into the tab's textarea.
     * @returns {object|null} The created tab object or null if the tab limit is reached or the manager is destroyed.
     * The tab object contains `title`, `view` (BrowserView), `loaded` status, and `contentToLoad`.
     */
    createTab(title = `Tab ${this.tabs.length + 1}`, shouldSync = true, contentToLoad = null) {
        if (this.isDestroyed) {
            return null;
        }

        if (this.tabs.length >= 7) {
            return null;
        }

        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: resolvePath('../preload.js'),
            }
        });

        const tab = {
            title,
            view,
            loaded: false,
            contentToLoad: contentToLoad // Store content to be loaded
        };
        this.tabs.push(tab);

        if (shouldSync) {
            this.setActiveTab(tab);
        } else {
            this.activeTab = tab;
        }

        return tab;
    }

    /**
     * Sets the specified tab as the active and visible one.
     * It handles removing the previous view and adding the new one.
     * @param {object} tab - The tab object to activate.
     */
    setActiveTab(tab) {
        if (this.isDestroyed || !tab) {
            return;
        }

        if (this.activeTab?.view) {
            try {
                this.mainWindow.removeBrowserView(
                    this.activeTab.view
                );
            } catch (error) {
                console.warn(
                    'Warning: Could not remove browser view:',
                    error.message
                );
            }
        }

        this.activeTab = tab;

        if (!tab.loaded) {
            try {
                tab.view.webContents.loadFile(
                    path.join(
                        resolvePath('../index.html')
                    )
                );

                if (tab.contentToLoad) {
                    tab.view.webContents.once('dom-ready', () => {
                        const escapedContent = JSON.stringify(tab.contentToLoad);
                        tab.view.webContents.executeJavaScript(
                            `document.getElementById("autoSaveTextarea").value = ${escapedContent};`
                        ).catch(
                            err => console.error(
                                'Failed to restore content on setActiveTab:',
                                err.message
                            )
                        );
                    });
                }
                tab.loaded = true;
            } catch (error) {
                console.error(
                    'Error loading tab content:',
                    error.message
                );
                return;
            }
        }

        try {
            this.mainWindow.addBrowserView(tab.view);
            this.layoutActiveTab();
        } catch (error) {
            console.error(
                'Error adding browser view:',
                error.message
            );
        }
    }

    /**
     * Adjusts the position and size of the active tab's BrowserView
     * to fit within the main window's content area, below the tab bar.
     */
    layoutActiveTab() {
        if (!this.activeTab || this.isDestroyed) return;

        try {
            const [width, height] = this.mainWindow.getContentSize();
            this.activeTab.view.setBounds({
                x: 0,
                y: 38,
                width,
                height: height - 38,
            });
        } catch (error) {
            console.warn(
                'Warning: Could not layout active tab:',
                error.message
            );
        }
    }

    /**
     * Reorders the tabs array based on user drag-and-drop actions.
     * @param {number} fromIndex - The original index of the tab being moved.
     * @param {number} toIndex - The new index for the tab.
     */
    reorderTabs(fromIndex, toIndex) {
        if (this.isDestroyed) return;

        // Validate indices
        if (fromIndex < 0 || fromIndex >= this.tabs.length ||
            toIndex < 0 || toIndex >= this.tabs.length) {
            return;
        }

        // Move the tab from fromIndex to toIndex
        const [movedTab] = this.tabs.splice(fromIndex, 1);
        this.tabs.splice(
            toIndex,
            0,
            movedTab
        );
    }

    /**
     * Closes a specific tab, destroys its BrowserView, and activates the next available tab.
     * @param {object} tab - The tab object to close.
     */
    closeTab(tab) {
        if (this.isDestroyed || !tab) {
            return;
        }

        const idx = this.tabs.indexOf(tab);
        if (idx === -1) {
            return;
        }

        if (this.activeTab === tab) {
            const nextTab = this.tabs[idx + 1] || this.tabs[idx - 1] || null;
            if (nextTab) this.setActiveTab(nextTab);
            else this.activeTab = null;
        }

        // Remove view from window first
        try {
            this.mainWindow.removeBrowserView(tab.view);
        } catch (error) {
            console.warn(
                'Warning: Could not remove browser view:',
                error.message
            );
        }

        // Then destroy webContents
        try {
            if (tab.view.webContents && !tab.view.webContents.isDestroyed()) {
                tab.view.webContents.destroy();
            }
        } catch (error) {
            console.warn(
                'Warning: Could not destroy web contents:',
                error.message
            );
        }

        // Destroy BrowserView object
        try {
            // @ts-ignore - destroy method exists but not in types
            if (typeof tab.view.destroy === 'function') {
                tab.view.destroy();
            }
        } catch (error) {
            console.warn(
                'Warning: Could not destroy browser view:',
                error.message
            );
        }

        // Clear referrence & Remove from tabs array
        tab.view = null;
        this.tabs.splice(idx, 1);
    }

    /**
     * @returns {number} The current number of open tabs.
     */
    getTabCount() {
        return this.tabs.length;
    }

    /**
     * @returns {object|null} The currently active tab object.
     */
    getActiveTab() {
        return this.activeTab;
    }

    /**
     * @returns {Array<object>} A shallow copy of the array of all tab objects.
     */
    getAllTabs() {
        return [...this.tabs];
    }

    /**
     * Closes all open tabs.
     */
    closeAllTabs() {
        if (this.isDestroyed) {
            return;
        }
        const tabsToClose = [...this.tabs];

        tabsToClose.forEach(tab => {
            this.closeTab(tab);
        });
    }

    /**
     * Cleans up all resources used by the TabManager.
     * Destroys all BrowserViews and removes event listeners to prevent memory leaks.
     */
    destroy() {
        this.isDestroyed = true;
        const tabsToDestroy = [...this.tabs];

        tabsToDestroy.forEach(tab => {
            try {
                this.mainWindow.removeBrowserView(tab.view);
            } catch (error) {
                console.warn(
                    'Warning: Could not remove browser view:',
                    error.message
                );
            }

            try {
                if (tab.view.webContents && !tab.view.webContents.isDestroyed()) {
                    tab.view.webContents.destroy();
                }
            } catch (error) {
                console.warn(
                    'Warning: Could not destroy web contents:',
                    error.message
                );
            }

            // Destroy BrowserView
            try {
                if (typeof tab.view.destroy === 'function') {
                    tab.view.destroy();
                }
            } catch (error) {
                console.warn(
                    'Warning: Cound not destroy browserView:',
                    error.message
                );
            }

            tab.view = null;
        });

        this.tabs = [];
        this.activeTab = null;

        if (this.mainWindow) {
            this.mainWindow.removeListener('resize', this.resizeHandler);
            this.mainWindow.removeListener(
                'enter-full-screen',
                this.enterFullScreenHandler
            );
            this.mainWindow.removeListener(
                'leave-full-screen',
                this.leaveFullScreenHandler
            );
        }

        // Clear all references
        this.mainWindow = null;
        this.resizeHandler = null;
        this.enterFullScreenHandler = null;
        this.leaveFullScreenHandler = null;
    }

    /**
     * @returns {boolean} True if the manager has been destroyed, false otherwise.
     */
    isManagerDestroyed() {
        return this.isDestroyed;
    }
}