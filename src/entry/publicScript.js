// Renderer side (Frontend)
const initOS = async () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initOS, 50);
        return;
    }

    if (typeof window.electronAPI.getOS === 'function') {
        try {
            const os = await window.electronAPI.getOS();
            console.log('OS received via request:', os);
            document.body.classList.add(os);
            console.log('Body classes:', document.body.className);
        } catch (error) {
            console.error('Error getting OS:', error);
        }
    }
}

initOS();