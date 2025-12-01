/**
 * @typedef {object} StatusIndicatorMarkupConfig
 * @property {string} statusContainerClass                  - The CSS class for the main status container div.
 * @property {string} saveIndicatorClass                    - The CSS class for the save indicator element.
 * @property {string} saveIndicatorId                       - The ID for the save indicator element.
 * @property {string} statusTextId                          - The ID for the status text span.
 * @property {string} initialStatusText                     - The initial text to display in the status area.
 */

/**
 * Creates the HTML markup for the status indicator component.
 *
 * @param {StatusIndicatorMarkupConfig} config              - Configuration object for the status indicator markup.
 * @returns {string} The HTML string representing the status indicator.
 */
export const createStatusIndicatorMarkup = (config) => {
    return `
        <div class="${config.statusContainerClass}">
            <div
                class="${config.saveIndicatorClass}"
                id="${config.saveIndicatorId}">
            </div>
            <span id="${config.statusTextId}">${config.initialStatusText}</span>
        </div>
    `;
}

/**
 * @typedef {object} StatusIndicatorInitConfig
 * @property {string} saveIndicatorId                       - The ID of the save indicator element to control.
 */

/**
 * @typedef {object} StatusIndicatorAPI
 * @property {function(): void} showSaved                   - A function to briefly show a "Saved!" message.
 */

/**
 * Initializes the status indicator component, providing a method to display its status.
 *
 * @param {StatusIndicatorInitConfig} config                - Configuration object containing the ID of the indicator element.
 * @returns {StatusIndicatorAPI}                            - Object with methods to control the status indicator.
 */
export const initStatusIndicator = (config) => {
    const element = document.getElementById(config.saveIndicatorId);

    if (!element) {
        console.error(
            `StatusIndicator: Element with ID '${config.saveIndicatorId}' not found.`
        );
        
        return {
            showSaved: () => {}
        };
    }

    return {
        showSaved() {
            element.textContent = 'Saved!';
            element.classList.add('show');

            setTimeout(() => {
                element.classList.remove('show');
            }, 2000);
        }
    };
}