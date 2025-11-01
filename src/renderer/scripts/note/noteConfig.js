// This file part from renderer (frontend)

/**
 * @typedef {Object} NoteFeaturesConfig
 * @property {number} minFontSize - Min font size
 * @property {number} maxFontSize - Max font size
 * @property {number} defaultFontSize - Default font size
 * @property {number} fontStep - Font size step
 * @property {number} autoSaveDelay - Auto-save delay (ms)
 * @property {number} mainProcessSaveThrottle - Throttle for saving to main process (ms)
 * @property {Object} status - Status texts
 */

/** @type {NoteFeaturesConfig} */

export const noteFeaturesConfig = {
    minFontSize: 8,
    maxFontSize: 128,
    defaultFontSize: 16,
    fontStep: 2,
    autoSaveDelay: 1000,
    mainProcessSaveThrottle: 5000,
    status: {
        typing: 'Typing...',
        saving: 'Saving...',
        saved: 'Saved',
        error: 'Error saving'
    }  
};