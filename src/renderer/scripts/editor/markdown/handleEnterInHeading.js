/**
 * Handles the Enter key within an empty heading element (H1-H4).
 * If the user presses Enter in an empty heading, this function converts
 * the heading into a new, empty paragraph element, providing a more
* intuitive way to "exit" a heading block.
 *
 * @param {KeyboardEvent} e - The keyboard event.
 * @param {HTMLElement} editor - The main content-editable editor element.
 * @returns {boolean} Returns `true` if the event was handled, otherwise `false`.
 */
export const handleEnterInHeading = (e, editor) => {
    if (e.key !== 'Enter') {
        return false;
    }

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) {
        return false;
    }

    const range = selection.getRangeAt(0);
    const container = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;

    // Check if we are inside an H1, H2, H3, or H4 tag
    const headingMatch = container.tagName.match(/^H([1-4])$/);
    if (!headingMatch || container.textContent.trim() !== '') {
        return false;
    }

    e.preventDefault();

    const p = document.createElement('p');
    p.innerHTML = '<br>'; // Ensure it's a valid block for cursor placement
    container.replaceWith(p);

    // Set cursor inside the new paragraph
    const newRange = document.createRange();
    newRange.setStart(p, 0);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    return true; // Event was handled
};