import { noteFeaturesConfig } from './noteConfig.js';
import {
    autoSaveTimeout,
    currentFontSize,
    setAutoSaveTimeout,
    setCurrentFontSize,
    lastMainProcessSaveTime,
    addEventListenerTracker
} from './state.js';

let editorContent = {
    text: '',
    fontSize: noteFeaturesConfig.defaultFontSize
};

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
 * Creates a function to load data into the editor.
 * @param {{textarea: HTMLTextAreaElement}} els - An object containing the textarea element.
 * @param {function} setStatus - The function created by `createSetStatus` to update the UI status.
 * @returns {function(): Promise<void>} An async function that loads its
 * corresponding text and font size into the textarea.
 */
export const createLoadData = (els, setStatus) => {
    return async () => {
        try {
            const savedContent = localStorage.getItem('editorContent');
            
            if (savedContent) {
                editorContent = JSON.parse(savedContent);
            }

            els.textarea.innerHTML = editorContent.text;
            setCurrentFontSize(editorContent.fontSize);
            els.textarea.style.fontSize = `${editorContent.fontSize}px`;
        } catch (error) {
            console.error('Error loading data:', error);
            setStatus('error', 'Failed to load');
            throw error;
        }
    };
};

/**
 * Creates a function to save the current state of the editor.
 * @param {{textarea: HTMLTextAreaElement}} els - An object containing the textarea element.
 * @param {function} setStatus - The function created by `createSetStatus`.
 * @returns {function(): Promise<void>} An async function that saves the textarea's content and current font size
 * to the in-memory `editorContent` object.
 */
export const createSaveData = (els, setStatus) => {
    return async () => {
        try {
            editorContent = {
                text: els.textarea.innerHTML,
                fontSize: currentFontSize
            };

            localStorage.setItem(
                'editorContent',
                JSON.stringify(editorContent)
            );

            setStatus(
                'saved',
                `Saved ${new Date().toLocaleTimeString('th-Th')
                }`
            );

            setTimeout(() => setStatus('saved'), 1000);

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
 * @param {function(): Promise<void>} saveData - The function created by `createSaveData` to persist changes.
 * @returns {{zoomIn: function(): Promise<void>, zoomOut: function(): Promise<void>, resetZoom: function(): Promise<void>}}
 * An object containing `zoomIn`, `zoomOut`, and `resetZoom` async functions.
 */
export const createZoomHandlers = (els, saveData) => {
    const zoomIn = async () => {
        try {
            if (currentFontSize < noteFeaturesConfig.maxFontSize) {
                const newSize = currentFontSize + noteFeaturesConfig.fontStep;
                setCurrentFontSize(newSize);
                els.textarea.style.fontSize = `${newSize}px`;
                await saveData();
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
                await saveData();
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
            await saveData();
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
 * @param {function(): Promise<void>} saveData - The function created by `createSaveData`.
 * @returns {function(): void} A function that should be called on user input. It clears any pending
 * save, sets the status to 'typing', and schedules a new save after a configured delay.
 */
export const createTriggerAutoSave = (setStatus, saveData) => {
    return () => {
        clearTimeout(autoSaveTimeout);
        setStatus('typing');

        const timeout = setTimeout(async () => {
            setStatus('saving');
            try {
                await saveData();
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