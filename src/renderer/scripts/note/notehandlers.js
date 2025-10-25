import { noteFeaturesConfig } from './noteConfig.js';
import {
    autoSaveTimeout,
    currentFontSize,
    activeTabId,
    tabsData,
    setAutoSaveTimeout,
    setCurrentFontSize,
    setActiveTabId,
    addEventListenerTracker
} from './state.js';

// Set status indicator
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

// Load tab data
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

// Save current tab data
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
        } catch (error) {
            console.error('Error saving:', error);
            setStatus('error');
            throw error;
        }
    }
};

// Zoom functions
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

// Auto-save trigger 
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

// Setup event listeners
export const setupEventListeners = (
    els,
    triggerAutoSave,
    zoomIn,
    zoomOut,
    resetZoom
) => {
    const inputHandler = triggerAutoSave;
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