import { TabManager } from './components/tabManager.js';
import { DragManager } from './components/dragManager.js';
import { KeyboardManager } from './components/keyboardManager.js';

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

// Initial tab
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        tabManager.createTab('Welcome');
    });
} else {
    tabManager.createTab('Welcome');
}