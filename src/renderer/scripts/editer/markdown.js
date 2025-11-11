import { getBlockElement, getTextBeforeCursor } from './nodeElement.js';

/**
 * Markdown handler - triggers on Space key
 * @param {KeyboardEvent} e - Keyboard event
 * @param {HTMLElement} editor - Editor element
 */

export const handleMarkdown = (e, editor) => {
    // Work when SPACE is pressed
    if (e.key !== ' ') {
        return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);
    let node = range.startContainer;

    console.log('Markdown trigger', {
        nodeType: node.nodeType,
        nodeName: node.nodeName,
        textContent: node.textContent,
        cursorPos: range.startOffset
    });

    const blockElement = getBlockElement(node, editor);

    console.log('Block element', {
        found: blockElement !== null,
        tagName: blockElement?.tagName,
        textContent: blockElement?.textContent,
        innerHTML: blockElement?.innerHTML
    });

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

            return processMarkdownInLine(e, beforeCursor, editor, selection, true);
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

    console.log('Text analysis', {
        fullText: text,
        beforeCursor: beforeCursor,
        cursorPos: cursorPos
    });

    return processMarkdownInLine(
        e,
        beforeCursor,
        blockElement,
        selection,
        false
    );
};

/**
 * Process markdown patterns in a line
 * @param {KeyboardEvent} e - Event
 * @param {string} beforeCursor - Text before cursor
 * @param {HTMLElement} blockElement - Block element
 * @param {Selection} selection - Window selection
 * @param {boolean} isFirstLine - Is first line flag
 * @returns {boolean} Whether pattern was matched
 */

const processMarkdownInLine = (e, beforeCursor, blockElement, selection, isFirstLine = false) => {
    // Markdown Headers: `# ## ### ####`
    const headerMatch = beforeCursor.match(/^(#{1,4})\s*$/);

    if (headerMatch) {
        console.log('Header matched', {
            level: headerMatch[1].length,
            isFirstLine: isFirstLine,
            beforeReplace: {
                tagName: blockElement.tagName,
                innerHTML: blockElement.innerHTML,
                textContent: blockElement.textContent
            }
        });

        e.preventDefault();
        const level = headerMatch[1].length;
        const heading = document.createElement(`h${level}`);

        const contentAfterHash = blockElement.textContent.substring(headerMatch[0].length).trim();

        if (contentAfterHash) {
            heading.textContent = contentAfterHash;
        } else {
            heading.innerHTML = '<br>';
        }

        console.log('Created heading', {
            tagName: heading.tagName,
            innerHTML: heading.innerHTML
        });

        // Replace Elements
        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(heading);
        } else {
            blockElement.replaceWith(heading);
        }

        // Set cursor to last heading
        setCursorAtEnd(heading, selection);

        console.log('Header applied successfully');
        return true;
    }

    // Blockquote: >
    if (beforeCursor.match(/^>\s*$/)) {
        console.log('Blockquote matched', {
            isFirstLine: isFirstLine,
            beforeReplace: {
                tagName: blockElement.tagName,
                innerHTML: blockElement.innerHTML,
                textContent: blockElement.textContent
            }
        });

        e.preventDefault();

        const quote = document.createElement('blockquote');
        const contentAfterQuote = blockElement.textContent.substring(1).trim();
        if (contentAfterQuote) {
            quote.textContent = contentAfterQuote;
        } else {
            quote.innerHTML = '<br>';
        }

        console.log('Created blockquote', {
            tagName: quote.tagName,
            innerHTML: quote.innerHTML
        });

        // แทนที่ element
        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(quote);
        } else {
            blockElement.replaceWith(quote);
        }

        // Set cursor
        setCursorAtEnd(quote, selection);

        console.log('Blockquote applied successfully');
        return true;
    }

    return false;
};

/**
 * Set cursor at end of element
 * @param {HTMLElement} element - Target element
 * @param {Selection} selection - Window selection
 */

const setCursorAtEnd = (element, selection) => {
    const newRange = document.createRange();

    if (element.firstChild) {
        if (element.firstChild.nodeType === Node.TEXT_NODE) {
            newRange.setStart(
                element.firstChild,
                element.firstChild.length
            );
        } else {
            newRange.setStart(element, 0);
        }
    } else {
        newRange.setStart(element, 0);
    }

    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
};