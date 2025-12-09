import { noteFeaturesConfig } from './noteConfig.js';
import {
    currentFontSize,
    clearEventListeners,
    autoSaveTimeout,
    addEventListenerTracker
} from './state.js';
import {
    createSetStatus,
    createLoadData,
    createSaveData,
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
    if (window.__noteFeaturesInitialized) {
        console.warn('noteFeatures already initialized - skipping duplicate init');
        return null;
    }

    window.__noteFeaturesInitialized = true;
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
        const loadData = createLoadData(els, setStatus);
        const saveData = createSaveData(els, setStatus);
        const { zoomIn, zoomOut, resetZoom } = createZoomHandlers(els, saveData);
        const triggerAutoSave = createTriggerAutoSave(setStatus, saveData);

        // Setup event listeners
        setupEventListeners(
            els,
            triggerAutoSave,
            zoomIn,
            zoomOut,
            resetZoom
        );

        // Defer initial data load
        queueMicrotask(() => {
            loadData().catch(error => {
                console.error('Error loading default data:', error);
            });
        });

        // Before unload handler
        const beforeUnloadHandler = async () => {
            try {
                await saveData();
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
            loadData,
            saveData,
            zoomIn,
            zoomOut,
            resetZoom,
            getCurrentFontSize: () => currentFontSize,
            cleanup
        };
    } catch (error) {
        console.error('Failed to initialize note features:', error);
        return null;
    }
};