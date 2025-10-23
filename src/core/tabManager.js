import { BrowserView } from "electron";
import path from 'node:path';
import { resolvePath } from '../utils/paths.js';
import { OS } from '../config/osConfig.js';

export class TabManager {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.tabs = [];
        this.activeTab = null;
    }

    // Create a new tab with
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
            tab.view.webContents.loadFile(path.join(resolvePath('../index.html')));
            tab.loaded = true;
        }

        this.mainWindow.addBrowserView(tab.view);
        this.layoutActiveTab();
    }

    reorderTabs(fromIndex, toIndex) {
        if (fromIndex === toIndex) { return; }
        const [tab] = this.tabs.splice(fromIndex, 1);
        this.tabs.splice(toIndex, 0, tab);
    }

    layoutActiveTab() {
        if (!this.activeTab) { return; }
        const [width, height] = this.mainWindow.getContentSize();
        this.activeTab.view.setBounds({ x: 0, y: 36, width, height: height - 36 });
        this.activeTab.view.setAutoResize({ width: true, height: true });
    }

    closeTab(tab) {
        const idx = this.tabs.indexOf(tab);
        if (idx === -1) { return; }

        if (this.activeTab === tab) {
            const nextTab = this.tabs[idx + 1] || this.tabs[idx - 1] || null;
            if (nextTab) this.setActiveTab(nextTab);
            else this.activeTab = null;
        }

        this.mainWindow.removeBrowserView(tab.view);
        this.tabs.splice(idx, 1);
    }

    closeTabByIndex(index) {
        const tab = this.tabs[index];
        if (!tab) { return; };
        this.closeTab(tab);
    }
}