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
        /** @private {boolean} - Whether listeners have been setup already to avoid duplicate binds */
        this._listenersSetup = false;
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
        if (this._listenersSetup) return;

        try {
            if (typeof window.electronAPI.onTabsUpdated === 'function') {
                this.unsubscribeUpdated = window.electronAPI.onTabsUpdated((data) => {
                    if (this.callbacks.onTabsUpdated) {
                        this.callbacks.onTabsUpdated(this._normalizeTabsPayload(data));
                    }
                });
            }

            if (typeof window.electronAPI.onTabsSync === 'function') {
                this.unsubscribeSync = window.electronAPI.onTabsSync(async (data) => {
                    try {
                        if (window.electronAPI && typeof window.electronAPI.loadTabs === 'function') {
                            try {
                                const res = await window.electronAPI.loadTabs();
                                if (res && res.success && Array.isArray(res.tabs)) {
                                    const saved = res.tabs;
                                    if (Array.isArray(data.tabs) && Array.isArray(saved)) {
                                        // Build lookup by id from saved
                                        const savedById = {};
                                        for (let s of saved) {
                                            if (s && (s.id || s.tabId)) {
                                                savedById[s.id || s.tabId] = s;
                                            }
                                        }

                                        for (let i = 0; i < data.tabs.length; i++) {
                                            const t = data.tabs[i] || {};
                                            const id = t.id || t.tabId || null;
                                            if (id && savedById[id]) {
                                                data.tabs[i].content = savedById[id].content || data.tabs[i].content || '';
                                            } else if (saved[i]) {
                                                // fallback to index-based merge if ids not present
                                                data.tabs[i].content = saved[i].content || data.tabs[i].content || '';
                                            } else {
                                                data.tabs[i].content = data.tabs[i].content || '';
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn('Failed to load saved tabs for content merge:', e && e.message);
                            }
                        }
                    } catch (err) {
                        console.error('Error while merging saved tab content:', err);
                    } finally {
                        if (this.callbacks.onTabsUpdated) {
                            this.callbacks.onTabsUpdated(this._normalizeTabsPayload(data));
                        }
                    }
                });
            }

            this._listenersSetup = true;
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
        return () => {
            this.callbacks.onTabsUpdated = null;
            // remove any registered listeners via preload if available
            try {
                if (typeof this.unsubscribeUpdated === 'function') this.unsubscribeUpdated();
            } catch (e) { }
            try {
                if (typeof this.unsubscribeSync === 'function') this.unsubscribeSync();
            } catch (e) { }
        };
    }

    /**
     * Normalize incoming payloads from different IPC channels into the
     * shape expected by the renderer TabManager: { tabs: Array, activeIndex: number }
     * @private
     */
    _normalizeTabsPayload(data) {
        if (!data || typeof data !== 'object') return { tabs: [], activeIndex: -1 };

        const tabs = Array.isArray(data.tabs) ? data.tabs : [];

        let activeIndex = -1;

        if (typeof data.activeIndex === 'number') {
            activeIndex = data.activeIndex;
        } else if (typeof data.activeTabIndex === 'number') {
            activeIndex = data.activeTabIndex;
        } else {
            // try to find a tab marked as active
            const idx = tabs.findIndex(t => t.isActive || t.active === true || t.is_active === true);
            activeIndex = idx >= 0 ? idx : -1;
        }

        return { tabs, activeIndex };
    }

    /**
     * Clean up any listeners registered through the preload bridge.
     */
    destroy() {
        try {
            if (typeof this.unsubscribeUpdated === 'function') this.unsubscribeUpdated();
        } catch (e) { }
        try {
            if (typeof this.unsubscribeSync === 'function') this.unsubscribeSync();
        } catch (e) { }
        this.callbacks.onTabsUpdated = null;
        this.isAvailable = false;
    }

    /**
     * Notifies the main process to create a new tab.
     * This sends a 'new-tab' IPC message.
     * @param {string} title - The title for the new tab.
     */
    notifyNewTab(title) {
        try {
            // IPC bridge not available → Stop
            if (!this.isAvailable || !window.electronAPI?.newTab) {
                console.warn('newTab not available');
                return;
            }

            // Title normalization
            if (typeof title !== 'string' || !title.trim()) {
                title = 'New Tab';
            }

            if (this.isDestroyed) {
                console.warn('notifyNewTab blocked: instance destroyed');
                return;
            }

            window.electronAPI.newTab(String(title));
        } catch (err) {
            console.error('Failed to send newTab:', err);
        }
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