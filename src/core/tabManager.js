import { BrowserView } from "electron";
import path from 'node:path';
import { resolvePath } from '../utils/paths.js';
import { OS } from '../config/osConfig.js';

export class TabManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tabs = [];
        this.activeTab = null;

        // Listen resize event
        this.mainWindow.on('resize', () => {
            this.layoutActiveTab();
        });

        // if window (fullscreen/maximized/minimized) than...
        this.mainWindow.on('enter-full-screen', () => this.layoutActiveTab());
        this.mainWindow.on('leave-full-screen', () => this.layoutActiveTab());
    }

    createTab(title = `Tab ${this.tabs.length + 1}`) {
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: resolvePath('../preload.js'),
            }
        });

        const tab = { title, view, loaded: false };
        this.tabs.push(tab);

        this.setActiveTab(tab);
        return tab;
    }

    setActiveTab(tab) {
        if (this.activeTab?.view) {
            this.mainWindow.removeBrowserView(this.activeTab.view);
        }

        this.activeTab = tab;

        if (!tab.loaded) {
            tab.view.webContents.loadFile(
                path.join(resolvePath('../index.html'))
            );
            tab.loaded = true;
        }

        this.mainWindow.addBrowserView(tab.view);
        this.layoutActiveTab();
    }

    layoutActiveTab() {
        if (!this.activeTab) return;

        const [width, height] = this.mainWindow.getContentSize();
        this.activeTab.view.setBounds({
            x: 0,
            y: 38,
            width,
            height: height - 38,
        });
    }

    reorderTabs(fromIndex, toIndex) {
        // Validate indices
        if (fromIndex < 0 || fromIndex >= this.tabs.length || 
            toIndex < 0 || toIndex >= this.tabs.length) {
            return;
        }

        // Move the tab from fromIndex to toIndex
        const [movedTab] = this.tabs.splice(fromIndex, 1);
        this.tabs.splice(toIndex, 0, movedTab);
    }

    closeTab(tab) {
        const idx = this.tabs.indexOf(tab);
        if (idx === -1) return;

        if (this.activeTab === tab) {
            const nextTab = this.tabs[idx + 1] || this.tabs[idx - 1] || null;
            if (nextTab) this.setActiveTab(nextTab);
            else this.activeTab = null;
        }

        // Remove view from window
        this.mainWindow.removeBrowserView(tab.view);
        tab.view.webContents.destroy();
        // Remove from tabs array
        this.tabs.splice(idx, 1);
    }
    
    destroy() {
        // Cleanup all tabs when TabManager is destroyed
        this.tabs.forEach(tab => {
            this.mainWindow.removeBrowserView(tab.view);
            tab.view.webContents.destroy();
        });
        this.tabs = [];
        this.activeTab = null;
    }
}