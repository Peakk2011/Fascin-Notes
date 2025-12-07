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
 * Handle Enter key in code blocks to return to normal paragraph
 * @param {KeyboardEvent} e - Event
 * @param {HTMLElement} currentElement - Current element
 * @param {Selection} selection - Window selection
 * @returns {boolean} Whether handled
 */
export const handleCodeBlockExit = (e, currentElement, selection) => {
    // Check if we're in a code element inside pre
    const codeElement = currentElement.closest('code');
    const preElement = currentElement.closest('pre');

    if (codeElement && preElement) {
        e.preventDefault();

        const newP = document.createElement('p');
        newP.innerHTML = '<br>';
        preElement.after(newP);

        // Move cursor to new paragraph
        setCursorAtEnd(newP, selection);
        return true;
    }

    return false;
};

/**
 * Process markdown patterns in a line (Simplified + Slash Commands)
 * @param {KeyboardEvent} e - Event
 * @param {string} beforeCursor - Text before cursor
 * @param {HTMLElement} blockElement - Block element
 * @param {Selection} selection - Window selection
 * @param {boolean} isFirstLine - Is first line flag
 * @returns {boolean} Whether pattern was matched
 */
export const processMarkdownInLine = (e, beforeCursor, blockElement, selection, isFirstLine = false) => {
    // /h1, /h2, /h3, /h4 - Headers
    const slashHeaderMatch = beforeCursor.match(/^\/(h[1-4])\s*$/);
    if (slashHeaderMatch) {
        e.preventDefault();

        const level = slashHeaderMatch[1].charAt(1);
        const heading = document.createElement(`h${level}`);
        const contentAfter = blockElement.textContent.replace(/^\/h[1-4]\s*/, '').trim();

        if (contentAfter) {
            heading.textContent = contentAfter;
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

    // /quote - Blockquote
    if (beforeCursor.match(/^\/quote\s*$/)) {
        e.preventDefault();
        const quote = document.createElement('blockquote');
        const contentAfter = blockElement.textContent.replace(/^\/quote\s*/, '').trim();

        if (contentAfter) {
            quote.textContent = contentAfter;
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

    // /code - Code Block
    if (beforeCursor.match(/^\/code\s*$/)) {
        e.preventDefault();
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        const contentAfter = blockElement.textContent.replace(/^\/code\s*/, '').trim();

        if (contentAfter) {
            code.textContent = contentAfter;
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

    // /check - Task List
    if (beforeCursor.match(/^\/check\s*$/)) {
        e.preventDefault();
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.paddingLeft = '0';

        const li = document.createElement('li');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = false;
        checkbox.style.marginRight = '8px';

        const contentAfter = blockElement.textContent.replace(/^\/check\s*/, '').trim();
        const textSpan = document.createElement('span');
        textSpan.textContent = contentAfter || '';
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

    // /hr or /line - Horizontal Rule
    if (beforeCursor.match(/^\/(hr|line)\s*$/)) {
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

    // /table - Create a 2x2 Table
    if (beforeCursor.match(/^\/table\s*$/)) {
        e.preventDefault();

        // Create table structure
        const table = document.createElement('table');
        table.className = 'fascinate-notes-table'; 
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const trHead = document.createElement('tr');
        const trBody = document.createElement('tr');

        // Create header cells
        const th1 = document.createElement('th');
        th1.innerHTML = '<br>';
        const th2 = document.createElement('th');
        th2.innerHTML = '<br>';

        // Create body cells
        const td1 = document.createElement('td');
        td1.innerHTML = '<br>';
        const td2 = document.createElement('td');
        td2.innerHTML = '<br>';

        // Assemble table
        trHead.appendChild(th1);
        trHead.appendChild(th2);
        thead.appendChild(trHead);

        trBody.appendChild(td1);
        trBody.appendChild(td2);
        tbody.appendChild(trBody);

        table.appendChild(thead);
        table.appendChild(tbody);

        if (isFirstLine) {
            blockElement.innerHTML = '';
            blockElement.appendChild(table);
        } else {
            blockElement.replaceWith(table);
        }

        setCursorAtEnd(th1, selection);
        return true;
    }

    // Headers: # ## ### ####
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

    // Unordered List
    if (beforeCursor.match(/^-\s*$/)) {
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

    // Ordered List: 1. 2. 3.
    if (beforeCursor.match(/^\d+\.\s*$/)) {
        e.preventDefault();
        const ol = document.createElement('ol');
        ol.className = 'ordered-list';
        const li = document.createElement('li');
        li.style.listStyle = 'decimal';
        const contentAfterNumber = blockElement.textContent.replace(/^\d+\.\s*/, '').trim();

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

    // Thing happen too often or are too complex to implement here:
    // - Blockquote with > (easy to trigger accidentally)
    // - Horizontal Rule with --- *** ___ (confusing)
    // - Code Block with ``` (too hard to type)
    // - Task List with - [ ] (too complex)

    return false;
};