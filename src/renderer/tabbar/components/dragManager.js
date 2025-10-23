export class DragManager {
    constructor(tabManager) {
        this.tabManager = tabManager;
        this.draggedEl = null;
        this.draggedId = null;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.lockedTop = 0;
    }

    init(tabbar) {
        tabbar.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    handleMouseDown(e) {
        const el = e.target.closest('.tab');
        if (!el) return;

        this.draggedEl = el;
        this.draggedId = parseInt(el.dataset.id);
        
        // Disable the animations
        const allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(tab => {
            tab.style.transition = 'none';
        });
        
        const rect = el.getBoundingClientRect();
        this.startX = rect.left;
        this.startY = rect.top;
        this.offsetX = e.clientX - rect.left;

        el.style.position = 'absolute';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'none';
        el.style.opacity = '1'; 
        
        const parent = el.parentElement;
        const parentRect = parent.getBoundingClientRect();
        el.style.left = (rect.left - parentRect.left) + 'px';
        el.style.top = (rect.top - parentRect.top) + 'px';
        el.style.width = rect.width + 'px';

        e.preventDefault();
    }

    handleMouseMove(e) {
        if (!this.draggedEl) return;

        // relative to parent
        const parent = this.draggedEl.parentElement;
        const parentRect = parent.getBoundingClientRect();
        const newX = e.clientX - parentRect.left - this.offsetX;
        
        this.draggedEl.style.left = newX + 'px';
        this.draggedEl.style.top = (this.startY - parentRect.top) + 'px'; 

        this.checkReorder(e.clientX);
    }

    handleMouseUp(e) {
        if (!this.draggedEl) return;

        const allTabs = document.querySelectorAll('.tab');
        allTabs.forEach(tab => {
            tab.style.transition = '';
        });

        this.draggedEl.style.position = '';
        this.draggedEl.style.zIndex = '';
        this.draggedEl.style.pointerEvents = '';
        this.draggedEl.style.opacity = '';
        this.draggedEl.style.left = '';
        this.draggedEl.style.top = '';
        this.draggedEl.style.width = '';

        this.draggedEl = null;
        this.draggedId = null;
    }

    checkReorder(mouseX) {
        const tabs = Array.from(document.querySelectorAll('.tab'));
        const tabOrder = this.tabManager.getTabOrder();
        const currentIndex = tabOrder.indexOf(this.draggedId);
        
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabId = parseInt(tab.dataset.id);
            
            if (tabId === this.draggedId) continue;

            const rect = tab.getBoundingClientRect();
            const tabCenterX = rect.left + rect.width / 2;
            
            if (mouseX < tabCenterX) {
                const targetIndex = tabOrder.indexOf(tabId);
                
                if (currentIndex !== targetIndex && currentIndex !== targetIndex - 1) {
                    const newIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
                    this.tabManager.reorderTabs(currentIndex, newIndex);
                    
                    setTimeout(() => this.updateDraggedPosition(), 0);
                }
                return;
            }
        }
    
        const lastIndex = tabOrder.length - 1;
        if (currentIndex !== lastIndex) {
            this.tabManager.reorderTabs(currentIndex, lastIndex);
            setTimeout(() => this.updateDraggedPosition(), 0);
        }
    }

    updateDraggedPosition() {
        if (!this.draggedEl) return;
        
        const rect = this.draggedEl.getBoundingClientRect();
        const parent = this.draggedEl.parentElement;
        const parentRect = parent.getBoundingClientRect();
        
        this.startY = rect.top;
        this.startX = rect.left;
    }
}

/*
    UPDATE: 23/10/2025
    PROBLEM FOUND

    The Drag and Drop feature is currently unstable. We will fix it tomorrow.
    The problem is that you cannot manually close the tab, such as pressing
    the button and dragging, which is not as smooth as it should be.

*/