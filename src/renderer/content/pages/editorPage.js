import { initRichEditor } from '../rich.js';
import { keyMap } from '../../scripts/editor/keymap.js';
import { initStatusIndicator } from '../pageComponents/statusIndicator.js';
import { initZoomControls } from '../pageComponents/zoomControls.js';
import { initExportMenu } from '../pageComponents/exportMenu.js';
import { initSelectionMenu } from '../pageComponents/selectionMenu.js';

export const initEditorPage = async (config, noteAPI, modelFind, contextMenu) => {
    const editorElement = document.getElementById(config.textareaId);
    if (!editorElement) {
        throw new Error(`Editor element with ID "${config.textareaId}" not found.`);
    }

    // Initialize rich editor component
    const rich = initRichEditor({
        editorId: config.textareaId,
        placeholderText: config.textareaPlaceholder
    });

    window.rich = rich;

    // Store cleanup functions
    const cleanupFunctions = [];

    // Setup event listeners
    requestAnimationFrame(() => {
        // Initialize components
        const statusIndicator = initStatusIndicator(config);
        const zoomControls = initZoomControls(config, noteAPI);
        const exportMenu = initExportMenu(config, rich);
        const selectionMenu = initSelectionMenu(editorElement);

        // Store cleanup functions
        cleanupFunctions.push(
            zoomControls.cleanup,
            exportMenu.cleanup,
            selectionMenu.cleanup
        );

        // Initialize Keyboard Shortcuts
        const editorCallbacks = {
            /**
             * Called on Ctrl/Cmd + S
             * @param {string} content - Current HTML content of the editor
             */
            onSave: async (content) => {
                await noteAPI.saveData();
                statusIndicator.showSaved();
            },
            /**
             * Called on Ctrl/Cmd + F
             */
            onSearch: () => {
                if (modelFind && typeof modelFind.show === 'function') {
                    modelFind.show();
                } else {
                    console.warn('modelFind.show() is not available.');
                }
            },
            /**
             * Called on Ctrl/Cmd + H
             */
            onReplace: () => {
                if (modelFind && typeof modelFind.show === 'function') {
                    modelFind.show(true); // Pass true to open replace tab
                } else {
                    console.warn('modelFind.show(true) is not available.');
                }
            }
        };

        const cleanupKeyMap = keyMap(editorElement, editorCallbacks);
        cleanupFunctions.push(cleanupKeyMap);
    });

    // Initialize other components
    modelFind.init({ pageConfig: config, noteAPI });
    contextMenu.init({ pageConfig: config, noteAPI });

    // Return cleanup function
    return {
        noteAPI,
        cleanup() {
            cleanupFunctions.forEach(fn => fn());
        }
    };
}