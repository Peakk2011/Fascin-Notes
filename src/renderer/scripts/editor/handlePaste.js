/**
 * Handle paste event - keep only bold and italic formatting
 * @param {ClipboardEvent} e - Paste event
 * @param {HTMLElement} editor - Editor element
 */

export const handlePaste = (e, editor) => {
    e.preventDefault();

    const clipboardData = e.clipboardData || window.clipboardData;
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    let content;

    if (html) {
        // Parse HTML and keep only bold and italic
        const temp = document.createElement('div');
        temp.innerHTML = html;
        content = extractBasicFormatting(temp);
    } else {
        // Fallback to plain text
        content = text;
    }

    // Insert at cursor
    const selection = window.getSelection();

    if (!selection.rangeCount) {
        return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    // Insert the cleaned HTML
    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = content;

    const pastedSpan = document.createElement('span');
    pastedSpan.style.opacity = '0';
    pastedSpan.classList.add('pasted-content');

    while (wrapper.firstChild) {
        pastedSpan.appendChild(wrapper.firstChild);
    }
    
    fragment.appendChild(pastedSpan);
    range.insertNode(fragment);

    setTimeout(() => {
        pastedSpan.style.opacity = '1'; 
    }, 20);

    // Move cursor to end
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event
    editor.dispatchEvent(new Event(
        'input',
        {
            bubbles: true
        }
    ));
};

/**
 * Extract only bold and italic tags, strip everything else
 * @param {HTMLElement} element - Element to process
 * @returns {string} - Cleaned HTML string
 */

const extractBasicFormatting = (element) => {
    let result = '';

    const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = node.tagName.toLowerCase();
            let childContent = '';

            // Process all children
            for (const child of node.childNodes) {
                childContent += processNode(child);
            }

            // Keep only bold and italic tags
            if (tag === 'b' || tag === 'strong') {
                return `<strong>${childContent}</strong>`;
            } else if (tag === 'i' || tag === 'em') {
                return `<em>${childContent}</em>`;
            } else if (tag === 'br') {
                return '<br>';
            } else if (tag === 'p' || tag === 'div') {
                // Convert block elements to line breaks
                return childContent + '<br>';
            } else {
                // Strip all other tags
                return childContent;
            }
        }

        return '';
    };

    for (const child of element.childNodes) {
        result += processNode(child);
    }

    // Clean up multiple <br> tags
    result = result.replace(
        /(<br>\s*){3,}/g, '<br><br>'
    );
    
    return result.trim();
};