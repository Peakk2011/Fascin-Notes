export class KeyboardManager {
    constructor() {
        this.lastActionTime = 0;
        this.throttleDelay = 500;
        this.isInitialized = false;
        this.boundHandler = null;
    }

    init() {
        if (this.isInitialized) {
            console.warn('KeyboardManager already initialized');
            return;
        }

        this.boundHandler = (e) => this.handleKeydown(e);
        document.addEventListener(
            'keydown',
            this.boundHandler
        );
        this.isInitialized = true;
        console.log('KeyboardManager initialized');
    }

    destroy() {
        if (this.boundHandler) {
            document.removeEventListener(
                'keydown',
                this.boundHandler
            );
            this.boundHandler = null;
            this.isInitialized = false;
        }
    }

    canExecute() {
        const now = Date.now();
        if (now - this.lastActionTime < this.throttleDelay) {
            return false;
        }
        this.lastActionTime = now;
        return true;
    }

    handleKeydown(e) {
        if (e.repeat) {
            return;
        }

        if (!window.electronAPI || !window.electronAPI.sendShortcut) {
            console.warn('electronAPI not available');
            return;
        }

        const isMac = document.body.classList.contains('darwin');
        let modifier;
        if (isMac) {
            modifier = e.metaKey;
        } else {
            modifier = e.ctrlKey;
        }

        // Ctrl/Cmd + T - New Tab
        if (modifier && e.code === 'KeyT') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!this.canExecute()) {
                return;
            }
            console.log('Frontend: Sending new-tab');
            window.electronAPI.sendShortcut(
                { type: 'new-tab' }
            );
            return;
        }

        // Ctrl/Cmd + W - Close Current Tab
        if (modifier && e.code === 'KeyW') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!this.canExecute()) {
                return;
            }
            console.log('Frontend: Sending close-tab');
            window.electronAPI.sendShortcut(
                { type: 'close-tab' }
            );
            return;
        }

        // Ctrl + Tab - Next Tab
        if (e.ctrlKey && e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!this.canExecute()) {
                return;
            }
            console.log('Frontend: Sending next-tab');
            window.electronAPI.sendShortcut(
                { type: 'next-tab' }
            );
            return;
        }

        // Ctrl + Shift + Tab - Previous Tab
        if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!this.canExecute()) {
                return
            };
            console.log('Frontend: Sending prev-tab');
            window.electronAPI.sendShortcut(
                { type: 'prev-tab' }
            );
            return;
        }

        // Ctrl/Cmd + 1-8 - Switch to specific tab
        if (modifier && e.key >= '1' && e.key <= '8') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!this.canExecute()) {
                return;
            }
            const index = parseInt(e.key) - 1;
            console.log('Frontend: Sending switch-to-index', index);
            window.electronAPI.sendShortcut({
                type: 'switch-to-index',
                index
            });
            return;
        }

        // Ctrl/Cmd + 9 - Switch to last tab
        if (modifier && e.key === '9') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!this.canExecute()) {
                return;
            }
            console.log('Frontend: Sending switch-to-last');
            window.electronAPI.sendShortcut(
                { type: 'switch-to-last' }
            );
            return;
        }
    }
}