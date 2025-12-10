/**
 * Creates the HTML markup for a custom title bar.
 * This should only be used in an Electron environment.
 * @returns {string} The HTML markup for the title bar.
 */
export const createTitlebarMarkup = () => {
    return `
        <div id="title-bar" class="application-titlebar">
            <span>Fascinate Notes</span>
        </div>
    `;
};

/**
 * Initializes the title bar component, adding event listeners for window controls.
 * Assumes that `window.electronAPI` is available for communicating with the main process.
 */
export const initTitlebar = () => {};

export const createTitlebar = async () => {
    return { markups: createTitlebarMarkup() };
};