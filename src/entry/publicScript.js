/*
    Renderer side (Frontend)
    All .html files will using this script here 
*/

/**
 * Initialize OS detection
 */
const initOS = async () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initOS, 50);
        return;
    }

    if (typeof window.electronAPI.getOS === 'function') {
        try {
            const os = await window.electronAPI.getOS();
            document.body.classList.add(os);
        } catch (error) {
            console.error('Error getting OS:', error);
        }
    }
}

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    initOS();
});