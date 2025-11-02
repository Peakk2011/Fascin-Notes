/**
 * Acts as a bridge between the renderer's TabManager and the main process.
 * It uses the `window.electronAPI` (exposed via preload script) to send notifications
 * to the main process and to receive updates from it.
 */
export class TabIPCBridge {
    /**
     * Initializes the bridge state.
     */
    constructor() {
        /** @type {boolean} - Whether the Electron API is available. */
        this.isAvailable = false;
        /** @type {{onTabsUpdated: Function|null}} - Stores callbacks for IPC events. */
        this.callbacks = {
            onTabsUpdated: null
        };
    }

    /**
     * Initializes the bridge by checking for the Electron API and setting up listeners.
     * @returns {boolean} True if initialization was successful, false otherwise.
     */
    init() {
        if (!window.electronAPI) {
            console.warn('electronAPI is not available');
            return false;
        }

        this.isAvailable = true;
        this.setupListeners();
        return true;
    }

    /**
     * Sets up listeners for events coming from the main process.
     * Specifically, it listens for 'tabs-updated' events to sync the tab bar state.
     * @private
     */
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

    /**
     * Registers a callback function to be executed when tab data is updated from the main process.
     * This is used by TabManager to receive sync data.
     * @param {function(object): void} callback - The function to call with the updated tabs data.
     */
    onTabsUpdated(callback) {
        this.callbacks.onTabsUpdated = callback;
    }

    /**
     * Notifies the main process to create a new tab.
     * This sends a 'new-tab' IPC message.
     * @param {string} title - The title for the new tab.
     */
    notifyNewTab(title) {
        if (!this.isAvailable) return;
        window.electronAPI.newTab(title);
    }

    /**
     * Notifies the main process to switch to a different tab.
     * This sends a 'switch-tab' IPC message.
     * @param {number} index - The index of the tab to switch to.
     */
    notifySwitchTab(index) {
        if (!this.isAvailable) return;
        window.electronAPI.switchTab(index);
    }

    /**
     * Notifies the main process to close a tab.
     * This sends a 'close-tab' IPC message.
     * @param {number} index - The index of the tab to close.
     */
    notifyCloseTab(index) {
        if (!this.isAvailable) return;
        window.electronAPI.closeTab(index);
    }

    /**
     * Notifies the main process that the tabs have been reordered.
     * This sends a 'reorder-tabs' IPC message.
     * @param {number} fromIndex - The original index of the tab.
     * @param {number} toIndex - The new index of the tab.
     */
    notifyReorderTabs(fromIndex, toIndex) {
        if (!this.isAvailable) return;
        window.electronAPI.reorderTabs(fromIndex, toIndex);
    }

    /**
     * Notifies the main process to close the application.
     * This is typically called when the last tab is closed by the user.
     * This sends a 'close-app' IPC message.
     */
    notifyCloseApp() {
        if (!this.isAvailable) return;
        window.electronAPI.closeApp();
    }
}