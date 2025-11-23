import { getBlockElement, getTextBeforeCursor } from './nodeElement.js';
import { handleEnterInBlockquote } from './markdown/handleEnterInBlockquote.js';
import { handleEnterInHeading } from './markdown/handleEnterInHeading.js';
import { processMarkdownInLine } from './markdown/commands.js';

/**
 * Markdown handler - triggers on Space and Enter keys
 * @param {KeyboardEvent} e - Keyboard event
 * @param {HTMLElement} editor - Editor element
 */
export const handleMarkdown = (e, editor) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);
    let node = range.startContainer;

    // Handle Enter key in blockquote
    if (e.key === 'Enter') {
        // Handle Enter in an empty heading to convert it to a paragraph
        if (handleEnterInHeading(e, editor)) {
            return;
        }

        const handled = handleEnterInBlockquote(
            e,
            editor,
            node,
            selection
        );

        if (handled !== undefined) {
            return handled;
        }
    }

    // Work when SPACE is pressed
    if (e.key !== ' ') {
        return;
    }

    const blockElement = getBlockElement(node, editor);

    if (!blockElement || blockElement === editor) {
        if (editor.children.length === 0 ||
            (editor.children.length === 1 && editor.firstElementChild?.tagName === 'BR')) {

            const text = editor.textContent || '';
            const cursorPos = range.startOffset;
            let beforeCursor = '';

            if (node.nodeType === Node.TEXT_NODE) {
                beforeCursor = node.textContent.substring(0, cursorPos);
            } else {
                beforeCursor = text;
            }

            return processMarkdownInLine(
                e,
                beforeCursor,
                editor,
                selection,
                true
            );
        }
        return;
    }

    const text = blockElement.textContent || '';
    const cursorPos = range.startOffset;

    const beforeCursor = getTextBeforeCursor(
        node,
        cursorPos,
        blockElement
    );

    return processMarkdownInLine(
        e,
        beforeCursor,
        blockElement,
        selection,
        false
    );
};