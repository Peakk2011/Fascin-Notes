import { TabManager } from './components/tabManager.js';
import { DragManager } from './components/dragManager.js';
import { KeyboardManager } from './components/keyboardManager.js';

export const tabbar = () => {
    const tabbar = document.getElementById('tabbar');
    const addBtn = document.getElementById('addTab');

    // Initialize managers
    const tabManager = new TabManager(tabbar, addBtn);
    new DragManager(tabManager).init(tabbar);
    new KeyboardManager().init();

    try {
        if (window.electronAPI && typeof window.electronAPI.requestTabsSync === 'function') {
            window.electronAPI.requestTabsSync();
        }
    } catch (e) {
        // ignore
    }

    setTimeout(() => {
        try {
            if (tabManager.getTabCount() === 0) {
                tabManager.createTab('Welcome');
            }
        } catch (e) {
            console.error('Error creating fallback Welcome tab:', e);
        }
    }, 250);

    return tabManager;
};

tabbar();