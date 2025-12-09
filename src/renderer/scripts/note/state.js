/**
 * @file Manages the local state for the note editor view.
 * This includes data for individual UI state like font size,
 * and mechanisms for tracking and cleaning up resources like timeouts and event listeners.
 */

import { noteFeaturesConfig } from "./noteConfig.js";

/**
 * Holds the timeout ID for the debounced auto-save functionality.
 * @type {NodeJS.Timeout | null}
 */
export let autoSaveTimeout = null;
/**
 * Stores the current font size of the textarea.
 * @type {number}
 */
export let currentFontSize = noteFeaturesConfig.defaultFontSize;
/**
 * Timestamp of the last successful save to the main process. Used for throttling save operations.
 * @type {number}
 */
export let lastMainProcessSaveTime = 0;
/**
 * An array to track all active event listeners for easy cleanup.
 * @type {Array<{element: HTMLElement|Window, event: string, handler: function}>}
 */
export let eventListeners = [];

/**
 * Updates the auto-save timeout ID.
 * @param {NodeJS.Timeout} timeout - The new timeout ID from `setTimeout`.
 */
export const setAutoSaveTimeout = (timeout) => {
    autoSaveTimeout = timeout;
};

/**
 * Updates the current font size state.
 * @param {number} size - The new font size in pixels.
 */
export const setCurrentFontSize = (size) => {
    currentFontSize = size;
};

/**
 * Tracks an event listener by storing its details in an array.
 * This allows for later removal without needing to keep a reference to the handler elsewhere.
 * @param {HTMLElement|Window} element - The DOM element the listener is attached to.
 * @param {string} event - The name of the event (e.g., 'click').
 * @param {function} handler - The callback function for the event.
 */
export const addEventListenerTracker = (element, event, handler) => {
    eventListeners.push(
        {
            element,
            event,
            handler
        }
    );
};

/**
 * Removes all tracked event listeners from their respective elements and clears the tracking array.
 * This is a crucial cleanup step to prevent memory leaks when the view is destroyed or reloaded.
 */
export const clearEventListeners = () => {
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];
};