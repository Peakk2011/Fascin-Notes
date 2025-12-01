import { fetchJSON } from '../../../utils/fetch.js';

let _configCache = null;

/**
 * Fetches the page configuration from a JSON file.
 * Caches the result to avoid repeated network requests.
 *
 * @async
 * @returns {Promise<Object>} 
 *
 * @example
 * const config = await getConfig();
 * console.log(config.someProperty);
 */
export const getConfig = async () => {
    if (!_configCache) {
        _configCache = await fetchJSON(
            'renderer/content/pageConfig.json'
        );
    }

    return _configCache;
};
