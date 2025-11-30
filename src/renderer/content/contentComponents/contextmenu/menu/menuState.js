/**
 * Create and manage menu state
 * @param {number} maxHistorySize - Maximum history stack size
 * @returns {Object} State manager object
 */
export const createMenuState = (maxHistorySize = 50) => {
    const state = {
        isMenuVisible: false,
        currentSelection: null,
        undoStack: [],
        redoStack: [],
        isApplyingHistory: false,
        isDestroyed: false,
        MAX_HISTORY_SIZE: maxHistorySize,
    };

    return {
        getState: () => state,

        isVisible: () => state.isMenuVisible,
        setVisible: (visible) => { state.isMenuVisible = visible; },

        isDestroyed: () => state.isDestroyed,
        setDestroyed: (destroyed) => { state.isDestroyed = destroyed; },

        isApplyingHistory: () => state.isApplyingHistory,
        setApplyingHistory: (applying) => { state.isApplyingHistory = applying; },

        getUndoStack: () => state.undoStack,
        getRedoStack: () => state.redoStack,

        clearStacks: () => {
            state.undoStack.length = 0;
            state.redoStack.length = 0;
        }
    };
};

/**
 * Update menu item states (enable/disable)
 * @param {Object} params - Update parameters
 */
export const updateMenuState = ({ menuItemsCache, stateManager, undoItemId, redoItemId, safeGetElementById }) => {
    try {
        if (stateManager.isDestroyed()) return;

        const selection = window.getSelection();
        const hasSelection = !!selection && !selection.isCollapsed;

        // Helper function to set disabled state
        const setDisabledState = (item, disabled) => {
            if (!item) return;
            item.setAttribute('aria-disabled', disabled);
            if (disabled) {
                item.classList.add('disabled');
            } else {
                item.classList.remove('disabled');
            }
        };

        // Update selection-dependent items
        setDisabledState(menuItemsCache.get('cut'), !hasSelection);
        setDisabledState(menuItemsCache.get('copy'), !hasSelection);
        setDisabledState(menuItemsCache.get('searchWithGoogle'), !hasSelection);
        setDisabledState(menuItemsCache.get('translate'), !hasSelection);

        // Paste - async check
        const pasteItem = menuItemsCache.get('paste');
        if (pasteItem) {
            navigator.clipboard.readText()
                .then(text => setDisabledState(pasteItem, !text))
                .catch(() => setDisabledState(pasteItem, false));
        }

        // Undo/Redo
        const state = stateManager.getState();
        const undoEl = menuItemsCache.get('undo') || safeGetElementById(undoItemId);
        const redoEl = menuItemsCache.get('redo') || safeGetElementById(redoItemId);

        setDisabledState(undoEl, state.undoStack.length <= 1);
        setDisabledState(redoEl, state.redoStack.length === 0);

    } catch (error) {
        console.warn('[ContextMenu] updateMenuState failed', error);
    }
};