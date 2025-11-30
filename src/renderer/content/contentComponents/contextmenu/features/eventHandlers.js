import { debounce, addEventListener } from '../utils/domUtility.js';

/**
 * Setup submenu hover interactions
 * @param {Object} params - Setup parameters
 */
const setupSubmenuInteractions = ({ contextMenu, config, eventListeners }) => {
    const submenuTriggers = contextMenu.querySelectorAll('[aria-haspopup="true"]');

    submenuTriggers.forEach(trigger => {
        const submenu = trigger.querySelector(`.${config.submenuClass}`);
        if (!submenu) return;

        let showTimeout;
        let hideTimeout;
        let isMouseInTrigger = false;
        let isMouseInSubmenu = false;

        const showSubmenu = () => {
            if (trigger.getAttribute('aria-disabled') === 'true') {
                return;
            }

            clearTimeout(hideTimeout);

            showTimeout = setTimeout(() => {
                submenu.style.display = 'block';

                requestAnimationFrame(() => {
                    submenu.classList.add('visible');
                    trigger.setAttribute('aria-expanded', 'true');
                });
            }, 150);
        };

        const hideSubmenu = () => {
            clearTimeout(showTimeout);

            hideTimeout = setTimeout(() => {
                // ตรวจสอบว่า mouse ยังอยู่ใน trigger หรือ submenu หรือไม่
                if (!isMouseInTrigger && !isMouseInSubmenu) {
                    submenu.classList.remove('visible');
                    trigger.setAttribute('aria-expanded', 'false');

                    setTimeout(() => {
                        if (!isMouseInTrigger && !isMouseInSubmenu) {
                            submenu.style.display = 'none';
                        }
                    }, 200);
                }
            }, 100);
        };

        // Trigger events
        addEventListener(eventListeners, trigger, 'mouseenter', () => {
            isMouseInTrigger = true;
            showSubmenu();
        });

        addEventListener(eventListeners, trigger, 'mouseleave', () => {
            isMouseInTrigger = false;
            hideSubmenu();
        });

        // Submenu events
        addEventListener(eventListeners, submenu, 'mouseenter', () => {
            isMouseInSubmenu = true;
            clearTimeout(showTimeout);
            clearTimeout(hideTimeout);
        });

        addEventListener(eventListeners, submenu, 'mouseleave', () => {
            isMouseInSubmenu = false;
            hideSubmenu();
        });
    });
};

/**
 * Initialize all event listeners for the context menu
 * @param {Object} params - Initialization parameters
 */
export const initializeEventListeners = (params) => {
    const {
        textarea,
        contextMenu,
        config,
        stateManager,
        eventListeners,
        updateMenuState,
        showMenu,
        hideMenu,
        handleMenuItemClick,
        recordState,
        DEBOUNCE_DELAY = 300
    } = params;

    if (stateManager.isDestroyed()) return;

    // Context menu on textarea
    addEventListener(eventListeners, textarea, 'contextmenu', (e) => {
        try {
            updateMenuState();
            showMenu(e);
        } catch (error) {
            console.error(error);
        }
    });

    // Debounced input listener to record state after user stops typing
    const debouncedRecordState = debounce(() => {
        try {
            recordState(textarea.innerHTML);
        } catch (error) {
            console.warn(error);
        }
    }, DEBOUNCE_DELAY);

    addEventListener(eventListeners, textarea, 'input', debouncedRecordState);

    // Handle menu item clicks
    addEventListener(eventListeners, contextMenu, 'click', handleMenuItemClick);

    // Global events: hide on scroll/resize
    addEventListener(
        eventListeners,
        window,
        'scroll',
        debounce(() => hideMenu(), 100),
        { passive: true }
    );

    addEventListener(
        eventListeners,
        window,
        'resize',
        debounce(() => hideMenu(), 100)
    );

    // Hide on Escape key
    addEventListener(eventListeners, document, 'keydown', (e) => {
        if (e.key === 'Escape') hideMenu();
    });

    // Click outside menu to hide
    addEventListener(eventListeners, document, 'click', (e) => {
        if (stateManager.isDestroyed()) return;

        const clickedInside = e.target.closest && e.target.closest(`#${config.menuId}`);
        if (!clickedInside) hideMenu();
    });

    // Setup submenu interactions
    setupSubmenuInteractions({ contextMenu, config, eventListeners });
};