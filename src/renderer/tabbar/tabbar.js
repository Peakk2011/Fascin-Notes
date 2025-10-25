import { TabManager } from './components/tabManager.js';
import { DragManager } from './components/dragManager.js';
import { KeyboardManager } from './components/keyboardManager.js';

export const tabbar = () => {
    const tabbar = document.getElementById('tabbar');
    const addBtn = document.getElementById('addTab');

    // Initialize managers
    const tabManager = new TabManager(tabbar, addBtn);
    const dragManager = new DragManager(tabManager);
    const keyboardManager = new KeyboardManager(tabManager);

    // Setup event listeners
    dragManager.init(tabbar);
    keyboardManager.init();

    addBtn.addEventListener('click', () => tabManager.createTab(), { passive: true });

    // Create first tab
    tabManager.createTab('Welcome');

    // debug check if data send to main process
    // console.log('Tabbar initialized, waiting for main process updates...');

    return tabManager;
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tabbar);
} else {
    tabbar();
}