import { noteFeaturesConfig } from "./noteConfig.js";

export let autoSaveTimeout = null;
export let currentFontSize = noteFeaturesConfig.defaultFontSize;
export let activeTabId = null;
export let eventListeners = [];
export const tabsData = {};

export const setAutoSaveTimeout = (timeout) => {
    autoSaveTimeout = timeout;
};

export const setCurrentFontSize = (size) => {
    currentFontSize = size;
};

export const setActiveTabId = (id) => {
    activeTabId = id;
};

export const addEventListenerTracker = (element, event, handler) => {
    eventListeners.push(
        {
            element,
            event,
            handler
        }
    );
};

export const clearEventListeners = () => {
    eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
    });
    eventListeners = [];
};