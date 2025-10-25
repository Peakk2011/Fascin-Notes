export class TabIPCBridge {
    constructor() {
        this.isAvailable = false;
        this.callbacks = {
            onTabsUpdated: null
        };
    }

    init() {
        if (!window.electronAPI) {
            console.warn('electronAPI is not available');
            return false;
        }

        this.isAvailable = true;
        this.setupListeners();
        return true;
    }

    setupListeners() {
        if (!this.isAvailable) return;

        try {
            window.electronAPI.onTabsUpdated((data) => {
                if (this.callbacks.onTabsUpdated) {
                    this.callbacks.onTabsUpdated(data);
                }
            });
        } catch (error) {
            console.error('Error setting up IPC listeners:', error);
        }
    }

    onTabsUpdated(callback) {
        this.callbacks.onTabsUpdated = callback;
    }

    // Notify main process
    notifyNewTab(title) {
        if (!this.isAvailable) return;
        window.electronAPI.newTab(title);
    }

    notifySwitchTab(index) {
        if (!this.isAvailable) return;
        window.electronAPI.switchTab(index);
    }

    notifyCloseTab(index) {
        if (!this.isAvailable) return;
        window.electronAPI.closeTab(index);
    }

    notifyReorderTabs(fromIndex, toIndex) {
        if (!this.isAvailable) return;
        window.electronAPI.reorderTabs(fromIndex, toIndex);
    }

    notifyCloseApp() {
        if (!this.isAvailable) return;
        window.electronAPI.closeApp();
    }
}