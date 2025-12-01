/**
 * Generates the HTML markup for a reset zoom button.
 *
 * @param {Object} config - Configuration for the zoom control button.
 * @param {string} config.resetZoomButtonId - The ID to assign to the reset button.
 * @param {string} config.resetZoomButtonTitle - The tooltip/title text for the button.
 * @param {string} config.resetZoomButtonText - The text content displayed inside the button.
 * @returns {string} - HTML markup string for the reset zoom button.
 *
 * @example
 * const markup = createZoomControlsMarkup({
 *   resetZoomButtonId: 'zoomResetBtn',
 *   resetZoomButtonTitle: 'Reset Zoom',
 *   resetZoomButtonText: 'Reset'
 * });
 * document.body.innerHTML += markup;
 */
export const createZoomControlsMarkup = (config) => {
    return `
        <button
            id="${config.resetZoomButtonId}"
            title="${config.resetZoomButtonTitle}">
            <span>${config.resetZoomButtonText}</span>
        </button>
    `;
};

/**
 * Initializes the zoom control by attaching a click event to the reset button.
 *
 * @param {Object} config - Configuration object for the zoom control.
 * @param {string} config.resetZoomButtonId - The ID of the reset button to bind.
 * @param {Object} noteAPI - An object providing the zoom-related API methods.
 * @param {Function} noteAPI.resetZoom - An asynchronous function to reset the zoom level.
 * @returns {Object} - An object containing a `cleanup` method to remove the event listener.
 *
 * @example
 * const zoomController = initZoomControls(config, noteAPI);
 * // Later, to remove the event listener:
 * zoomController.cleanup();
 */
export const initZoomControls = (config, noteAPI) => {
    const resetBtn = document.getElementById(config.resetZoomButtonId);

    if (resetBtn) {
        const handleReset = async () => {
            try {
                await noteAPI.resetZoom();
            } catch (error) {
                console.error('Error resetting zoom:', error);
            }
        };

        resetBtn.addEventListener('click', handleReset);

        return {
            cleanup() {
                resetBtn.removeEventListener('click', handleReset);
            }
        };
    }

    return { cleanup: () => { } };
};
