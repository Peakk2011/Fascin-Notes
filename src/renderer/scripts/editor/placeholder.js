import { noteFeaturesConfig } from '../note/noteConfig.js';

/**
 * Creates and manages a placeholder element for a text editor.
 * The placeholder is an overlay that shows when the editor is empty.
 *
 * @param {HTMLElement} editor - The editor element that the placeholder is for.
 * @param {string} placeholderText - The text to display in the placeholder.
 * @returns {{element: HTMLElement, updateVisibility: Function, syncFontSize: Function}} An object containing the placeholder element and functions to update its state.
 * @property {HTMLElement} element - The created placeholder DOM element.
 * @property {Function} updateVisibility - A function to show or hide the placeholder based on the editor's content.
 * @property {Function} syncFontSize - A function to synchronize the placeholder's font size with the editor's.
 */
export const createPlaceholder = (editor, placeholderText) => {
    try {
        const placeholder = document.createElement('div');
        placeholder.textContent = placeholderText || '';
        placeholder.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            color: var(--theme-fg);
            opacity: 65%;
            pointer-events: none;
            user-select: none;
            padding: 1.4rem 1.2rem;
            width: 100%;
            z-index: 1;
            font-family: var(--font-display);
            font-weight: 430;
            font-size: ${noteFeaturesConfig.defaultFontSize}px;
        `;

        const parent = editor.parentElement;
        if (parent) {
            parent.style.position = 'relative';
            parent.appendChild(placeholder);
        }

        /**
         * Updates the visibility of the placeholder.
         * It is displayed only when the editor is empty.
         */
        const updateVisibility = () => {
            try {
                const text = editor.textContent;
                if (text === '' || text === '\n') {
                    placeholder.style.display = 'block';
                } else {
                    placeholder.style.display = 'none';
                }
            } catch (error) {
                console.error('Error updating placeholder visibility:', error);
            }
        };

        /**
         * Synchronizes the font size of the placeholder with the editor's font size.
         */
        const syncFontSize = () => {
            try {
                const editorFontSize = window.getComputedStyle(editor).fontSize;
                placeholder.style.fontSize = editorFontSize;
            } catch (error) {
                console.error('Error synchronizing placeholder font size:', error);
            }
        };

        return {
            element: placeholder,
            updateVisibility,
            syncFontSize
        };
    } catch (error) {
        console.error('Error creating placeholder:', error);
        return null;
    }
};