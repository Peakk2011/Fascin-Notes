export class DragManager {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.draggedEl = null;
        this.draggedId = null;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.lockedTop = 0;
        this.hasReordered = false;
        this.isDragging = false;
        this.dragThreshold = 5; // Drag 5 pixels first to begin
    }

    init(tabbar) {
        tabbar.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleMouseDown(e) {
        // If you press the close button or any other element that is not a tab do nothing
        if (e.target.closest('.close-btn') || e.target.closest('button')) {
            return;
        }

        const el = e.target.closest('.tab');
        if (!el) return;

        this.draggedEl = el;
        this.draggedId = parseInt(el.dataset.id);
        this.hasReordered = false;
        this.isDragging = false;

        const rect = el.getBoundingClientRect();
        this.startX = e.clientX;
        this.startY = rect.top;
        this.offsetX = e.clientX - rect.left;

        const parent = el.parentElement;
        const parentRect = parent.getBoundingClientRect();
        this.lockedTop = rect.top - parentRect.top;

        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.draggedEl) return;

        // Check this dragThreshold limit
        const distance = Math.abs(
            e.clientX - this.startX
        );

        if (!this.isDragging && distance < this.dragThreshold) {
            return; // Not dragging
        }

        // Start to drag
        if (!this.isDragging) {
            this.isDragging = true;
            this.startDrag();
        }

        // Position
        const parent = this.draggedEl.parentElement;
        const parentRect = parent.getBoundingClientRect();
        const newX = e.clientX - parentRect.left - this.offsetX;

        this.draggedEl.style.left = newX + 'px';
        this.draggedEl.style.top = this.lockedTop + 'px';

        this.checkReorder(e.clientX);
    }

    startDrag() {
        const allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(tab => {
            tab.style.transition = 'none';
        });

        const rect = this.draggedEl.getBoundingClientRect();
        const parent = this.draggedEl.parentElement;
        const parentRect = parent.getBoundingClientRect();

        // Save position while dragging
        this.originalLeft = rect.left - parentRect.left;
        this.originalTop = rect.top - parentRect.top;
        this.lockedTop = this.originalTop; // Lock

        // Elements
        this.draggedEl.style.position = 'absolute';
        this.draggedEl.style.zIndex = '9999';
        this.draggedEl.style.pointerEvents = 'none';
        this.draggedEl.style.opacity = '1';
        this.draggedEl.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
        this.draggedEl.style.left = this.originalLeft + 'px';
        this.draggedEl.style.top = this.lockedTop + 'px';
        this.draggedEl.style.width = rect.width + 'px';
    }

    handleMouseUp(e) {
        if (!this.draggedEl) return;

        // If you haven't dragged it (just clicked it) and do nothing
        if (!this.isDragging) {
            this.draggedEl = null;
            this.draggedId = null;
            return;
        }

        // If there is no reorder suck back to the original position
        if (!this.hasReordered) {
            const parent = this.draggedEl.parentElement;
            const parentRect = parent.getBoundingClientRect();
            const originalLeft = this.startX - this.offsetX - parentRect.left;

            this.draggedEl.style.transition = 'left 0.3s ease-out, opacity 0.3s ease-out';
            this.draggedEl.style.left = originalLeft + 'px';
            this.draggedEl.style.opacity = '0.5';

            setTimeout(() => {
                if (!this.draggedEl) return;
                this.resetDraggedElement();
            }, 300);
        } else {
            // If there is a reorder it will reset
            this.resetDraggedElement();
        }

        this.isDragging = false;
    }

    resetDraggedElement() {
        if (!this.draggedEl) return;

        // Enable transition, it done dragging
        const allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(tab => {
            tab.style.transition = '';
        });

        // Reset styles
        this.draggedEl.style.cssText = '';
        this.draggedEl = null;
        this.draggedId = null;
        this.hasReordered = false;
    }

    checkReorder(mouseX) {
        const tabs = Array.from(document.querySelectorAll('.tab'));
        const tabOrder = this.tabManager.getTabOrder();
        const currentIndex = tabOrder.indexOf(this.draggedId);

        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabId = parseInt(tab.dataset.id);

            if (tabId === this.draggedId) {
                continue;
            }

            const rect = tab.getBoundingClientRect();
            const tabCenterX = rect.left + rect.width / 2;

            if (mouseX < tabCenterX) {
                const targetIndex = tabOrder.indexOf(tabId);

                if (currentIndex !== targetIndex && currentIndex !== targetIndex - 1) {
                    let newIndex;
                    if (currentIndex < targetIndex) {
                        newIndex = targetIndex - 1;
                    } else {
                        newIndex = targetIndex;
                    }
                    this.tabManager.reorderTabs(currentIndex, newIndex);
                    this.hasReordered = true;
                }
                return;
            }
        }

        const lastIndex = tabOrder.length - 1;
        if (currentIndex !== lastIndex) {
            this.tabManager.reorderTabs(currentIndex, lastIndex);
            this.hasReordered = true;
        }
    }
}
