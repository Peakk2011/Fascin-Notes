/**
 * Handles keyboard shortcuts for the editor.
 * @param {KeyboardEvent} e                         - The keyboard event.
 * @param {HTMLElement} editor                      - The editor element.
 * @param {Object} callbacks                        - Optional callback functions for custom actions
 * @param {Function} callbacks.onSave               - Callback when save is triggered
 * @param {Function} callbacks.onSearch             - Callback when search is triggered
 * @param {Function} callbacks.onReplace            - Callback when replace is triggered
 * @param {Function} callbacks.onUndo               - Callback when undo is triggered
 * @param {Function} callbacks.onRedo               - Callback when redo is triggered
 */
export const handleKeydown = (e, editor, callbacks = {}) => {
    // Validate inputs
    if (!e || !(e instanceof KeyboardEvent)) {
        console.warn('[Keymap] Invalid event object');
        return;
    }

    if (!editor || !editor.isContentEditable) {
        console.warn('[Keymap] Invalid or non-editable editor element');
        return;
    }

    // Check for Ctrl on Windows/Linux or Cmd on macOS
    const isModKey = e.ctrlKey || e.metaKey;

    try {
        // Tab / Shift+Tab for indentation
        if (e.key === 'Tab') {
            e.preventDefault();

            const selection = window.getSelection();

            // Validate selection exists
            if (!selection || !selection.rangeCount) {
                console.warn('[Keymap] No valid selection for indentation');
                return;
            }

            try {
                if (e.shiftKey) {
                    // Decrease indentation
                    const success = document.execCommand('outdent');
                    if (!success) {
                        console.warn('[Keymap] Outdent command not supported or failed');
                    }
                } else {
                    // Insert 4 spaces for tab
                    const range = selection.getRangeAt(0);

                    // Use non-breaking spaces for better consistency
                    const indent = document.createTextNode('\u00A0\u00A0\u00A0\u00A0');

                    // Delete any selected content first
                    range.deleteContents();
                    range.insertNode(indent);

                    // Move cursor after the inserted spaces
                    range.setStartAfter(indent);
                    range.setEndAfter(indent);
                    range.collapse(false);

                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } catch (error) {
                console.error('[Keymap] Indent/Outdent operation failed:', {
                    operation: e.shiftKey ? 'outdent' : 'indent',
                    error: error.message
                });

                // Attempt to restore selection state
                try {
                    const range = selection.getRangeAt(0);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (restoreError) {
                    console.error('[Keymap] Failed to restore selection:', restoreError.message);
                }
            }
            return;
        }

        if (isModKey) {
            // 2. Clipboard operations
            // Use e.code to support all keyboard layouts

            if (e.code === 'KeyC' || e.code === 'KeyX' || e.code === 'KeyV') {
                return;
            }

            // 3. Undo/Redo
            if (e.code === 'KeyZ') {
                e.preventDefault();

                try {
                    if (e.shiftKey) {
                        // Ctrl/Cmd + Shift + Z (Redo)
                        if (callbacks.onRedo && typeof callbacks.onRedo === 'function') {
                            callbacks.onRedo();
                        } else {
                            document.execCommand('redo');
                        }
                    } else {
                        // Ctrl/Cmd + Z (Undo)
                        if (callbacks.onUndo && typeof callbacks.onUndo === 'function') {
                            callbacks.onUndo();
                        } else {
                            document.execCommand('undo');
                        }
                    }
                } catch (error) {
                    console.error(
                        '[Keymap] Undo/Redo failed:',
                        error
                    );
                }
                return;
            }

            if (e.code === 'KeyY') {
                // Ctrl/Cmd + Y (Redo) - Windows standard
                e.preventDefault();

                try {
                    if (callbacks.onRedo && typeof callbacks.onRedo === 'function') {
                        callbacks.onRedo();
                    } else {
                        document.execCommand('redo');
                    }
                } catch (error) {
                    console.error(
                        '[Keymap] Redo failed:',
                        error
                    );
                }
                return;
            }

            // 4. Select All
            if (e.code === 'KeyA') {
                e.preventDefault();

                try {
                    // Use Range API for more reliable selection
                    const range = document.createRange();
                    range.selectNodeContents(editor);

                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                } catch (error) {
                    console.error(
                        '[Keymap] Select All failed:',
                        error
                    );

                    // Fallback to execCommand
                    document.execCommand('selectAll');
                }
                return;
            }

            // 5. Search
            if (e.code === 'KeyF') {
                e.preventDefault();

                if (callbacks.onSearch && typeof callbacks.onSearch === 'function') {
                    try {
                        callbacks.onSearch();
                    } catch (error) {
                        console.error(
                            '[Keymap] Search callback failed:',
                            error
                        );
                    }
                } else {
                    console.warn('[Keymap] Search callback not provided');
                }
                return;
            }

            // 6. Replace
            if (e.code === 'KeyH') {
                e.preventDefault();

                if (callbacks.onReplace && typeof callbacks.onReplace === 'function') {
                    try {
                        callbacks.onReplace();
                    } catch (error) {
                        console.error(
                            '[Keymap] Replace callback failed:',
                            error
                        );
                    }
                } else {
                    console.warn('[Keymap] Replace callback not provided');
                }
                return;
            }

            // 7. Save
            if (e.code === 'KeyS') {
                e.preventDefault();

                if (callbacks.onSave && typeof callbacks.onSave === 'function') {
                    try {
                        callbacks.onSave(editor.innerHTML);
                    } catch (error) {
                        console.error(
                            '[Keymap] Save callback failed:',
                            error
                        );
                    }
                } else {
                    console.warn('[Keymap] Save callback not provided');
                }
                return;
            }

            // 8. Insert Line
            if (e.key === 'Enter') {
                e.preventDefault();

                try {
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;

                    const range = selection.getRangeAt(0);

                    if (e.shiftKey) {
                        // Ctrl/Cmd + Shift + Enter (Insert line above)
                        const br = document.createElement('br');
                        range.insertNode(br);
                        range.setStartAfter(br);
                        range.collapse(true);

                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        // Ctrl/Cmd + Enter (Insert line below)
                        const currentNode = range.startContainer;

                        const parent = currentNode.nodeType === Node.TEXT_NODE
                            ? currentNode.parentNode
                            : currentNode;

                        // Find the end of the current line/paragraph
                        let node = parent;
                        while (node && node !== editor && node.nextSibling) {
                            node = node.nextSibling;
                        }

                        const br = document.createElement('br');
                        if (node && node.parentNode) {
                            node.parentNode.insertBefore(br, node.nextSibling);
                            range.setStartAfter(br);
                            range.collapse(true);

                            selection.removeAllRanges();
                            selection.addRange(range);
                        } else {
                            // Fallback
                            document.execCommand('insertParagraph');
                        }
                    }
                } catch (error) {
                    console.error(
                        '[Keymap] Insert line failed:',
                        error
                    );
                }
                return;
            }

            // 9. Delete Line
            if (e.code === 'KeyK' && e.shiftKey) {
                e.preventDefault();

                try {
                    const selection = window.getSelection();
                    if (!selection.rangeCount) return;

                    const range = selection.getRangeAt(0);
                    let node = range.startContainer;

                    // Find the containing block element
                    while (node && node !== editor && node.nodeType !== Node.ELEMENT_NODE) {
                        node = node.parentNode;
                    }

                    if (node && node !== editor) {
                        let startNode = node;
                        let endNode = node;

                        // Expand selection to include entire line
                        const lineRange = document.createRange();
                        lineRange.selectNodeContents(startNode);
                        lineRange.deleteContents();

                        if (!startNode.textContent.trim() && startNode.parentNode) {
                            startNode.parentNode.removeChild(startNode);
                        }
                    }
                } catch (error) {
                    console.error('[Keymap] Delete line failed:', error);
                    // Fallback to simple delete
                    document.execCommand('delete');
                }
                return;
            }

            // 10. Bold (Ctrl/Cmd + B)
            if (e.code === 'KeyB') {
                e.preventDefault();
                try {
                    document.execCommand('bold');
                } catch (error) {
                    console.error('[Keymap] Bold failed:', error);
                }
                return;
            }

            // 11. Italic (Ctrl/Cmd + I)
            if (e.code === 'KeyI') {
                e.preventDefault();
                try {
                    document.execCommand('italic');
                } catch (error) {
                    console.error('[Keymap] Italic failed:', error);
                }
                return;
            }

            // 12. Underline (Ctrl/Cmd + U)
            if (e.code === 'KeyU') {
                e.preventDefault();
                try {
                    document.execCommand('underline');
                } catch (error) {
                    console.error('[Keymap] Underline failed:', error);
                }
                return;
            }
        }
    } catch (error) {
        console.error('[Keymap] Unexpected error:', error);
    }
};

/**
 * Initialize keyboard shortcuts for an editor
 * @param {HTMLElement} editor              - The editor element
 * @param {Object} callbacks                - Callback functions
 * @returns {Function} Cleanup function to remove event listener
 */
export const keyMap = (editor, callbacks = {}) => {
    if (!editor || !editor.isContentEditable) {
        console.error(
            '[Keymap] Cannot initialize: invalid editor'
        );
        return () => { };
    }

    const handler = (e) => handleKeydown(
        e,
        editor,
        callbacks
    );

    editor.addEventListener(
        'keydown',
        handler
    );

    // Cleanup function
    return () => {
        editor.removeEventListener(
            'keydown',
            handler
        );
    };
};