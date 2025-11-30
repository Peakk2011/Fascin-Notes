// Setup listeners for tab changes and auto-sync with renderer
import { IpcManager } from './ipcManager.js';

export class TabChangeListener {
    constructor(tabManager, ipcManager) {
        this.tabManager = tabManager;
        this.ipcManager = ipcManager;
        this.originalMethods = new Map();
        this.syncTimeout = null;
    }

    start() {
        this.setupMethodOverrides();
        console.log('Tab change listeners started');
    }

    stop() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
            this.syncTimeout = null;
        }
        this.restoreOriginalMethods();
        console.log('Tab change listeners stopped');
    }

    setupMethodOverrides() {
        const methodsToOverride = [
            'createTab',
            'setActiveTab',
            'closeTabByIndex',
            'reorderTabs'
        ];

        methodsToOverride.forEach(methodName => {
            if (typeof this.tabManager[methodName] === 'function') {
                console.log(`Overriding method: ${methodName}`);
                this.overrideMethod(methodName);
            }
        });
    }

    overrideMethod(methodName) {
        // Store original method
        this.originalMethods.set(
            methodName,
            this.tabManager[methodName].bind(this.tabManager)
        );

        this.tabManager[methodName] = (...args) => {
            console.log(`Method called: ${methodName}`); 

            const result = this.originalMethods.get(methodName)(...args);

            if (this.syncTimeout) {
                clearTimeout(this.syncTimeout);
            }

            this.syncTimeout = setTimeout(() => {
                if (this.ipcManager && typeof this.ipcManager.syncTabsToAllWindows === 'function') {
                    console.log(`Syncing tabs after ${methodName}`);
                    this.ipcManager.syncTabsToAllWindows();
                }
                this.syncTimeout = null;
            }, 30);

            return result;
        };
    }

    restoreOriginalMethods() {
        this.originalMethods.forEach((originalMethod, methodName) => {
            this.tabManager[methodName] = originalMethod;
        });
        this.originalMethods.clear();
    }
}