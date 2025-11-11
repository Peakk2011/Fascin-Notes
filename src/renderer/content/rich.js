import { createPlaceholder } from '../scripts/editer/placeholder.js';
import { handleMarkdown } from '../scripts/editer/markdown.js';
import { exportHTML, downloadHTML } from '../scripts/editer/download.js';

/**
 * Component to manage rich editor with Markdown support and HTML export
 * @param {Object} options - Configuration options
 * @param {string} options.editorId - ID of contentEditable element
 * @param {string} [options.placeholderText] - Placeholder text when empty
 * @param {Object} [options.formatButtons] - Format button IDs: {bold, italic}
 * @returns {{cleanup: Function, updatePlaceholder: Function, editor: HTMLElement, placeholder: HTMLElement, exportHTML: Function, downloadHTML: Function}|null}
 */
export const initRichEditor = ({ editorId, placeholderText, formatButtons = {} } = {}) => {
    const editor = document.getElementById(editorId);
    if (!editor) {
        return null;
    }

    // Create placeholder
    const placeholderManager = createPlaceholder(
        editor,
        placeholderText
    );

    const {
        element: placeholder,
        updateVisibility,
        syncFontSize
    } = placeholderManager;

    // Markdown handler wrapper
    const markdownHandler = (e) => {
        handleMarkdown(e, editor);
    }

    // Handle zoom events
    const wheelHandler = (e) => {
        if (e.ctrlKey || e.metaKey) {
            requestAnimationFrame(syncFontSize);
        }
    };

    // Attach event listeners
    editor.addEventListener(
        'wheel',
        wheelHandler,
        {
            passive: true
        }
    );

    editor.addEventListener(
        'keydown',
        markdownHandler
    );

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

    // Listen for font-size changes
    const fontObserver = new MutationObserver(syncFontSize);
    
    fontObserver.observe(editor, {
        attributes: true,
        attributeFilter: ['style']
    });

    // Setup format buttons
    const boundFormatButtons = [];

    if (formatButtons.bold) {
        const el = document.getElementById(formatButtons.bold);
        if (el) {
            const fn = () => {
                document.execCommand('bold', false, null);
            }

            el.addEventListener(
                'click',
                fn
            );

            boundFormatButtons.push({ el,fn });
        }
    }

    if (formatButtons.italic) {
        const el = document.getElementById(formatButtons.italic);
        if (el) {
            const fn = () => {
                document.execCommand(
                    'italic',
                    false,
                    null
                );
            }

            el.addEventListener(
                'click',
                fn
            );
            
            boundFormatButtons.push({ el,fn });
        }
    }

    // Initialize
    updateVisibility();
    syncFontSize();

    // Return public API
    return {
        cleanup() {
            fontObserver.disconnect();
            editor.removeEventListener(
                'wheel',
                wheelHandler
            );

            editor.removeEventListener(
                'keydown',
                markdownHandler
            );

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

            boundFormatButtons.forEach(({ el, fn }) => {
                el.removeEventListener('click', fn);
            });

            if (placeholder.parentElement) {
                placeholder.parentElement.removeChild(placeholder);
            }
        },

        updatePlaceholder: () => {
            updateVisibility();
            syncFontSize();
        },

        exportHTML: (
            includeStyles = true
        ) => exportHTML(
            editor,
            includeStyles
        ),
        
        downloadHTML: (filename = 'document.html') => {
            downloadHTML(editor, filename);
        },

        editor,
        placeholder
    };
};