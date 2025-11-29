/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, delay) => {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

/**
 * Safe check for a DOM element
 * @param {*} el - Element to check
 * @returns {boolean} True if valid element
 */
export const isValidElement = (el) => el && el.nodeType === 1;

/**
 * Safe DOM getter wrapped in try/catch
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null
 */
export const safeGetElementById = (id) => {
    try {
        if (!id) return null;

        const el = document.getElementById(id);
        return isValidElement(el) ? el : null;
    } catch (error) {
        console.error(
            '[ContextMenu] safeGetElementById failed for',
            id,
            error
        );
        return null;
    }
};

/**
 * Add event listener and track it for cleanup
 * @param {Array} eventListeners - Array to track listeners
 * @param {EventTarget} element - Target element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object|boolean} options - Event options
 */
export const addEventListener = (eventListeners, element, event, handler, options) => {
    try {
        if (
            !isValidElement(element) &&
            element !== window &&
            element !== document
        ) {
            return;
        }

        element.addEventListener(
            event,
            handler,
            options
        );

        eventListeners.push({
            element,
            event,
            handler,
            options
        });
    } catch (error) {
        console.warn(
            '[ContextMenu] addEventListener failed',
            event,
            error
        );
    }
};

/**
 * Remove all tracked event listeners
 * @param {Array} eventListeners - Array of tracked listeners
 */
export const removeAllEventListeners = (eventListeners) => {
    eventListeners.forEach(({ element, event, handler, options }) => {
        try {
            element?.removeEventListener(
                event,
                handler,
                options
            );
        } catch (err) {
            /* ignore */
        }
    });
    eventListeners.length = 0;
};