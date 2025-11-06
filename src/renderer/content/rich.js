import { noteFeaturesConfig } from '../scripts/note/noteConfig.js';

/**
 * Component to manage rich editor behaviors used by page.js
 *
 * @param {Object} options                      - Configuration options
 * @param {string} options.editorId             - ID of contentEditable element
 * @param {string} [options.placeholderText]    - Placeholder text when empty
 * @param {Object} [options.formatButtons]      - Format button IDs: {bold, italic}
 * @returns {{cleanup: Function, updatePlaceholder: Function, editor: HTMLElement, placeholder: HTMLElement}|null}
 */
export const initRichEditor = ({ editorId, placeholderText, formatButtons = {} } = {}) => {
    const editor = document.getElementById(editorId);
    if (!editor) {
        return null;
    }

    // Overlay placeholder
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
        padding: 1.2rem 1rem;
        width: 100%;
        z-index: 1;
        font-family: 'General Sans', 'Anuphan', sans-serif;
        font-weight: 430;
        font-size: ${noteFeaturesConfig.defaultFontSize}px;
    `;

    // Check that is positioned so absolute placeholder
    const parent = editor.parentElement;
    if (parent) {
        parent.style.position = 'relative';
        parent.appendChild(placeholder);
    }

    /** @private Updates placeholder visibility based on content */
    const updateVisibility = () => {
        if (editor.textContent.trim() === '') {
            placeholder.style.display = 'block';
        } else {
            placeholder.style.display = 'none';
        }
    };

    /** @private Sync font size with editor */
    const syncFontSize = () => {
        const editorFontSize = window.getComputedStyle(editor).fontSize;
        placeholder.style.fontSize = editorFontSize;
    };

    // Handle zoom events directly
    const wheelHandler = (e) => {
        if (e.ctrlKey || e.metaKey) {
            // Update immediately on zoom
            requestAnimationFrame(syncFontSize);
        }
    };
    editor.addEventListener('wheel', wheelHandler, { passive: true });

    // input/focus/blur
    editor.addEventListener(
        'input',
        updateVisibility
    );

    editor.addEventListener(
        'focus',
        updateVisibility
    );

    editor.addEventListener(
        'blur',
        updateVisibility
    );

    // Listen for font-size changes (buttons, shortcuts)
    const fontObserver = new MutationObserver(syncFontSize);
    fontObserver.observe(editor, {
        attributes: true,
        attributeFilter: ['style']
    });

    const boundFormatButtons = [];

    if (formatButtons.bold) {
        const el = document.getElementById(formatButtons.bold);
        if (el) {
            /** @private Applies bold formatting */
            const fn = () => document.execCommand(
                'bold',
                false,
                null
            );
            el.addEventListener(
                'click',
                fn
            );
            boundFormatButtons.push(
                {
                    el,
                    fn
                }
            );
        }
    }

    if (formatButtons.italic) {
        const el = document.getElementById(formatButtons.italic);
        if (el) {
            /** @private Applies italic formatting */
            const fn = () => document.execCommand(
                'italic',
                false,
                null
            );
            el.addEventListener(
                'click',
                fn
            );
            boundFormatButtons.push(
                {
                    el,
                    fn
                }
            );
        }
    }

    updateVisibility();
    syncFontSize();

    return {
        /** @method cleanup - Removes all event listeners and placeholder element */
        cleanup() {
            fontObserver.disconnect();
            editor.removeEventListener('wheel', wheelHandler);
            
            editor.removeEventListener(
                'input',
                updateVisibility
            );

            editor.removeEventListener(
                'focus',
                updateVisibility
            );

            editor.removeEventListener(
                'blur',
                updateVisibility
            );

            boundFormatButtons.forEach(
                ({ el, fn }) => {
                    el.removeEventListener(
                        'click',
                        fn
                    );
                }
            );

            if (placeholder.parentElement) {
                placeholder.parentElement.removeChild(placeholder);
            }
        },
        /** @method updatePlaceholder - Update placeholder visibility and font size */
        /** @property {HTMLElement} editor - The editor element */
        /** @property {HTMLElement} placeholder - The placeholder element */

        updatePlaceholder: () => {
            updateVisibility();
            syncFontSize();
        },
        editor,
        placeholder
    };
}