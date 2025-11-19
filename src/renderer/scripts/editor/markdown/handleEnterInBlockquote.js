/**
 * Handle Enter key in blockquote
 * @param {KeyboardEvent} e - Keyboard event
 * @param {HTMLElement} editor - Editor element
 * @param {Node} node - Current node
 * @param {Selection} selection - Window selection
 * @returns {boolean|undefined} True if handled, undefined if not in blockquote
 */
export const handleEnterInBlockquote = (e, editor, node, selection) => {
    // blockquote element
    let blockquote = node;
    while (blockquote && blockquote !== editor) {
        if (blockquote.tagName === 'BLOCKQUOTE') {
            break;
        }
        blockquote = blockquote.parentElement;
    }

    if (!blockquote || blockquote.tagName !== 'BLOCKQUOTE') {
        return undefined; 
    }

    const text = blockquote.textContent.trim();

    if (text === '' || text === '\n') {
        e.preventDefault();

        const newP = document.createElement('p');
        newP.innerHTML = '<br>';

        blockquote.replaceWith(newP);

        // Cursor Position
        const newRange = document.createRange();
        newRange.setStart(newP, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        return true;
    } else {
        e.preventDefault();

        const newBlockquote = document.createElement('blockquote');
        newBlockquote.innerHTML = '<br>';

        blockquote.after(newBlockquote);

        // Cursor Position
        const newRange = document.createRange();
        
        newRange.setStart(newBlockquote, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);

        return true;
    }
};