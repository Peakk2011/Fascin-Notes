const MENU_OFFSET = 12;
const MENU_HIDE_DELAY = 0;

/**
 * Returns viewport padding based on the root font size.
 * @returns {number} - Padding in pixels.
 */
const getViewportPadding = () => {
    return parseFloat(
        getComputedStyle(
            document.documentElement
        ).fontSize
    ) * 1;
}

/**
 * Calculates the optimal position for the selection menu relative to the selection.
 * @param {DOMRect} selectionRect                   - Bounding rectangle of the selected text.
 * @param {HTMLElement} selectionMenu               - The menu element to position.
 * @returns {{left: number, top: number}}           - Coordinates for the menu in pixels.
 */
const calculateMenuPosition = (selectionRect, selectionMenu) => {
    const menuWidth = selectionMenu.offsetWidth;
    const menuHeight = selectionMenu.offsetHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const VIEWPORT_PADDING = getViewportPadding();

    let left = selectionRect.left + scrollX + (
        selectionRect.width - menuWidth
    ) / 2;

    let top = selectionRect.bottom + scrollY + MENU_OFFSET;

    if (left < scrollX + VIEWPORT_PADDING) {
        left = scrollX + VIEWPORT_PADDING;
    } else if (left + menuWidth > viewportWidth + scrollX - VIEWPORT_PADDING) {
        left = viewportWidth + scrollX - menuWidth - VIEWPORT_PADDING;
    }

    if (top + menuHeight > viewportHeight + scrollY - VIEWPORT_PADDING) {
        top = viewportHeight + scrollY - menuHeight - VIEWPORT_PADDING;
    }

    return { left, top };
}

/**
 * Updates the active state of all buttons in the selection menu based on current selection.
 * @param {HTMLElement} selectionMenu - The menu element containing formatting buttons.
 */
const updateButtonStates = (selectionMenu) => {
    const buttons = selectionMenu.querySelectorAll('button[data-command]');
    buttons.forEach(button => {
        const command = button.dataset.command;
        const value = button.dataset.value;

        if (command === 'formatBlock') {
            const blockValue = document.queryCommandValue(
                'formatBlock'
            ).toUpperCase();

            if (blockValue === value) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        } else if (document.queryCommandState(command)) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * Returns HTML markup string for the selection menu with formatting buttons.
 *
 * @returns {string} - HTML markup for selection menu.
 */
export const createSelectionMenuMarkup = () => {
    return `
        <div id="selection-menu" class="selection-menu">
            <button data-command="bold" title="Bold"><b>B</b></button>
            <button data-command="italic" title="Italic"><i>I</i></button>
            <button data-command="underline" title="Underline"><u>U</u></button>
            <span class="separator"></span>
            <button data-command="formatBlock" data-value="H1" title="Heading 1">H1</button>
            <button data-command="formatBlock" data-value="H2" title="Heading 2">H2</button>
            <button data-command="formatBlock" data-value="H3" title="Heading 3">H3</button>
            <span class="separator"></span>
            <button data-command="formatBlock" data-value="BLOCKQUOTE" title="Blockquote">" "</button>
            <span class="separator"></span>
            <button data-command="insertUnorderedList" title="Unordered List">• List</button>
            <button data-command="insertOrderedList" title="Ordered List">1. List</button>
        </div>
    `;
}

/**
 * Initializes the selection menu with event listeners for a given editor element.
 * @param {HTMLElement} editor                  - The editable container element.
 * @returns {{cleanup: function}}               - Object with a cleanup method to remove all event listeners.
 *
 * @example
 * const menuController = initSelectionMenu(editor);
 * // Later, to remove listeners:
 * menuController.cleanup();
 */
export const initSelectionMenu = (editor) => {
    const selectionMenu = document.getElementById('selection-menu');

    if (!editor || !selectionMenu) {
        return { cleanup: () => { } };
    }

    /**
     * Shows or hides the selection menu based on current selection.
     */
    const showSelectionMenu = () => {
        try {
            const selection = window.getSelection();

            if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
                selectionMenu.classList.remove('show');
                return;
            }

            const range = selection.getRangeAt(0);
            if (!editor.contains(range.commonAncestorContainer)) {
                selectionMenu.classList.remove('show');
                return;
            }

            const rect = range.getBoundingClientRect();
            const position = calculateMenuPosition(rect, selectionMenu);

            selectionMenu.style.left = `${position.left}px`;
            selectionMenu.style.top = `${position.top}px`;

            // Trigger reflow for CSS transitions
            void selectionMenu.offsetWidth;

            selectionMenu.classList.add('show');
            updateButtonStates(selectionMenu);
        } catch (error) {
            console.error('Error showing selection menu:', error);
            selectionMenu.classList.remove('show');
        }
    };

    /**
     * Handles clicks on the menu buttons and executes corresponding commands.
     * @param {MouseEvent} e - The click event.
     */
    const handleMenuClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const button = e.target.closest('button');
        if (!button) return;

        const command = button.dataset.command;
        const value = button.dataset.value || null;

        if (command === 'formatBlock') {
            try {
                const currentValue = document.queryCommandValue('formatBlock').toUpperCase();
                const newValue = (currentValue === value) ? 'P' : value;
                
                document.execCommand(
                    command,
                    false,
                    newValue
                );
            } catch (error) {
                console.error('Error executing formatBlock command:', error);
            }
        } else if (command) {
            try {
                const selection = window.getSelection();
                const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

                document.execCommand(command, false, value);

                if (range && selection.rangeCount === 0) {
                    selection.addRange(range);
                }
            } catch (error) {
                console.error('Error executing command:', error);
            }
        }

        setTimeout(showSelectionMenu, MENU_HIDE_DELAY);
    };

    /**
     * Handles editor blur event to hide the menu after a small delay.
     */
    const handleEditorBlur = () => {
        setTimeout(() => {
            if (!selectionMenu.matches(':hover')) {
                selectionMenu.classList.remove('show');
            }
        }, 100);
    };

    // Attach event listeners
    document.addEventListener(
        'selectionchange',
        showSelectionMenu
    );

    editor.addEventListener(
        'blur',
        handleEditorBlur
    );

    selectionMenu.addEventListener(
        'mousedown',
        handleMenuClick
    );

    return {
        cleanup() {
            document.removeEventListener(
                'selectionchange',
                showSelectionMenu
            );
            
            editor.removeEventListener(
                'blur',
                handleEditorBlur
            );

            selectionMenu.removeEventListener(
                'mousedown',
                handleMenuClick
            );
        }
    };
}
