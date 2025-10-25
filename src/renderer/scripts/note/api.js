import { noteFeaturesConfig } from './noteConfig.js';
import {
    activeTabId,
    tabsData,
    currentFontSize,
    setActiveTabId,
    clearEventListeners,
    autoSaveTimeout,
    addEventListenerTracker
} from './state.js';
import {
    createSetStatus,
    createLoadTabData,
    createSaveTabData,
    createZoomHandlers,
    createTriggerAutoSave,
    setupEventListeners
} from './notehandlers.js';

/**
 * Initialize note features with auto-save and zoom controls
 * @param {string} textareaId - Textarea element ID
 * @param {string} saveIndicatorId - Save indicator element ID
 * @param {string} statusTextId - Status text element ID
 * @returns {Promise<Object|null>} Note API or null on error
 */
export const noteFeatures = async (
    textareaId = 'autoSaveTextarea',
    saveIndicatorId = 'saveIndicator',
    statusTextId = 'statusText'
) => {
    try {
        const els = {
            textarea: document.getElementById(textareaId),
            saveIndicator: document.getElementById(saveIndicatorId),
            statusText: document.getElementById(statusTextId)
        };

        if (!els.textarea || !els.saveIndicator || !els.statusText) {
            throw new Error('Note.js: Required elements not found');
        }

        // Create handlers
        const setStatus = createSetStatus(els);
        const loadTabData = createLoadTabData(els, setStatus);
        const saveTabData = createSaveTabData(els, setStatus);
        const { zoomIn, zoomOut, resetZoom } = createZoomHandlers(els, saveTabData);
        const triggerAutoSave = createTriggerAutoSave(setStatus, saveTabData);

        // Setup event listeners
        setupEventListeners(
            els,
            triggerAutoSave,
            zoomIn,
            zoomOut,
            resetZoom
        );

        // Electron or browser fallback
        if (window.electronAPI && window.electronAPI.onLoadTabData) {
            try {
                window.electronAPI.onLoadTabData(async (tabId, data) => {
                    try {
                        tabsData[tabId] = data || {
                            text: '',
                            fontSize: noteFeaturesConfig.defaultFontSize
                        };
                        await loadTabData(tabId);
                    } catch (error) {
                        console.error('Error loading Electron tab:', error);
                    }
                });
            } catch (error) {
                console.error('Error setting up Electron API:', error);
            }
        } else {
            await loadTabData('default-tab');
        }

        // Before unload handler
        const beforeUnloadHandler = async () => {
            try {
                await saveTabData();
            } catch (error) {
                console.error('Error saving before unload:', error);
            }
        };

        window.addEventListener(
            'beforeunload',
            beforeUnloadHandler
        );

        addEventListenerTracker(
            window,
            'beforeunload',
            beforeUnloadHandler
        );

        // Cleanup event listeners
        const cleanup = () => {
            clearEventListeners();
            clearTimeout(autoSaveTimeout);
        };

        // Return API
        return {
            loadTabData,
            saveTabData,
            zoomIn,
            zoomOut,
            resetZoom,
            getActiveTabId: () => activeTabId,
            getTabsData: () => tabsData,
            getCurrentFontSize: () => currentFontSize,
            cleanup
        };
    } catch (error) {
        console.error('Failed to initialize note features:', error);
        return null;
    }
};