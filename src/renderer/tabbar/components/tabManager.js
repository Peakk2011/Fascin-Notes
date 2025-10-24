export class TabManager {
    constructor(tabbar, addBtn) {
        this.tabbar = tabbar;
        this.addBtn = addBtn;
        this.tabs = [];
        this.tabOrder = [];
        this.freeIds = [];
        this.nextId = 1;
        this.activeTabId = null;
    }

    getNewId() {
        return this.freeIds.length > 0 ? this.freeIds.shift() : this.nextId++;
    }

    releaseId(id) {
        this.freeIds.push(id);
        this.freeIds.sort((a, b) => a - b);
    }

    createTabElement(id, title) {
        const tabEl = document.createElement('div');
        tabEl.classList.add('tab', 'tab-merge-animation');
        tabEl.setAttribute('draggable', 'true');
        tabEl.dataset.id = id;

        const titleSpan = document.createElement('span');
        titleSpan.textContent = title;
        titleSpan.classList.add('tab-title');

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.classList.add('close');

        tabEl.appendChild(titleSpan);
        tabEl.appendChild(closeBtn);
        return tabEl;
    }

    createTab(title = 'New Tab', setActive = true) {
        const isSmallScreen = window.innerWidth <= 600;
        const tabLimit = 7;

        if (isSmallScreen && this.tabOrder.length >= tabLimit) {
            // Tab Limit for Screen that lower than 600px (default window settings)
            alert('Please resize your screen to create more tabs.');
            return;
        }

        const id = this.getNewId();
        const tabEl = this.createTabElement(id, title);

        // Event listeners
        tabEl.querySelector('.close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(id);
        }, { passive: true });

        tabEl.addEventListener('click', () => this.switchTab(id), { passive: true });

        tabEl.addEventListener('animationend', () => {
            tabEl.classList.remove('tab-merge-animation');
        }, { once: true });

        // Add to DOM and state
        this.tabbar.insertBefore(tabEl, this.addBtn);
        this.tabs[id] = tabEl;
        this.tabOrder.push(id);

        // Set active if setActive come to true
        if (setActive) {
            this.switchTab(id);
        }

        window.electronAPI.newTab(title);

        return id;
    }

    switchTab(id) {
        if (!this.tabs[id] || this.activeTabId === id) return;

        setTimeout(() => {
            Object.values(this.tabs).forEach(t => {
                if (t) t.classList.remove('active');
            });

            if (this.tabs[id]) {
                this.tabs[id].classList.add('active');
                this.activeTabId = id;

                const index = this.tabOrder.indexOf(id);
                window.electronAPI.switchTab(index);
            }
        }, 10);
    }

    closeTab(id) {
        if (!this.tabs[id]) return;

        const index = this.tabOrder.indexOf(id);
        const tabEl = this.tabs[id];

        tabEl.classList.add('tab-closing-animation');

        const onAnimationEnd = () => {
            tabEl.removeEventListener('animationend', onAnimationEnd);
            tabEl.remove();
            delete this.tabs[id];
            this.tabOrder.splice(index, 1);
            this.releaseId(id);

            if (this.tabOrder.length === 0) {
                console.log('Last tab closed, closing app');
                window.electronAPI.closeApp();
                return;
            }

            // Switch to next tab
            const nextId = this.tabOrder[Math.max(0, index - 1)];
            console.log('Switching to next tab:', nextId);
            this.switchTab(nextId);

            window.electronAPI.closeTab(index);
        };

        tabEl.addEventListener('animationend', onAnimationEnd, { once: true });
    }

    reorderTabs(fromIndex, toIndex) {
        const id = this.tabOrder[fromIndex];
        this.tabOrder.splice(fromIndex, 1);
        this.tabOrder.splice(toIndex, 0, id);

        const draggedTab = this.tabs[id];
        const nextElement = toIndex < this.tabOrder.length - 1 ?
            this.tabs[this.tabOrder[toIndex + 1]] : this.addBtn;

        this.tabbar.insertBefore(draggedTab, nextElement);

        // Animation
        draggedTab.classList.add('tab-merge-animation');
        draggedTab.addEventListener('animationend', () => {
            draggedTab.classList.remove('tab-merge-animation');
        }, { once: true });

        window.electronAPI.reorderTabs(fromIndex, toIndex);
    }

    getTabOrder() {
        return [...this.tabOrder];
    }

    getActiveTabId() {
        return this.activeTabId;
    }

    updateTabTitle(id, newTitle) {
        if (this.tabs[id]) {
            const titleSpan = this.tabs[id].querySelector('.tab-title');
            titleSpan.textContent = newTitle;
        }
    }

    closeApp() {
        window.electronAPI.closeApp();
    }
}