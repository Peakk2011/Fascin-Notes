import { createStatusIndicatorMarkup } from '../pageComponents/statusIndicator.js';
import { createZoomControlsMarkup } from '../pageComponents/zoomControls.js';
import { createExportMenuMarkup } from '../pageComponents/exportMenu.js';
import { createSelectionMenuMarkup } from '../pageComponents/selectionMenu.js';

/**
 * Generates the complete HTML markup for the page editor.
 *
 * This includes:
 * - Status indicator
 * - Editable text area
 * - Zoom controls
 * - Export menu
 * - Selection menu
 * - Additional markups from modelFind and contextMenu
 *
 * @param {Object} config - Configuration object for page components.
 * @param {string} config.textareaContainerClass - Class name for the textarea container.
 * @param {string} config.textareaId - ID for the editable content div.
 * @param {string} config.textareaPlaceholder - Placeholder text for the editable div.
 * @param {string} config.zoomControlsClass - Class name for the zoom controls container.
 * @param {string} config.resetZoomButtonId - ID for the reset zoom button.
 * @param {string} config.resetZoomButtonTitle - Tooltip/title for the reset zoom button.
 * @param {string} config.resetZoomButtonText - Text displayed in the reset zoom button.
 * @param {Object} modelFind - Object containing additional markup for model-related UI.
 * @param {string} modelFind.markups - HTML string for model-related elements.
 * @param {Object} contextMenu - Object containing additional markup for context menu.
 * @param {string} contextMenu.markups - HTML string for context menu elements.
 * @returns {string} - HTML markup string representing the full page editor.
 *
 * @example
 * const pageHTML = createPageMarkup(config, modelFind, contextMenu);
 * document.body.innerHTML = pageHTML;
 */
export const createPageMarkup = (config, modelFind, contextMenu) => {
    return `
        ${createStatusIndicatorMarkup(config)}
        
        <div class="${config.textareaContainerClass}">
            <div id="${config.textareaId}" contenteditable="true" spellcheck="false" class="editable-div" data-placeholder="${config.textareaPlaceholder}"></div>

            <div class="${config.zoomControlsClass}">
                ${createZoomControlsMarkup(config)}
                ${createExportMenuMarkup(config)}
            </div>
        </div>

        ${createSelectionMenuMarkup()}
        
        ${modelFind.markups}
        ${contextMenu.markups}
    `;
};
