// Renderer side (Frontend)
// All .html files will using this script here 

let lastShortcutTime = 0;
const shortcutThrottle = 500;
let keyboardInitialized = false;

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

// Initialize keyboard shortcuts (USE FOR index.html)
const initKeyboardShortcuts = () => {
    if (typeof window.electronAPI === 'undefined') {
        setTimeout(initKeyboardShortcuts, 50);
        return;
    }

    if (keyboardInitialized) {
        console.warn('Keyboard shortcuts already initialized');
        return;
    }

    const canExecuteShortcut = () => {
        const now = Date.now();
        if (now - lastShortcutTime < shortcutThrottle) {
            // console.log('Shortcut throttled');
            return false;
        }
        lastShortcutTime = now;
        return true;
    };

    document.addEventListener('keydown', (e) => {
        // (key repeat)
        if (e.repeat) {
            return;
        };

        const isMac = document.body.classList.contains('darwin');
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        // Ctrl/Cmd + T - New Tab
        if (modifier && e.code === 'KeyT') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            // console.log('Frontend: Ctrl+T pressed');
            window.electronAPI.sendShortcut({ type: 'new-tab' });
            return;
        }

        // Ctrl/Cmd + W - Close Current Tab
        if (modifier && e.code === 'KeyW') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            // console.log('Frontend: Ctrl+W pressed');
            window.electronAPI.sendShortcut({ type: 'close-tab' });
            return;
        }

        // Ctrl + Tab - Next Tab
        if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            }
            // console.log('Frontend: Ctrl+Tab pressed');
            window.electronAPI.sendShortcut({ type: 'next-tab' });
            return;
        }

        // Ctrl + Shift + Tab - Previous Tab
        if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            };
            // console.log('Frontend: Ctrl+Shift+Tab pressed');
            window.electronAPI.sendShortcut({ type: 'prev-tab' });
            return;
        }

        // Ctrl/Cmd + 1-8 - Switch to specific tab
        if (modifier && e.key >= '1' && e.key <= '8') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return;
            };
            const index = parseInt(e.key) - 1;
            // console.log(`Frontend: Ctrl+${e.key} pressed`);
            window.electronAPI.sendShortcut({
                type: 'switch-to-index',
                index
            });
            return;
        }

        // Ctrl/Cmd + 9 - Switch to last tab
        if (modifier && e.key === '9') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!canExecuteShortcut()) {
                return
            };
            console.log('Frontend: Ctrl+9 pressed');
            window.electronAPI.sendShortcut({ type: 'switch-to-last' });
            return;
        }
    }, true);

    keyboardInitialized = true;
    // console.log('Keyboard shortcuts initialized');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    keyboardInitialized = false;
    lastShortcutTime = 0;
    // console.log('Keyboard shortcuts cleaned up');
});

// Start initialization
initOS();
initKeyboardShortcuts();