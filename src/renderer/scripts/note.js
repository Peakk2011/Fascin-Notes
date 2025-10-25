// Central export file for note features
export { noteFeaturesConfig } from './note/noteConfig.js';
export { noteFeatures } from './note/api.js';
export {
    activeTabId,
    tabsData,
    currentFontSize
} from './note/state.js';

/** @deprecated Use noteFeatures() API instead */
export const loadTab = (tabId) => {
    console.warn('Use the API returned from noteFeatures() instead');
};