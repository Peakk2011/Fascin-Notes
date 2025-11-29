/**
 * Record the current state of the textarea content into the undo stack
 * @param {Object} params - Record parameters
 */
export const recordState = ({ content, stateManager, updateMenuState }) => {
    if (stateManager.isDestroyed()) return;
    if (stateManager.isApplyingHistory()) return;

    const state = stateManager.getState();
    const undoStack = stateManager.getUndoStack();

    // Don't record if content is the same as last state
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === content) {
        return;
    }

    undoStack.push(content);

    // Remove oldest state if stack exceeds max size
    if (undoStack.length > state.MAX_HISTORY_SIZE) {
        undoStack.shift();
    }

    // Clear redo stack on any new action
    const redoStack = stateManager.getRedoStack();
    redoStack.length = 0;

    // Update button states
    if (updateMenuState) {
        updateMenuState();
    }
};

/**
 * Perform undo operation, restoring the previous state
 * @param {Object} params - Undo parameters
 */
export const performUndo = ({ textarea, stateManager, updateMenuState }) => {
    try {
        if (stateManager.isDestroyed()) return;

        const undoStack = stateManager.getUndoStack();
        if (undoStack.length <= 1) return; // Cannot undo if only initial state or empty

        stateManager.setApplyingHistory(true);

        const currentState = textarea.innerHTML;
        const redoStack = stateManager.getRedoStack();
        redoStack.push(currentState); // Push current state to redo stack

        const previousState = undoStack.pop();
        textarea.innerHTML = previousState;

        stateManager.setApplyingHistory(false);

        if (updateMenuState) {
            updateMenuState();
        }
    } catch (error) {
        console.error('[ContextMenu] performUndo failed', error);
        stateManager.setApplyingHistory(false);
    }
};

/**
 * Perform redo operation, restoring the next state
 * @param {Object} params - Redo parameters
 */
export const performRedo = ({ textarea, stateManager, updateMenuState }) => {
    try {
        if (stateManager.isDestroyed()) return;

        const redoStack = stateManager.getRedoStack();
        if (redoStack.length === 0) return; // Cannot redo if redo stack is empty

        stateManager.setApplyingHistory(true);

        const undoStack = stateManager.getUndoStack();
        undoStack.push(textarea.innerHTML); // Push current state to undo stack
        textarea.innerHTML = redoStack.pop(); // Apply the next state

        stateManager.setApplyingHistory(false);

        if (updateMenuState) {
            updateMenuState();
        }
    } catch (error) {
        console.error('[ContextMenu] performRedo failed', error);
        stateManager.setApplyingHistory(false);
    }
};