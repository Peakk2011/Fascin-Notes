/**
 * Hides cursor/caret in keyboard mode, shows in mouse mode.
 * Auto-initializes on import for desktop devices.
 * 
 * @example
 * import './cursor.js';
 * 
 * // Or with custom config
 * import { cursor } from './cursor.js';
 * cursor.setMode('keyboard');
 * cursor.toggle();
 */

/** @private Throttles function calls */
const throttle = (fn, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
};

let currentMode = 'mouse';

/** @private Checks if input/textarea/contenteditable */
const isInputElement = (element) =>
    element && (
        element.tagName === 'INPUT' ||
        element.tagName === 'TEXTAREA' ||
        element.contentEditable === 'true'
    );

/** @private Gets all input elements */
const getAllInputs = () => Array.from(
    document.querySelectorAll(
        'input, textarea, [contenteditable="true"]'
    )
);

/** @private Applies cursor style to element */
const applyCursorStyle = (mode, element) => {
    const style = element.style;

    if (mode === 'keyboard') {
        style.cursor = 'none';
        style.setProperty(
            'cursor',
            'none',
            'important'
        );
    } else {
        style.cursor = '';
        style.removeProperty('cursor');
    }

    return element;
};

/** @private Applies caret style to input elements */
const applyCaretStyle = (mode, element) => {
    if (!isInputElement(element)) {
        return element;
    }

    const style = element.style;

    if (mode === 'keyboard') {
        style.caretColor = 'transparent';
        style.setProperty(
            'caret-color',
            'transparent',
            'important'
        );
    } else {
        style.caretColor = '';
        style.removeProperty('caret-color');
    }

    return element;
};

/** @private Injects global cursor styles */
const injectGlobalStyles = (mode) => {
    const styleId = 'cursor-styles';
    const existingStyle = document.getElementById(styleId);

    if (existingStyle) {
        existingStyle.remove();
    }

    if (mode === 'keyboard') {
        const style = document.createElement('style');
        style.id = styleId;

        style.textContent = `
            *, *::before, *::after {
                cursor: none !important;
            }
            html, body {
                cursor: none !important;
            }
        `;

        document.head.appendChild(style);
    }
};

/** @private Removes global cursor styles */
const removeGlobalStyles = () => {
    const styleSheet = document.getElementById('cursor-styles');

    if (styleSheet) {
        styleSheet.remove();
    }
};

/** @private Handles keyboard events */
const handleKeyboardEvent = (event) => {
    if (event.ctrlKey || event.metaKey) {
        return;
    }

    if (currentMode !== 'keyboard') {
        currentMode = 'keyboard';
        applyModeEffects('keyboard');
    }
};

/** @private Handles mouse events */
const handleMouseEvent = () => {
    if (currentMode !== 'mouse') {
        currentMode = 'mouse';
        applyModeEffects('mouse');
    }
};

/** @private Applies all mode effects */
const applyModeEffects = (mode) => {
    injectGlobalStyles(mode);

    applyCursorStyle(
        mode,
        document.body
    );

    applyCursorStyle(
        mode,
        document.documentElement
    );

    getAllInputs().forEach(
        input => {
            applyCaretStyle(mode, input);
        }
    );
};

/** @private Cleans up all effects */
const cleanupEffects = () => {
    removeGlobalStyles();
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';

    getAllInputs().forEach(input => {
        input.style.caretColor = '';
        input.style.removeProperty('caret-color');
    });
};

/** @private Creates throttled mutation handler */
const createMutationHandler = () => throttle((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                applyCursorStyle(
                    currentMode,
                    node
                );

                if (node.querySelectorAll) {
                    const inputs = node.querySelectorAll(
                        'input, textarea, [contenteditable="true"]'
                    );

                    inputs.forEach(
                        input => {
                            applyCaretStyle(
                                currentMode,
                                input
                            )
                        }
                    );
                }

                if (isInputElement(node)) {
                    applyCaretStyle(
                        currentMode,
                        node
                    );
                }
            }
        });
    });
}, 50);

/** @private Initializes cursor controller */
const initializeCursorController = () => {
    const mutationHandler = createMutationHandler();
    const observer = new MutationObserver(mutationHandler);

    const initialize = () => {
        const isDesktop = window.innerWidth >= 1280;

        if (!isDesktop) {
            return;
        }

        applyModeEffects('mouse');

        document.addEventListener(
            'keydown',
            handleKeyboardEvent,
            {
                passive: true
            }
        );

        document.addEventListener(
            'mousemove',
            handleMouseEvent,
            {
                passive: true
            }
        );

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    const cleanup = () => {
        document.removeEventListener(
            'keydown',
            handleKeyboardEvent
        );

        document.removeEventListener(
            'mousemove',
            handleMouseEvent
        );

        observer.disconnect();
        cleanupEffects();
    };

    return { initialize, cleanup };
};

const controller = initializeCursorController();

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded', () => {
            controller.initialize();
        }
    );
} else {
    controller.initialize();
}

/**
 * Cursor controller API
 * @property {Function} getMode         - Returns current mode ('keyboard' or 'mouse')
 * @property {Function} setMode         - Sets cursor mode
 * @property {Function} forceKeyboard   - Forces keyboard mode (hides cursor)
 * @property {Function} forceMouse      - Forces mouse mode (shows cursor)
 * @property {Function} toggle          - Toggles between modes
 * @property {Function} initialize      - Manually initialize
 * @property {Function} cleanup         - Cleanup and remove listeners
 */
export const cursor = {
    ...controller,
    getMode: () => currentMode,
    
    setMode: (mode) => {
        currentMode = mode;
        applyModeEffects(mode);
    },
    
    forceKeyboard: () => {
        currentMode = 'keyboard';
        applyModeEffects('keyboard');
    },
    
    forceMouse: () => {
        currentMode = 'mouse';
        applyModeEffects('mouse');
    },
    
    toggle: () => {
        currentMode = currentMode === 'keyboard' ? 'mouse' : 'keyboard';
        applyModeEffects(currentMode);
    }
};

if (typeof window !== 'undefined') {
    window.cursorController = cursor;
}