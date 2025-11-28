import { Mint } from '../../../../framework/mint.js';
import { fetchJSON } from '../../../../utils/fetch.js';
Mint.include('stylesheet/style-components/context-menu.css');

// Debounce utility function
const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

/**
 * Creates a custom context menu for contenteditable elements
 * @returns {Promise<Object>} ContextMenu component with markups and init method
 */
export const createContextMenu = async () => {
    let config;

    try {
        config = await fetchJSON(
            'renderer/content/contentComponents/contextmenu/contextMenuConfig.json'
        );
    } catch (error) {
        console.error('[ContextMenu] Failed to load configuration:', error);

        throw new Error(
            'Context menu configuration could not be loaded'
        );
    }

    // Find IDs for undo/redo from config for direct element access
    const undoItemId = config.items.find(i => i.command === 'undo')?.id;
    const redoItemId = config.items.find(i => i.command === 'redo')?.id;

    return {
        markups: `
            <div id="${config.menuId}" class="${config.menuClass}" role="menu">
                ${config.items.map(item => {
                    if (item.type === 'separator') {
                        return `<div class="${config.separatorClass}"></div>`;
                    }
                    return `
                        <div id="${item.id}" class="${config.itemClass}" role="menuitem" data-command="${item.command}">
                            ${item.label}
                        </div>
                    `;
                }).join('')}
            </div>
        `,

        init({ pageConfig, noteAPI }) {
            // Validation
            if (!pageConfig?.textareaId) {
                console.error(
                    '[ContextMenu] Invalid pageConfig: missing textareaId'
                );
                return;
            }

            if (!noteAPI) {
                console.error(
                    '[ContextMenu] Invalid noteAPI: API not provided'
                );
                return;
            }

            const CONSTANTS = {
                DEBOUNCE_DELAY: 300,
                MAX_HISTORY_SIZE: 50,
                MENU_OFFSET: 5,
            };

            /**
             * Safe check for a DOM element
             * @param {*} el
             * @returns {boolean}
             */
            const isValidElement = (el) => el && el.nodeType === 1;

            /**
             * Safe DOM getter wrapped in try/catch
             * @param {string} id
             * @returns {HTMLElement|null}
             */
            const safeGetElementById = (id) => {
                try {
                    if (!id) return null;
                    const el = document.getElementById(id);
                    return isValidElement(el) ? el : null;
                } catch (error) {
                    console.error(
                        '[ContextMenu] safeGetElementById failed for',
                        id,
                        error
                    );
                    return null;
                }
            };

            // DOM elements cache
            const elements = {
                textarea: null,
                contextMenu: null,
            };

            // Map cache for menu items (id -> element)
            const menuItemsCache = new Map();

            // State management
            const state = {
                isMenuVisible: false,
                currentSelection: null,
                undoStack: [],                  // Stores previous states of the textarea content
                redoStack: [],                  // Stores states for redoing actions
                isApplyingHistory: false,       // Flag to prevent recording state during undo/redo operations
                isDestroyed: false,             // Prevent actions after destroy
                MAX_HISTORY_SIZE: config.MAX_HISTORY_SIZE || CONSTANTS.MAX_HISTORY_SIZE,
            };

            // Cleanup functions / registered listeners
            const eventListeners = [];

            /**
             * Initialize DOM elements with error handling
             * @returns {boolean} Success status
             */
            /**
             * Initialize and validate required DOM elements.
             * @returns {boolean}
             */
            const initializeElements = () => {
                try {
                    if (!pageConfig?.textareaId) {
                        console.error(
                            '[ContextMenu] initializeElements: missing textareaId in pageConfig'
                        );
                        return false;
                    }

                    elements.textarea = safeGetElementById(pageConfig.textareaId);
                    elements.contextMenu = safeGetElementById(config.menuId);

                    if (!isValidElement(elements.textarea) || !isValidElement(elements.contextMenu)) {
                        console.error(
                            '[ContextMenu] initializeElements: required DOM elements missing'
                        );
                        return false;
                    }

                    // Populate menu items cache
                    for (const item of (config.items || [])) {
                        if (item.id) {
                            const el = safeGetElementById(item.id);
                            if (el) menuItemsCache.set(item.command || item.id, el);
                        }
                    }

                    // Capture initial state of the textarea
                    recordState(elements.textarea.innerHTML);

                    return true;
                } catch (error) {
                    console.error(
                        '[ContextMenu] initializeElements failed', 
                        error
                    );
                    return false;
                }
            };

            /**
             * Add event listener with cleanup tracking
             */
            /**
             * Add event listener and track it for cleanup.
             * @param {EventTarget} element
             * @param {string} event
             * @param {Function} handler
             * @param {Object|boolean} options
             */
            const addEventListener = (element, event, handler, options) => {
                try {
                    if (
                        !isValidElement(element) &&
                        element !== window &&
                        element !== document
                    ) {
                        return;
                    }
                    
                    element.addEventListener(
                        event,
                        handler,
                        options
                    );
                    eventListeners.push({
                        element,
                        event,
                        handler,
                        options
                    });
                } catch (error) {
                    console.warn(
                        '[ContextMenu] addEventListener failed',
                        event,
                        error
                    );
                }
            };

            /**
             * Hide the context menu.
             */
            const hideMenu = () => {
                if (state.isDestroyed) return;
                if (!state.isMenuVisible) return;

                elements.contextMenu.classList.remove(
                    config.visibleClass
                );

                state.isMenuVisible = false;
                
                setTimeout(() => {
                    if (!state.isMenuVisible) elements.contextMenu.style.display = 'none';
                }, 150); // Match transition duration
            };

            /**
             * Position and show the menu for a mouse event.
             * @param {MouseEvent} event
             */
            const showMenu = (event) => {
                try {
                    if (state.isDestroyed) return;
                    event.preventDefault();

                    elements.contextMenu.style.display = 'block';

                    state.isMenuVisible = true;

                    const {
                        clientX: mouseX,
                        clientY: mouseY
                    } = event;
                    
                    const { innerWidth, innerHeight } = window;
                    const menuDimensions = elements.contextMenu.getBoundingClientRect();

                    let top = mouseY;
                    let left = mouseX;

                    // Adjust position to prevent overflow
                    if (mouseY + menuDimensions.height > innerHeight) {
                        top = innerHeight - menuDimensions.height - CONSTANTS.MENU_OFFSET;
                    }
                    if (mouseX + menuDimensions.width > innerWidth) {
                        left = innerWidth - menuDimensions.width - CONSTANTS.MENU_OFFSET;
                    }

                    elements.contextMenu.style.top = `${top}px`;
                    elements.contextMenu.style.left = `${left}px`;

                    requestAnimationFrame(() => {
                        elements.contextMenu.classList.add(config.visibleClass);
                    });
                } catch (error) {
                    console.error('[ContextMenu] showMenu failed', error);
                }
            };

            /**
             * Records the current state of the textarea content into the undo stack.
             * Clears the redo stack on a new action.
             * @param {string} content
             */
            const recordState = (content) => {
                if (state.isDestroyed) return;
                if (state.isApplyingHistory) return;                        // Do not record state if we are applying undo/redo

                if (state.undoStack.length > 0 && state.undoStack[state.undoStack.length - 1] === content) {
                    return;
                }

                state.undoStack.push(content);
                if (state.undoStack.length > state.MAX_HISTORY_SIZE) {
                    state.undoStack.shift();                                // Remove the oldest state if stack exceeds max size
                }
                state.redoStack = [];                                       // Clear redo stack on any new action
                updateMenuState();                                          // Update button states
            };

            /**
             * Performs an undo operation, restoring the previous state.
             */
            const performUndo = () => {
                try {
                    if (state.isDestroyed) return;
                    if (state.undoStack.length <= 1) return;                // Cannot undo if only initial state or empty

                    state.isApplyingHistory = true;
                    const currentState = elements.textarea.innerHTML;
                    state.redoStack.push(currentState);                     // Push current state to redo stack

                    const previousState = state.undoStack.pop();
                    elements.textarea.innerHTML = previousState;
                    state.isApplyingHistory = false;
                    updateMenuState();
                } catch (error) {
                    console.error(
                        '[ContextMenu] performUndo failed',
                        error
                    );
                    state.isApplyingHistory = false;
                }
            };

            /**
             * Performs a redo operation, restoring the next state.
             */
            const performRedo = () => {
                try {
                    if (state.isDestroyed) return;
                    if (state.redoStack.length === 0) return;               // Cannot redo if redo stack is empty

                    state.isApplyingHistory = true;
                    state.undoStack.push(elements.textarea.innerHTML);      // Push current state to undo stack
                    elements.textarea.innerHTML = state.redoStack.pop();    // Apply the next state
                    
                    state.isApplyingHistory = false;
                    updateMenuState();
                } catch (error) {
                    console.error(
                        '[ContextMenu] performRedo failed',
                        error
                    );

                    state.isApplyingHistory = false;
                }
            };

            /**
             * Handle clicks on menu items.
             * @param {MouseEvent} event
             */
            const handleMenuItemClick = async (event) => {
                try {
                    if (state.isDestroyed) return;

                    const target = event.target.closest(`.${config.itemClass}`);
                    if (!target) return;

                    const command = target.dataset.command;
                    const isDisabled = target.dataset.disabled === 'true';

                    if (!command || isDisabled) {
                        hideMenu();
                        return;
                    }

                    if (command === 'paste') {
                        // Use modern clipboard API with fallback
                        try {
                            const text = await navigator.clipboard.readText();

                            document.execCommand(
                                'insertText',
                                false,
                                text
                            );
                        } catch (error) {
                            console.warn(
                                '[ContextMenu] clipboard.readText failed, falling back to execCommand paste',
                                error
                            );
                            
                            try {
                                document.execCommand('paste');
                            } catch (error) {
                                console.warn('[ContextMenu] execCommand paste failed', error);
                            }
                        }
                        recordState(elements.textarea.innerHTML);
                    } else if (command === 'undo') {
                        performUndo();
                    } else if (command === 'redo') {
                        performRedo();
                    } else if (command === 'copy' || command === 'cut') {
                        try {
                            const selection = window.getSelection().toString();

                            if (selection) {
                                await navigator.clipboard.writeText(selection);
                                if (command === 'cut') {
                                    document.execCommand('delete');
                                    recordState(elements.textarea.innerHTML);
                                }
                            }
                        } catch (error) {
                            // Fall back to execCommand
                            try {
                                document.execCommand(command);
                            } catch (error) {
                                console.warn(
                                    '[ContextMenu] execCommand fallback failed',
                                    error
                                );
                            }

                            if (command === 'cut') {
                                recordState(elements.textarea.innerHTML);
                            }
                        }
                    } else {
                        try {
                            document.execCommand(command);
                        } catch (error) {
                            console.warn(
                                '[ContextMenu] execCommand failed',
                                error
                            );
                        }

                        if (command === 'cut') {
                            recordState(elements.textarea.innerHTML);
                        }
                    }
                } catch (error) {
                    console.error(
                        '[ContextMenu] handleMenuItemClick failed', 
                        error
                    );
                } finally {
                    hideMenu();
                }
            };

            /**
             * Update states (enable/disable) for menu items.
             */
            const updateMenuState = () => {
                try {
                    if (state.isDestroyed) return;

                    const selection = window.getSelection();
                    const hasSelection = !!selection && !selection.isCollapsed;

                    const cutItem = menuItemsCache.get('cut');
                    const copyItem = menuItemsCache.get('copy');
                    const pasteItem = menuItemsCache.get('paste');

                    if (cutItem) cutItem.dataset.disabled = !hasSelection;
                    if (copyItem) copyItem.dataset.disabled = !hasSelection;

                    // Check clipboard for paste availability (async)
                    if (pasteItem) {
                        navigator.clipboard.readText().then(text => {
                            pasteItem.dataset.disabled = !text;
                        }).catch(() => {
                            pasteItem.dataset.disabled = false;
                        });
                    }

                    // Update undo/redo from cache
                    const undoEl = menuItemsCache.get('undo') || safeGetElementById(undoItemId);
                    const redoEl = menuItemsCache.get('redo') || safeGetElementById(redoItemId);

                    if (undoEl) undoEl.dataset.disabled = state.undoStack.length <= 1;
                    if (redoEl) redoEl.dataset.disabled = state.redoStack.length === 0;
                } catch (error) {
                    console.warn('[ContextMenu] updateMenuState failed', error);
                }
            };

            /**
             * Initialize event listeners for the menu and textarea.
             */
            const initializeEventListeners = () => {
                if (state.isDestroyed) return;

                // Context menu on textarea
                addEventListener(elements.textarea, 'contextmenu', (e) => {
                    try {
                        updateMenuState();
                        showMenu(e);
                    } catch (error) {
                        console.error(error);
                    }
                });

                // Debounced input listener to record state after user stops typing
                const debouncedRecordState = debounce(() => {
                    try {
                        recordState(elements.textarea.innerHTML);
                    } catch (error) {
                        console.warn(error);
                    }
                }, CONSTANTS.DEBOUNCE_DELAY);

                addEventListener(
                    elements.textarea,
                    'input',
                    debouncedRecordState
                );

                // Handle menu item clicks
                addEventListener(
                    elements.contextMenu,
                    'click',
                    handleMenuItemClick
                );

                // Global events: hide on scroll/resize and escape key
                addEventListener(
                    window,
                    'scroll',

                    debounce(() => {
                        hideMenu();
                    }, 100), { 
                        passive: true 
                    }
                );

                addEventListener(
                    window,
                    'resize',
                    debounce(() => {
                        hideMenu();
                    }, 100)
                );
                
                addEventListener(
                    document, 'keydown', (e) => {
                        if (e.key === 'Escape') hideMenu();
                    }
                );

                // Click outside menu to hide
                addEventListener(document, 'click', (e) => {
                    if (state.isDestroyed) return;
                    
                    const clickedInside = e.target.closest && e.target.closest(
                        `#${config.menuId}`
                    );

                    if (!clickedInside) hideMenu();
                });
            };

            /**
             * Cleanup function for destroying the component
             */
            /**
             * Destroy the component and remove all listeners.
             */
            const destroy = () => {
                if (state.isDestroyed) return;
                state.isDestroyed = true;

                eventListeners.forEach(({ element, event, handler, options }) => {
                    try {
                        element?.removeEventListener(
                            event,
                            handler,
                            options
                        );
                    } catch (err) {
                        /* ignore */
                    }
                });

                eventListeners.length = 0;

                // Clear state stacks
                state.undoStack.length = 0;
                state.redoStack.length = 0;

                // Clear caches and references
                menuItemsCache.clear();
                
                Object.keys(elements).forEach(
                    key => elements[key] = null
                );

                console.info('[ContextMenu] Component destroyed');
            };

            // Initialize component
            if (initializeElements()) {
                initializeEventListeners();
            } else {
                console.error(
                    '[ContextMenu] Initialization failed - component will not be active'
                );
            }

            return { destroy };
        }
    }
}