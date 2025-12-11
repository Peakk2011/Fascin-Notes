/**
 * Handle paste event, sanitizing and preserving rich formatting.
 * This function intercepts paste events to ensure only safe HTML formatting
 * is preserved while stripping potentially dangerous or unwanted elements.
 * 
 * @param {ClipboardEvent} e        - The paste event triggered by user action
 * @param {HTMLElement} editor      - The contenteditable editor element receiving the paste
 * @returns {void}
 * 
 * @example
 * // Attach to editor element
 * editor.addEventListener('paste', (e) => handlePaste(e, editor));
 * 
 * @throws {Error} Logs error to console if paste operation fails
 * 
 * @features
 * - Preserves text formatting (bold, italic, underline, strikethrough)
 * - Maintains block-level elements (headings, lists, blockquotes, code blocks)
 * - Sanitizes dangerous HTML and scripts
 * - Smooth fade-in animation for pasted content
 * - Maintains cursor position after paste
 */
export const handlePaste = (e, editor) => {
    try {
        e.preventDefault();

        // Extract clipboard data
        const clipboardData = e.clipboardData || window.clipboardData;

        if (!clipboardData) {
            console.warn('Clipboard data not available');
            return;
        }

        const html = clipboardData.getData('text/html');
        const text = clipboardData.getData('text/plain');

        /** @type {string} */
        let content;

        if (html) {
            try {
                // Parse HTML and keep a safe subset of formatting
                const temp = document.createElement('div');
                temp.innerHTML = html;
                content = formatPastedHTML(temp);
            } catch (parseError) {
                console.error('HTML parsing failed, falling back to plain text:', parseError);
                // Fallback to plain text if HTML parsing fails
                content = text.split('\n').map(
                    line => `<div>${escapeHTML(line) || '<br>'}</div>`)
                .join('');
            }
        } else {
            // Fallback to plain text
            content = text.split('\n').map(
                line => `<div>${escapeHTML(line) || '<br>'}</div>`
            ).join('');
        }

        // Insert at cursor position
        const selection = window.getSelection();

        if (!selection || !selection.rangeCount) {
            console.warn('No text selection available');
            return;
        }

        const range = selection.getRangeAt(0);

        try {
            range.deleteContents();
        } catch (deleteError) {
            console.error('Failed to delete selected content:', deleteError);
            return;
        }

        // Create and insert the cleaned HTML
        const fragment = document.createDocumentFragment();
        const wrapper = document.createElement('div');
        wrapper.innerHTML = content;

        // Use a temporary span for a fade-in effect
        const pastedSpan = document.createElement('span');
        pastedSpan.style.opacity = '0';
        pastedSpan.style.transition = 'opacity 0.2s ease-in';
        pastedSpan.classList.add('pasted-content');

        while (wrapper.firstChild) {
            pastedSpan.appendChild(wrapper.firstChild);
        }

        fragment.appendChild(pastedSpan);

        try {
            range.insertNode(fragment);
        } catch (insertError) {
            console.error('Failed to insert pasted content:', insertError);
            return;
        }

        // Animate the pasted content with smooth fade-in
        requestAnimationFrame(() => {
            setTimeout(() => {
                pastedSpan.style.opacity = '1';
            }, 20);
        });

        // Move cursor to the end of pasted content
        try {
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (cursorError) {
            console.error('Failed to update cursor position:', cursorError);
        }

        // Trigger input event to notify other components of the change
        try {
            editor.dispatchEvent(new Event('input', { bubbles: true }));
        } catch (eventError) {
            console.error('Failed to dispatch input event:', eventError);
        }

    } catch (error) {
        console.error('Paste operation failed:', error);
        // Optionally show user-friendly error message
        console.warn('Could not paste content. Please try again.');
    }
};

/**
 * Sanitize and format pasted HTML content by keeping a safe subset of tags.
 * 
 * This function recursively processes the DOM tree, filtering out dangerous
 * elements while preserving safe formatting and structure.
 * 
 * @param {HTMLElement} element - The element containing the pasted HTML to be sanitized
 * @returns {string} Cleaned and formatted HTML string with only allowed tags
 * 
 * @throws {Error} Throws if element is not a valid HTMLElement
 * 
 * @whitelist Allowed tags:
 * - Text formatting: strong, em, u, s
 * - Block elements: h1-h6, p, div, blockquote, pre, code
 * - Lists: ul, ol, li
 * - Line breaks: br
 * 
 * @security
 * - Strips all script tags and event handlers
 * - Removes style attributes
 * - Sanitizes text content
 * - Replaces non-breaking spaces with regular spaces
 * 
 * @example
 * const temp = document.createElement('div');
 * temp.innerHTML = '<b>Bold</b> and <script>alert("XSS")</script>';
 * const safe = formatPastedHTML(temp);
 * // Returns: '<strong>Bold</strong> and '
 */
const formatPastedHTML = (element) => {
    if (!(element instanceof HTMLElement)) {
        throw new Error('formatPastedHTML requires a valid HTMLElement');
    }

    let result = '';

    /**
     * Recursively process DOM nodes to extract safe content
     * 
     * @param {Node} node - DOM node to process
     * @returns {string} Processed content as HTML string
     * 
     * @private
     */
    const processNode = (node) => {
        try {
            // Handle text nodes
            if (node.nodeType === Node.TEXT_NODE) {
                // Replace non-breaking spaces with regular spaces and escape HTML
                const text = node.textContent || '';
                return escapeHTML(text.replace(/\u00A0/g, ' '));
            }

            // Handle element nodes
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toLowerCase();
                let childContent = '';

                // Recursively process all child nodes
                for (const child of node.childNodes) {
                    try {
                        childContent += processNode(child);
                    } catch (childError) {
                        console.warn('Failed to process child node:', childError);
                        // Continue processing other children
                    }
                }

                // Whitelist of allowed tags and their handling
                // Bold formatting
                if (['b', 'strong'].includes(tag)) {
                    return childContent ? `<strong>${childContent}</strong>` : '';
                }

                // Italic formatting
                else if (['i', 'em'].includes(tag)) {
                    return childContent ? `<em>${childContent}</em>` : '';
                }

                // Underline formatting
                else if (['u'].includes(tag)) {
                    return childContent ? `<u>${childContent}</u>` : '';
                }

                // Strikethrough formatting
                else if (['s', 'strike', 'del'].includes(tag)) {
                    return childContent ? `<s>${childContent}</s>` : '';
                }

                // Block-level elements: headings, paragraphs, lists, quotes, code
                else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code'].includes(tag)) {
                    // Avoid creating empty block elements
                    if (!childContent.trim()) return '';
                    return `<${tag}>${childContent}</${tag}>`;
                }

                // Line breaks
                else if (tag === 'br') {
                    return '<br>';
                }

                // Preserve divs to maintain structure (often represent paragraphs or lines)
                else if (tag === 'div') {
                    if (node.childNodes.length > 0) {
                        return childContent ? `<div>${childContent}</div>` : '';
                    }
                    // Empty div treated as line break
                    return '<br>';
                }

                // Strip all other tags but keep their content
                else {
                    return childContent;
                }
            }

            return '';

        } catch (nodeError) {
            console.error('Error processing node:', nodeError);
            return '';
        }
    };

    try {
        // Process all child nodes of the element
        for (const child of element.childNodes) {
            try {
                result += processNode(child);
            } catch (childError) {
                console.warn('Failed to process top-level child:', childError);
                // Continue processing other children
            }
        }

        // Final cleanup of the resulting HTML string
        result = result.replace(/(<br>\s*){3,}/g, '<br><br>');      // Collapse multiple <br> tags (max 2)
        result = result.replace(/^(<br>\s*)+|(<br>\s*)+$/g, '');    // Remove leading/trailing <br>s
        result = result.replace(/<(strong|em|u|s)>\s*<\/\1>/g, ''); // Remove empty formatting tags

        return result.trim();

    } catch (error) {
        console.error('formatPastedHTML failed:', error);
        // Return empty string as safe fallback
        return '';
    }
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * 
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe text with special characters escaped
 * 
 * @example
 * escapeHTML('<script>alert("XSS")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * 
 * @security Critical function for preventing XSS vulnerabilities
 */
const escapeHTML = (text) => {
    if (typeof text !== 'string') return '';

    const escapeMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char);
};