/**
 * Fetches and parses a JSON file from a given URL.
 * The URL should be relative to the root of the application (where index.html is).
 * @param {string} url - The path to the JSON file.
 * @returns {Promise<object>} A promise that resolves with the parsed JSON object.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const fetchJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch JSON from ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
};