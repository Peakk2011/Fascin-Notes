/**
 * @typedef {object} ExportMenuConfig
 * @property {string} exportHtmlButtonId            - The ID for the main export button.
 * @property {string} exportHtmlButtonTitle         - The title attribute for the main export button.
 * @property {string} exportHtmlButtonText          - The text content for the main export button.
 * @property {string} exportMenuHtmlText            - The text content for the "Export HTML" option in the dropdown.
 * @property {string} exportMenuTxtText             - The text content for the "Export TXT" option in the dropdown.
 */

/**
 * Generates the HTML markup for the export menu component.
 *
 * @param {ExportMenuConfig} config                 - Configuration object containing IDs, titles, and text for the export buttons.
 * @returns {string}                                – The HTML string representing the export menu.
 */
export const createExportMenuMarkup = (config) => {
    return `
        <div class="export-container">
            <button id="${config.exportHtmlButtonId}" title="${config.exportHtmlButtonTitle}">
                <span>${config.exportHtmlButtonText}</span>
            </button>
            <div id="export-menu" class="export-menu">
                <button id="export-html">${config.exportMenuHtmlText}</button>
                <button id="export-txt">${config.exportMenuTxtText}</button>
            </div>
        </div>
    `;
}

/**
 * @typedef {object} RichEditorAPI
 * @property {function(string): void} downloadHTML  - Function to trigger downloading the editor's content as an HTML file.
 * @property {function(string): void} downloadTXT   - Function to trigger downloading the editor's content as a plain text file.
 */

/**
 * Initializes the functionality for the export menu, including toggling the menu and handling export actions.
 *
 * @param {ExportMenuConfig} config             - Configuration object containing IDs for the export buttons.
 * @param {RichEditorAPI} richEditor            - An object providing methods to interact with the rich text editor, specifically for downloading content.
 * @returns {{cleanup: Function}}                 An object containing a `cleanup` function to remove all event listeners.
 *                                                Returns a no-op cleanup function if required elements are not found.
 */
export const initExportMenu = (config, richEditor) => {
    const exportBtn = document.getElementById(config.exportHtmlButtonId);
    const exportMenu = document.getElementById('export-menu');
    const exportHtmlBtn = document.getElementById('export-html');
    const exportTxtBtn = document.getElementById('export-txt');

    if (!exportBtn || !exportMenu || !richEditor) {
        return { cleanup: () => { } };
    }

    /**
     * Toggles the visibility of the export menu dropdown.
     * @private
     */
    const handleToggle = () => {
        exportMenu.classList.toggle('show');
    };

    /**
     * Handles the click event for exporting content as an HTML file.
     * Generates a filename and calls the rich editor's downloadHTML method.
     * @private
     */
    const handleExportHtml = () => {
        const filename = `note-${new Date().toISOString().slice(0, 10)}.html`;
        richEditor.downloadHTML(filename);
        exportMenu.classList.remove('show');
    };

    /**
     * Handles the click event for exporting content as a plain text file.
     * Generates a filename and calls the rich editor's downloadTXT method.
     * @private
     */
    const handleExportTxt = () => {
        const filename = `note-${new Date().toISOString().slice(0, 10)}.txt`;
        richEditor.downloadTXT(filename);
        exportMenu.classList.remove('show');
    };

    /**
     * Handles clicks outside the export button and menu to close the dropdown.
     * @param {MouseEvent} event - The click event.
     * @private
     */
    const handleClickOutside = (event) => {
        if (!exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
            exportMenu.classList.remove('show');
        }
    };

    exportBtn.addEventListener('click', handleToggle);
    exportHtmlBtn.addEventListener('click', handleExportHtml);
    exportTxtBtn.addEventListener('click', handleExportTxt);
    document.addEventListener('click', handleClickOutside);

    return {
        /**
         * Removes all event listeners attached by this module to prevent memory leaks.
         * @returns {void}
         */
        cleanup() {
            exportBtn.removeEventListener('click', handleToggle);
            exportHtmlBtn.removeEventListener('click', handleExportHtml);
            exportTxtBtn.removeEventListener('click', handleExportTxt);
            document.removeEventListener('click', handleClickOutside);
        }
    };
}