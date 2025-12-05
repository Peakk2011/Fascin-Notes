/**
 * Hide the context menu with transition
 * @param {Object} params - Hide parameters
 */
export const hideMenu = ({ contextMenu, stateManager, config }) => {
    if (stateManager.isDestroyed()) return;
    if (!stateManager.isVisible()) return;

    contextMenu.classList.remove(config.visibleClass);
    stateManager.setVisible(false);

    const handleTransitionEnd = () => {
        if (!stateManager.isVisible()) {
            contextMenu.style.display = 'none';
        }

        // Show selection-menu when context menu is hidden
        const selectionMenu = document.querySelector('.selection-menu');
        if (selectionMenu) {
            selectionMenu.style.display = '';
        }
        contextMenu.removeEventListener('transitionend', handleTransitionEnd);
    };

    contextMenu.addEventListener('transitionend', handleTransitionEnd);
};

/**
 * Show menu at mouse position with boundary detection
 * @param {Object} params - Show parameters
 */
export const showMenu = ({ event, contextMenu, stateManager, config, MENU_OFFSET = 5 }) => {
    try {
        if (stateManager.isDestroyed()) return;
        event.preventDefault();

        // Hide selection-menu when context menu is shown
        const selectionMenu = document.querySelector('.selection-menu');
        if (selectionMenu) {
            selectionMenu.style.display = 'none';
        }

        contextMenu.style.display = 'block';
        stateManager.setVisible(true);

        const { clientX: mouseX, clientY: mouseY } = event;
        const { innerWidth, innerHeight } = window;
        const menuDimensions = contextMenu.getBoundingClientRect();

        // Find the first menu item to align the mouse cursor with it
        const firstItem = contextMenu.querySelector('[role="menuitem"]');
        let itemOffsetY = 0;
        let itemOffsetX = 0;

        if (firstItem) {
            const itemRect = firstItem.getBoundingClientRect();
            itemOffsetY = itemRect.top - menuDimensions.top + (itemRect.height / 2);
            itemOffsetX = 20;
        }

        let top = mouseY - itemOffsetY;
        let left = mouseX - itemOffsetX;

        // Adjust position to prevent overflow
        if (mouseY + menuDimensions.height > innerHeight) {
            top = innerHeight - menuDimensions.height - MENU_OFFSET;
        }
        if (mouseX + menuDimensions.width > innerWidth) {
            left = innerWidth - menuDimensions.width - MENU_OFFSET;
        }

        contextMenu.style.top = `${top}px`;
        contextMenu.style.left = `${left}px`;

        requestAnimationFrame(() => {
            contextMenu.classList.add(config.visibleClass);
        });
    } catch (error) {
        console.error('[ContextMenu] showMenu failed', error);
    }
};