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
};

const createTab = (title = `Tab ${nextId}`) => {
    const id = getNewId();
    const tabEl = document.createElement('div');

    tabEl.classList.add('tab');
    tabEl.textContent = title;
    tabEl.dataset.id = id;

    // "X" button
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.classList.add('close');
    closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeTab(id);
    });

    tabEl.appendChild(closeBtn);
    tabEl.addEventListener('click', () => {
        switchTab(id)
    });

    tabbar.insertBefore(tabEl, addBtn);
    tabs[id] = tabEl;
    tabOrder.push(id);
    switchTab(id);

    window.electronAPI.newTab(title);
}

const switchTab = (id) => {
    if (!tabs[id]) { return; }

    Object.values(tabs)
        .forEach(
            t => t.classList.remove('active')
        );

    tabs[id].classList.add('active');
    activeTabId = id;
    window.electronAPI.switchTab(tabOrder.indexOf(id));
}

const closeTab = (id) => {
    if (!tabs[id]) { return; }
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
}

// Drag and Drop

let draggedId = null;

tabbar.addEventListener('dragstart', (e) => {
    const el = e.target.closest('.tab');
    if (!el) return;
    draggedId = parseInt(el.dataset.id);
});

tabbar.addEventListener('dragover', (e) => {
    e.preventDefault();
});

tabbar.addEventListener('drop', e => {
    const targetEl = e.target.closest('.tab');
    if (!targetEl || draggedId === null) { return; }

    const targetId = parseInt(targetEl.dataset.id);
    const fromIndex = tabOrder.indexOf(draggedId);
    const toIndex = tabOrder.indexOf(targetId);

    if (fromIndex === toIndex) { return; }

    // Reorder array
    tabOrder.splice(fromIndex, 1);
    tabOrder.splice(toIndex, 0, draggedId);

    // Reorder DOM
    tabbar.insertBefore(
        tabs[draggedId], tabs[toIndex + 1] || addBtn
    );

    window.electronAPI.reorderTabs(fromIndex, toIndex);

    draggedId = null;
});

addBtn.addEventListener('click', () => { createTab(); });

document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 't') createTab();
});

createTab('Welcome');