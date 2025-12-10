import { translate } from '../../../../../api/translate/translator.js';

/**
 * Handle paste command
 * @param {Object} params - Action parameters
 */
const handlePaste = async ({ textarea, recordState }) => {
    try {
        const text = await navigator.clipboard.readText();
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        range.deleteContents();

        const pasteSpan = document.createElement('span');
        pasteSpan.classList.add('fade-in-paste');
        pasteSpan.textContent = text;

        range.insertNode(pasteSpan);

        // Move cursor to the end of the pasted text
        range.setStartAfter(pasteSpan);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

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
    recordState(textarea.innerHTML);
};

/**
 * Handle copy or cut command
 * @param {string} command - 'copy' or 'cut'
 * @param {Object} params - Action parameters
 */
const handleCopyOrCut = async ({ command, textarea, recordState }) => {
    try {
        const selection = window.getSelection().toString();

        if (selection) {
            await navigator.clipboard.writeText(selection);
            if (command === 'cut') {
                document.execCommand('delete');
                recordState(textarea.innerHTML);
            }
        }
    } catch (error) {
        // Fall back to execCommand
        try {
            document.execCommand(command);
        } catch (error) {
            console.warn('[ContextMenu] execCommand fallback failed', error);
        }

        if (command === 'cut') {
            recordState(textarea.innerHTML);
        }
    }
};

/**
 * Handle translate command
 * @param {Object} params - Action parameters
 */
const handleTranslate = async ({ target, hideMenu }) => {
    hideMenu();

    const targetMethod = target.dataset.value;
    const translateFunc = translate[targetMethod];

    if (!targetMethod) return;

    if (typeof translateFunc !== 'function') {
        console.error(`[ContextMenu] Invalid translation method: ${targetMethod}`);
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const feedbackNode = document.createTextNode('Translating..');
    range.insertNode(feedbackNode);

    try {
        const translatedText = await translateFunc(selectedText);
        feedbackNode.textContent = translatedText;

        // Move cursor to the end of the translated text
        range.setStartAfter(feedbackNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (error) {
        console.error(
            `[ContextMenu] Translation failed for ${targetMethod}`,
            error
        );
        feedbackNode.textContent = selectedText;
    }
};

/**
 * Handle search with Google command
 * @param {Object} params - Action parameters
 */
const handleSearchWithGoogle = ({ noteAPI }) => {
    const selection = window.getSelection().toString().trim();

    if (!selection) {
        console.warn('[ContextMenu] No text selected for search');
        return;
    }

    const searchURL = `https://www.google.com/search?q=${encodeURIComponent(selection)}`;

    if (noteAPI && typeof noteAPI.openExternal === 'function') {
        noteAPI.openExternal(searchURL);
    } else {
        console.warn('[ContextMenu] noteAPI.openExternal not available, using window.open');
        window.open(searchURL, '_blank');
    }
};

/**
 * Main menu item click handler
 * @param {Object} params - Handler parameters
 */
export const handleMenuItemClick = async (params) => {
    const {
        event,
        config,
        stateManager,
        textarea,
        noteAPI,
        performUndo,
        performRedo,
        recordState,
        hideMenu
    } = params;

    try {
        if (stateManager.isDestroyed()) return;

        const target = event.target.closest(`.${config.itemClass}`);
        if (!target) return;

        const command = target.dataset.command;
        const isDisabled = target.getAttribute('aria-disabled') === 'true';

        if (!command || isDisabled) {
            hideMenu();
            return;
        }

        // Route to appropriate handler
        switch (command) {
            case 'paste':
                await handlePaste({ textarea, recordState });
                break;

            case 'undo':
                performUndo();
                break;

            case 'redo':
                performRedo();
                break;

            case 'copy':
            case 'cut':
                await handleCopyOrCut({ command, textarea, recordState });
                break;

            case 'translate':
                await handleTranslate({ target, hideMenu });
                break;

            case 'searchWithGoogle':
                handleSearchWithGoogle({ noteAPI });
                break;

            case 'selectAll':
                document.execCommand('selectAll');
                break;

            default:
                try {
                    document.execCommand(command);
                } catch (error) {
                    console.warn('[ContextMenu] execCommand failed', error);
                }
                if (command === 'cut') {
                    recordState(textarea.innerHTML);
                }
                break;
        }
    } catch (error) {
        console.error('[ContextMenu] handleMenuItemClick failed', error);
    } finally {
        // Don't hide menu if translate submenu was clicked
        if (event.target.closest('[data-command="translate"]') === null) {
            hideMenu();
        }
    }
};