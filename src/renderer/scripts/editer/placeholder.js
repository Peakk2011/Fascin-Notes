import { noteFeaturesConfig } from '../../scripts/note/noteConfig.js';

/**
 * Create and manage placeholder overlay for editor
 * @param {HTMLElement} editor - Editor element
 * @param {string} placeholderText - Placeholder text
 * @returns {{element: HTMLElement, updateVisibility: Function, syncFontSize: Function}}
 */

export const createPlaceholder = (editor, placeholderText) => {
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
        font-family: 'General Sans', 'Anuphan', sans-serif;
        font-weight: 430;
        font-size: ${noteFeaturesConfig.defaultFontSize}px;
    `;

    const parent = editor.parentElement;
    if (parent) {
        parent.style.position = 'relative';
        parent.appendChild(placeholder);
    }

    // Update placeholder visibility based on content
    const updateVisibility = () => {
        if (editor.textContent.trim() === '') {
            placeholder.style.display = 'block';
        } else {
            placeholder.style.display = 'none';
        }
    };

    // Sync font size with editor
    const syncFontSize = () => {
        const editorFontSize = window.getComputedStyle(editor).fontSize;
        placeholder.style.fontSize = editorFontSize;
    };

    return {
        element: placeholder,
        updateVisibility,
        syncFontSize
    };
};