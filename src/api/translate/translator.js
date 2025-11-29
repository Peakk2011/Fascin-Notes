import { fetchJSON, fetchWithTimeout } from '../../utils/fetch.js';

let configCache = null;

/**
 * Load configuration from JSON file.
 * @param {string} configPath - Path to config.json.
 * @returns {Promise<object>} Configuration object.
 */
const loadConfig = async () => {
    if (!configCache) {
        const configUrl = new URL('./config.json', import.meta.url);
        configCache = await fetchJSON(configUrl.href);
    }
    
    return configCache;
};

/**
 * Core translation function with internet detection and fallback.
 * @param {string} text - Text to translate.
 * @param {string} from - Source language code.
 * @param {string} to - Target language code.
 * @returns {Promise<string>} Translated text.
 */
const translateCore = async (text, from = 'auto', to = 'th') => {
    const config = await loadConfig();

    // Input validation
    if (!text || typeof text !== 'string') {
        throw new Error(
            'Invalid input: text must be a non-empty string'
        );
    }

    if (text.length > config.maxTextLength) {
        throw new Error(
            `Text too long (max ${config.maxTextLength} characters)`
        );
    }

    const errors = [];

    // Try Lingva first (only if online)
    if (config.apis.lingva.enabled) {
        try {
            const url = `${config.apis.lingva.baseUrl}/${from}/${to}/${encodeURIComponent(text)}`;
            
            const response = await fetchWithTimeout(
                url,
                {},
                config.timeoutMs
            );

            if (response.ok) {
                const data = await response.json();
                if (data?.translation) {
                    return data.translation;
                }
            }

            errors.push(
                `Lingva failed: ${response.status}`
            );
        } catch (error) {
            errors.push(
                `Lingva error: ${error.message}`
            );
        }
    }

    // Fallback to LibreTranslate
    if (config.apis.libretranslate.enabled) {
        try {
            const response = await fetchWithTimeout(
                config.apis.libretranslate.baseUrl,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        q: text,
                        source: from,
                        target: to,
                        format: "text"
                    })
                },
                config.timeoutMs
            );

            if (response.ok) {
                const data = await response.json();
                
                if (data?.translatedText) {
                    return data.translatedText;
                }
            }
            errors.push(
                `LibreTranslate failed: ${response.status}`
            );
        } catch (error) {
            errors.push(
                `LibreTranslate error: ${error.message}`
            );
        }
    }

    // All services failed
    throw new Error(
        `Translation failed:\n${errors.join('\n')}`
    );
};

/**
 * Translation API with language-specific methods.
 */
export const translate = {
    /**
     * Translate to Thai
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    thai: async (text, from = "auto") => translateCore(text, from, "th"),

    /**
     * Translate to English
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    english: async (text, from = "auto") => translateCore(text, from, "en"),

    /**
     * Translate to Japanese
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    japanese: async (text, from = "auto") => translateCore(text, from, "ja"),

    /**
     * Translate to Korean
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    korean: async (text, from = "auto") => translateCore(text, from, "ko"),

    /**
     * Translate to Chinese (Simplified)
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    chinese: async (text, from = "auto") => translateCore(text, from, "zh"),

    /**
     * Translate to French
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    french: async (text, from = "auto") => translateCore(text, from, "fr"),

    /**
     * Translate to German
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    german: async (text, from = "auto") => translateCore(text, from, "de"),

    /**
     * Translate to Spanish
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    spanish: async (text, from = "auto") => translateCore(text, from, "es"),

    /**
     * Translate to Portuguese
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    portuguese: async (text, from = "auto") => translateCore(text, from, "pt"),

    /**
     * Translate to Russian
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    russian: async (text, from = "auto") => translateCore(text, from, "ru"),

    /**
     * Translate to Italian
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    italian: async (text, from = "auto") => translateCore(text, from, "it"),

    /**
     * Translate to Dutch
     * @param {string} text - Text to translate
     * @param {string} from - Source language (default: "auto")
     */
    dutch: async (text, from = "auto") => translateCore(text, from, "nl")
};