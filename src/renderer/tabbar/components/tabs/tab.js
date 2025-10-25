export class Tab {
    constructor(id, title) {
        this.id = id;
        this.title = title;
        this.element = null;
        this.isActive = false;

        // Callbacks
        this.onClose = null;
        this.onClick = null;

        this.create();
    }

    create() {
        const tabEl = document.createElement('div');
        tabEl.classList.add('tab', 'tab-merge-animation');
        tabEl.setAttribute('draggable', 'true');
        tabEl.dataset.id = this.id.toString();

        const titleSpan = document.createElement('span');
        titleSpan.textContent = this.title || 'New Tab';
        titleSpan.classList.add('tab-title');

        const closeBtn = document.createElement('span');
        closeBtn.textContent = '×';
        closeBtn.classList.add('close');
        closeBtn.setAttribute('aria-label', 'Close tab');

        tabEl.appendChild(titleSpan);
        tabEl.appendChild(closeBtn);

        this.element = tabEl;
        this.attachListeners(closeBtn);
    }

    attachListeners(closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (this.onClose) {
                this.onClose(this.id);
            }
        }, { passive: false });

        this.element.addEventListener('click', (e) => {
            e.preventDefault();
            if (this.onClick) {
                this.onClick(this.id);
            }
        }, { passive: false });

        this.element.addEventListener('animationend', () => {
            this.element.classList.remove('tab-merge-animation');
        }, { once: true });
    }

    setActive(active) {
        this.isActive = active;
        if (active) {
            this.element.classList.add('active');
        } else {
            this.element.classList.remove('active');
        }
    }

    updateTitle(newTitle) {
        if (!newTitle) return;

        this.title = newTitle;
        const titleSpan = this.element.querySelector('.tab-title');
        if (titleSpan) {
            titleSpan.textContent = newTitle;
        }
    }

    async close() {
        return new Promise((resolve) => {
            this.element.classList.add('tab-closing-animation');
            this.element.addEventListener('animationend', () => {
                this.element.remove();
                resolve();
            }, { once: true });
        });
    }

    addMergeAnimation() {
        this.element.classList.add('tab-merge-animation');
        this.element.addEventListener('animationend', () => {
            this.element.classList.remove('tab-merge-animation');
        }, { once: true });
    }

    getElement() {
        return this.element;
    }

    getInfo() {
        return {
            id: this.id,
            title: this.title,
            isActive: this.isActive
        };
    }
}