const tabbar = document.getElementById('tabbar');
const addBtn = document.getElementById('addTab');

let tabs = [];
let tabOrder = [];
let freeIds = [];
let nextId = 1;
let activeTabId = null;

// Tab user interface

const getNewId = () => {
    if (freeIds.length > 0) return freeIds.shift();
    return nextId++;
};

const releaseId = (id) => {
    freeIds.push(id);
    freeIds.sort((a, b) => a - b);
};

const createTab = (title = `Tab ${nextId}`) => {
    const id = getNewId();
    const tabEl = document.createElement('div');

    tabEl.classList.add('tab');
    tabEl.setAttribute('draggable', 'true');
    tabEl.dataset.id = id;

    const titleSpan = document.createElement('span');
    titleSpan.textContent = title;
    titleSpan.classList.add('tab-title');

    // "X" button
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.classList.add('close');
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(id);
    }, { passive: true });

    tabEl.appendChild(titleSpan);
    tabEl.appendChild(closeBtn);

    tabEl.addEventListener('click', () => switchTab(id), { passive: true });

    tabbar.insertBefore(tabEl, addBtn);
    tabs[id] = tabEl;
    tabOrder.push(id);
    switchTab(id);

    window.electronAPI.newTab(title);
};

const switchTab = (id) => {
    if (!tabs[id] || activeTabId === id) return;

    requestAnimationFrame(() => {
        Object.values(tabs).forEach(t => t.classList.remove('active'));
        tabs[id].classList.add('active');
        activeTabId = id;

        const index = tabOrder.indexOf(id);
        window.electronAPI.switchTab(index);
    });
};

const closeTab = (id) => {
    if (!tabs[id]) return;

    const index = tabOrder.indexOf(id);

    tabs[id].remove();
    delete tabs[id];
    tabOrder.splice(index, 1);

    releaseId(id);

    // Switch to next tab
    if (tabOrder.length > 0) {
        const nextId = tabOrder[Math.max(0, index - 1)];
        switchTab(nextId);
    }

    window.electronAPI.closeTab(index);
};

// Drag and Drop
let draggedId = null;
let dragOverTimeout = null;

tabbar.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.tab');
    if (!el) return;
    draggedId = parseInt(el.dataset.id);
    el.style.opacity = '0.5'; // visual feedback
});

tabbar.addEventListener('dragend', (e) => {
    const el = e.target.closest('.tab');
    if (el) el.style.opacity = '1';
    draggedId = null;
});

tabbar.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
});

tabbar.addEventListener('drop', (e) => {
    e.preventDefault();

    const targetEl = e.target.closest('.tab');
    if (!targetEl || draggedId === null) return;

    const targetId = parseInt(targetEl.dataset.id);
    if (draggedId === targetId) return;

    const fromIndex = tabOrder.indexOf(draggedId);
    const toIndex = tabOrder.indexOf(targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    // Reorder array
    tabOrder.splice(fromIndex, 1);
    tabOrder.splice(toIndex, 0, draggedId);

    // Reorder DOM
    const nextElement = toIndex < tabOrder.length - 1 ? tabs[tabOrder[toIndex + 1]] : addBtn;
    tabbar.insertBefore(tabs[draggedId], nextElement);

    window.electronAPI.reorderTabs(fromIndex, toIndex);

    draggedId = null;
});

// Event listeners
addBtn.addEventListener('click', () => createTab(), { passive: true });

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const isMac = document.body.classList.contains('darwin');
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key === 't') {
        e.preventDefault();
        createTab();
    }

    // Ctrl/Cmd + W
    if (modifier && e.key === 'w') {
        e.preventDefault();
        if (activeTabId !== null) {
            closeTab(activeTabId);
        }
    }
});

// console.log('Waiting for OS init...'); 

window.electronAPI.onInitOS((os) => {
    console.log('OS received:', os); 
    document.body.classList.add(os);
    console.log('Body classes:', document.body.className); 
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        createTab('Welcome');
    });
} else {
    createTab('Welcome');
}