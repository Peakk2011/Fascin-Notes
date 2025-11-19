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

/**
 * Process markdown patterns in a line
 * @param {KeyboardEvent} e - Event
 * @param {string} beforeCursor - Text before cursor
 * @param {HTMLElement} blockElement - Block element
 * @param {Selection} selection - Window selection
 * @param {boolean} isFirstLine - Is first line flag
 * @returns {boolean} Whether pattern was matched
 */
export const processMarkdownInLine = (e, beforeCursor, blockElement, selection, isFirstLine = false) => {

    // Headers: # ## ### ... more
    const headerMatch = beforeCursor.match(/^(#{1,4})\s*$/);
    if (headerMatch) {
        e.preventDefault();
        const level = headerMatch[1].length;
        const heading = document.createElement(`h${level}`);
        const contentAfterHash = blockElement.textContent.substring(headerMatch[0].length).trim();

        if (contentAfterHash) {
            heading.textContent = contentAfterHash;
        } else {
            heading.innerHTML = '<br>';
        }

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(heading);
        } else {
            blockElement.replaceWith(heading);
        }

        setCursorAtEnd(heading, selection);
        return true;
    }

    // Blockquote: >
    if (beforeCursor.match(/^>\s*$/)) {
        e.preventDefault();
        const quote = document.createElement('blockquote');
        const contentAfterQuote = blockElement.textContent.substring(1).trim();

        if (contentAfterQuote) {
            quote.textContent = contentAfterQuote;
        } else {
            quote.innerHTML = '<br>';
        }

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(quote);
        } else {
            blockElement.replaceWith(quote);
        }

        setCursorAtEnd(quote, selection);
        return true;
    }

    // Unordered List: - or * or +
    if (beforeCursor.match(/^[-*+]\s*$/)) {
        e.preventDefault();
        const ul = document.createElement('ul');
        ul.className = 'unordered-list';
        const li = document.createElement('li');
        const contentAfterMarker = blockElement.textContent.substring(1).trim();

        if (contentAfterMarker) {
            li.textContent = contentAfterMarker;
        } else {
            li.innerHTML = '<br>';
        }

        ul.appendChild(li);

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(ul);
        } else {
            blockElement.replaceWith(ul);
        }

        setCursorAtEnd(li, selection);
        return true;
    }

    // Ordered List: 1. or 1) and "-"
    if (beforeCursor.match(/^\d+[.)]\s*$/)) {
        e.preventDefault();
        const ol = document.createElement('ol');
        ol.className = 'ordered-list';
        const li = document.createElement('li');
        li.style.listStyle = 'decimal';
        const contentAfterNumber = blockElement.textContent.replace(/^\d+[.)]\s*/, '').trim();

        if (contentAfterNumber) {
            li.textContent = contentAfterNumber;
        } else {
            li.innerHTML = '<br>';
        }

        ol.appendChild(li);

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(ol);
        } else {
            blockElement.replaceWith(ol);
        }

        setCursorAtEnd(li, selection);
        return true;
    }

    // Horizontal Rule: --- or *** or ___
    if (beforeCursor.match(/^(---|\*\*\*|___)\s*$/)) {
        e.preventDefault();
        const hr = document.createElement('hr');
        const newP = document.createElement('p');
        newP.innerHTML = '<br>';

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(hr);
            blockElement.appendChild(newP);
        } else {
            blockElement.replaceWith(hr);
            hr.after(newP);
        }

        setCursorAtEnd(newP, selection);
        return true;
    }

    // Code Block: ```
    if (beforeCursor.match(/^```\s*$/)) {
        e.preventDefault();
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const contentAfterTicks = blockElement.textContent.substring(3).trim();

        if (contentAfterTicks) {
            code.textContent = contentAfterTicks;
        } else {
            code.innerHTML = '<br>';
        }

        pre.appendChild(code);

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(pre);
        } else {
            blockElement.replaceWith(pre);
        }

        setCursorAtEnd(code, selection);
        return true;
    }

    // Task List: [ ] or [x]
    if (beforeCursor.match(/^-\s\[([ x])\]\s*$/)) {
        e.preventDefault();
        const isChecked = beforeCursor.includes('[x]');
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';

        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        checkbox.style.marginRight = '8px';

        const contentAfterCheckbox = blockElement.textContent.replace(/^-\s\[([ x])\]\s*/, '').trim();
        const textSpan = document.createElement('span');
        textSpan.textContent = contentAfterCheckbox || '';
        textSpan.contentEditable = 'true';

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        ul.appendChild(li);

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(ul);
        } else {
            blockElement.replaceWith(ul);
        }

        setCursorAtEnd(textSpan, selection);
        return true;
    }

    return false;
};