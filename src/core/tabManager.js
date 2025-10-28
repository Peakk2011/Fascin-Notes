import { BrowserView } from "electron";
import path from 'node:path';
import { resolvePath } from '../utils/paths.js';
import { OS } from '../config/osConfig.js';

export class TabManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tabs = [];
        this.activeTab = null;
        this.isDestroyed = false;

        // Sore reference of listeners to cleanup
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

    createTab(title = `Tab ${this.tabs.length + 1}`) {
        if (this.isDestroyed) {
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
            loaded: false
        };
        this.tabs.push(tab);

        this.setActiveTab(tab);
        return tab;
    }

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

    getTabCount() {
        return this.tabs.length;
    }

    getActiveTab() {
        return this.activeTab;
    }

    getAllTabs() {
        return [...this.tabs];
    }

    closeAllTabs() {
        if (this.isDestroyed) {
            return;
        }
        const tabsToClose = [...this.tabs];

        tabsToClose.forEach(tab => {
            this.closeTab(tab);
        });
    }

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

        // Clear all references
        this.mainWindow = null;
        this.resizeHandler = null;
        this.enterFullScreenHandler = null;
        this.leaveFullScreenHandler = null;
    }

    isManagerDestroyed() {
        return this.isDestroyed;
    }
}