/**
 * This file working with DOM nodes and block elements
 * Get effective block element for Markdown processing
 * @param {Node} node - Starting node
 * @param {HTMLElement} editor - Editor element
 * @returns {HTMLElement|null} Block element
 */

export const getBlockElement = (node, editor) => {
    let blockElement = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    // (empty div with br)
    if (
        blockElement === editor && blockElement.children.length === 1 && 
        blockElement.firstElementChild?.tagName === 'BR') {
        return blockElement;
    }

    while (blockElement &&
        blockElement !== editor &&
        ![
            'DIV', 'P',
            'H1', 'H2',
            'H3', 'H4',
            'H5', 'H6',
            'BLOCKQUOTE',
            'LI', 'PRE'
        ].includes(blockElement.tagName) &&
        blockElement.parentElement) {
        blockElement = blockElement.parentElement;
    }

    return blockElement;
};

/**
 * Get text content before cursor with support for empty lines
 * @param {Node} node - Current node
 * @param {number} cursorPos - Cursor position
 * @param {HTMLElement} blockElement - Block element
 * @returns {string} Text before cursor
 */

export const getTextBeforeCursor = (node, cursorPos, blockElement) => {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.substring(0, cursorPos);
    }
    
    // Support for cases where the cursor is in an empty block
    if (blockElement.textContent === '' && blockElement.innerHTML === '<br>') {
        return '';
    }
    
    return blockElement.textContent || '';
};