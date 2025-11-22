import { noteFeaturesConfig } from './noteConfig.js';
import {
    autoSaveTimeout,
    currentFontSize,
    activeTabId,
    tabsData,
    setAutoSaveTimeout,
    setCurrentFontSize,
    lastMainProcessSaveTime,
    setActiveTabId,
    addEventListenerTracker
} from './state.js';

/**
 * Creates a function to update the status indicator UI.
 * @param {{statusText: HTMLElement, saveIndicator: HTMLElement}} els - An object containing the status text and save indicator DOM elements.
 * @returns {function(string, string|null=): void} A function that takes a statusType ('typing', 'saving', 'saved', 'error')
 * and an optional customText to update the UI.
 */
export const createSetStatus = (els) => {
    return (
        statusType,
        customText = null
    ) => {
        const statusConfig = noteFeaturesConfig.status[statusType];

        if (!statusConfig && !customText) {
            console.warn(`Unknown status: ${statusType}`);
            return;
        }

        els.statusText.textContent = customText || statusConfig;
        els.saveIndicator.className = `dot ${statusType}`;
    };
};

/**
 * Creates a function to load data for a specific tab into the editor.
 * @param {{textarea: HTMLTextAreaElement}} els - An object containing the textarea element.
 * @param {function} setStatus - The function created by `createSetStatus` to update the UI status.
 * @returns {function(string): Promise<void>} An async function that takes a `tabId` and loads its
 * corresponding text and font size into the textarea.
 */
export const createLoadTabData = (els, setStatus) => {
    return async (tabId) => {
        try {
            setActiveTabId(tabId);
            const data = tabsData[tabId] || {
                text: '',
                fontSize: noteFeaturesConfig.defaultFontSize
            };
            els.textarea.value = data.text;
            setCurrentFontSize(data.fontSize);
            els.textarea.style.fontSize = `${data.fontSize}px`;
        } catch (error) {
            console.error('Error loading tab:', error);
            setStatus('error', 'Failed to load');
            throw error;
        }
    };
};

/**
 * Creates a function to save the current state of the active tab.
 * @param {{textarea: HTMLTextAreaElement}} els - An object containing the textarea element.
 * @param {function} setStatus - The function created by `createSetStatus`.
 * @returns {function(): Promise<void>} An async function that saves the textarea's content and current font size
 * to the in-memory `tabsData` object and throttles saving the entire tab state to the main process.
 */
