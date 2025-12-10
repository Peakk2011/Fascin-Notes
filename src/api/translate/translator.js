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
 * Detect language using a simple heuristic
 * @param {string} text - Text to detect language from.
 * @returns {string} Detected language code.
 */
const detectLanguage = (text) => {
    // Thai characters
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';

    // Japanese characters (Hiragana, Katakana, Kanji)
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)) return 'ja';

    // Korean characters
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) return 'ko';

    // Chinese characters
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';

    // Arabic characters
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';

    // Russian/Cyrillic characters
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';

    // Greek characters
    if (/[\u0370-\u03FF]/.test(text)) return 'el';

    // Default to English for Latin characters
    return 'en';
};

/**
 * Translate using MyMemory API (no CORS issues, free, no API key required)
 * @param {string} text - Text to translate.
 * @param {string} from - Source language code.
 * @param {string} to - Target language code.
 * @param {object} config - Configuration object.
 * @returns {Promise<string>} Translated text.
 * @throws {Error} If translation fails.
 */
const translateWithMyMemory = async (text, from, to, config) => {
    // MyMemory doesn't support 'auto', so we need to detect the language
    let sourceLang = from;
    if (from === 'auto') {
        sourceLang = detectLanguage(text);
    }

    const langPair = `${sourceLang}|${to}`;
    const url = `${config.apis.mymemory.baseUrl}?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const response = await fetchWithTimeout(
        url,
        {},
        config.timeoutMs
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data?.responseData?.translatedText) {
        return data.responseData.translatedText;
    }

    throw new Error('Invalid response format');
};

/**
 * Translate using Google Translate unofficial API (no CORS issues)
 * @param {string} text - Text to translate.
 * @param {string} from - Source language code.
 * @param {string} to - Target language code.
 * @param {object} config - Configuration object.
 * @returns {Promise<string>} Translated text.
 * @throws {Error} If translation fails.
 */
const translateWithGoogle = async (text, from, to, config) => {
    const params = new URLSearchParams({
        client: 'gtx',
        sl: from,
        tl: to,
        dt: 't',
        q: text
    });

    const url = `${config.apis.googleTranslate.baseUrl}?${params}`;

    const response = await fetchWithTimeout(
        url,
        {},
        config.timeoutMs
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Google returns: [[[translated_text, original_text, ...], ...], ...]
    if (data?.[0]?.[0]?.[0]) {
        return data[0].map(item => item[0]).join('');
    }

    throw new Error('Invalid response format');
};

/**
 * Translate using Lingva API
 * @param {string} text - Text to translate.
 * @param {string} from - Source language code.
 * @param {string} to - Target language code.
 * @param {object} config - Configuration object.
 * @returns {Promise<string>} Translated text.
 * @throws {Error} If translation fails.
 */
const translateWithLingva = async (text, from, to, config) => {
    const url = `${config.apis.lingva.baseUrl}/${from}/${to}/${encodeURIComponent(text)}`;

    const response = await fetchWithTimeout(
        url,
        {},
        config.timeoutMs
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data?.translation) {
        return data.translation;
    }

    throw new Error('Invalid response format');
};

/**
 * Translate using LibreTranslate API
 * @param {string} text - Text to translate.
 * @param {string} from - Source language code.
 * @param {string} to - Target language code.
 * @param {object} config - Configuration object.
 * @returns {Promise<string>} Translated text.
 * @throws {Error} If translation fails.
 */
const translateWithLibreTranslate = async (text, from, to, config) => {
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

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data?.translatedText) {
        return data.translatedText;
    }

    throw new Error('Invalid response format');
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

    // Build list of enabled APIs sorted by priority
    const apis = Object.entries(config.apis)
        .filter(([_, cfg]) => cfg.enabled)
        .sort((a, b) => (a[1].priority || 999) - (b[1].priority || 999));

    // Try each API in order of priority
    for (const [name, apiConfig] of apis) {
        try {
            let result;

            switch (name) {
                case 'mymemory':
                    result = await translateWithMyMemory(text, from, to, config);
                    break;
                case 'googleTranslate':
                    result = await translateWithGoogle(text, from, to, config);
                    break;
                case 'lingva':
                    result = await translateWithLingva(text, from, to, config);
                    break;
                case 'libretranslate':
                    result = await translateWithLibreTranslate(text, from, to, config);
                    break;
                default:
                    continue;
            }

            if (result) {
                return result;
            }
        } catch (error) {
            errors.push(
                `${name}: ${error.message}`
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