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

    tabManager.createTab('Welcome');
    return tabManager;
};

document.addEventListener('DOMContentLoaded', tabbar, {
    once: true
});