export const createSaveTabData = (els, setStatus) => {
    return async () => {
        try {
            if (!activeTabId) {
                console.warn('No active tab to save');
                return;
            }

            tabsData[activeTabId] = {
                text: els.textarea.value,
                fontSize: currentFontSize
            };

            setStatus(
                'saved',
                `Saved ${new Date().toLocaleTimeString('th-Th')
                }`
            );

            setTimeout(() => setStatus('saved'), 1000);

            // Save
            const now = Date.now();
            if (now - lastMainProcessSaveTime > noteFeaturesConfig.mainProcessSaveThrottle) {
                if (window.electronAPI && typeof window.electronAPI.saveTabs === 'function') {
                    console.log(`Auto-saving to main process (throttled)...`);
                    try {
                        await window.electronAPI.saveTabs();
                        lastMainProcessSaveTime = now;
                    } catch (e) {
                        console.error('Error during throttled auto-save to main process:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            setStatus('error');
            throw error;
        }
    }
};

/**
 * Creates a set of functions for handling zoom functionality (in, out, reset).
 * @param {{textarea: HTMLTextAreaElement}} els - An object containing the textarea element.
 * @param {function(): Promise<void>} saveTabData - The function created by `createSaveTabData` to persist changes.
 * @returns {{zoomIn: function(): Promise<void>, zoomOut: function(): Promise<void>, resetZoom: function(): Promise<void>}}
 * An object containing `zoomIn`, `zoomOut`, and `resetZoom` async functions.
 */
export const createZoomHandlers = (els, saveTabData) => {
    const zoomIn = async () => {
        try {
            if (currentFontSize < noteFeaturesConfig.maxFontSize) {
                const newSize = currentFontSize + noteFeaturesConfig.fontStep;
                setCurrentFontSize(newSize);
                els.textarea.style.fontSize = `${newSize}px`;
                await saveTabData();
            }
        } catch (error) {
            console.error('Error zooming in:', error);
            throw error;
        }
    };

    const zoomOut = async () => {
        try {
            if (currentFontSize > noteFeaturesConfig.minFontSize) {
                const newSize = currentFontSize - noteFeaturesConfig.fontStep;
                setCurrentFontSize(newSize);
                els.textarea.style.fontSize = `${newSize}px`;
                await saveTabData();
            }
        } catch (error) {
            console.error('Error zooming out:', error);
            throw error;
        }
    };

    const resetZoom = async () => {
        try {
            setCurrentFontSize(noteFeaturesConfig.defaultFontSize);
            els.textarea.style.fontSize = `
                ${noteFeaturesConfig.defaultFontSize}px
            `;
            await saveTabData();
        } catch (error) {
            console.error('Error resetting zoom:', error);
            throw error;
        }
    };

    return {
        zoomIn,
        zoomOut,
        resetZoom
    };
};

/**
 * Creates a function that triggers a debounced auto-save.
 * @param {function} setStatus - The function created by `createSetStatus`.
 * @param {function(): Promise<void>} saveTabData - The function created by `createSaveTabData`.
 * @returns {function(): void} A function that should be called on user input. It clears any pending
 * save, sets the status to 'typing', and schedules a new save after a configured delay.
 */
export const createTriggerAutoSave = (setStatus, saveTabData) => {
    return () => {
        clearTimeout(autoSaveTimeout);
        setStatus('typing');

        const timeout = setTimeout(async () => {
            setStatus('saving');
            try {
                await saveTabData();
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        },
            noteFeaturesConfig.autoSaveDelay
        );

        setAutoSaveTimeout(timeout);
    };
};

// Helper to create a debounced input handler.
const debouncedInputHandler = (triggerAutoSave) => {
    let debounceTimer = null;
    return (e) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            triggerAutoSave();
        }, 10);
    };
};

/**
 * Sets up all necessary event listeners for the note editor.
 * This includes input handling for auto-save and keyboard/mouse shortcuts for zooming.
 * @param {{textarea: HTMLTextAreaElement}} els - An object containing the textarea element.
 * @param {function(): void} triggerAutoSave - The auto-save trigger function.
 * @param {function(): Promise<void>} zoomIn - The zoom-in function.
 * @param {function(): Promise<void>} zoomOut - The zoom-out function.
 * @param {function(): Promise<void>} resetZoom - The zoom-reset function.
 */
export const setupEventListeners = (
    els,
    triggerAutoSave,
    zoomIn,
    zoomOut,
    resetZoom
) => {
    const inputHandler = debouncedInputHandler(triggerAutoSave);
    els.textarea.addEventListener(
        'input', inputHandler
    );

    addEventListenerTracker(
        els.textarea,
        'input',
        inputHandler
    ); 

    const keydownHandler = async (e) => {
        if (e.ctrlKey || e.metaKey) {
            try {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    await zoomIn();
                } else if (e.key === '-' || e.key === '_') {
                    e.preventDefault();
                    await zoomOut();
                } else if (e.key === '0') {
                    e.preventDefault();
                    await resetZoom();
                }
            } catch (error) {
                console.error('Keyboard shortcut error:', error);
            }
        }
    };

    document.addEventListener(
        'keydown', keydownHandler
    );

    addEventListenerTracker(
        document,
        'keydown',
        keydownHandler
    );

    // Mouse wheel zoom
    const wheelHandler = async (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();

            try {
                e.deltaY < 0 ? await zoomIn() : await zoomOut();
            } catch (error) {
                console.error('Wheel zoom error:', error);
            }
        }
    };

    els.textarea.addEventListener(
        'wheel', wheelHandler,
        { passive: false }
    );

    addEventListenerTracker(
        els.textarea,
        'wheel',
        wheelHandler
    );
};