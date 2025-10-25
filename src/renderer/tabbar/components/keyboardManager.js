export class KeyboardManager {
    constructor(tabManager) {
        this.tabManager = tabManager;
    }

    init() {
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    handleKeydown(e) {
        const isMac = document.body.classList.contains('darwin');
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (modifier && e.code === 'KeyT') {
            e.preventDefault();
            this.tabManager.createTab();
        }

        if (modifier && e.code === 'KeyW') {
            e.preventDefault();
            const activeId = this.tabManager.getActiveTabId();
            if (activeId !== null) {
                this.tabManager.closeTab(activeId);
            }
        }
    }
}