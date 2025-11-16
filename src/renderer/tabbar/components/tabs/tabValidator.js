export class TabValidator {
    constructor() {
        this.rules = {
            maxTabsSmallScreen: 7,
            smallScreenWidth: 600,
            maxTitleLength: 50
        };
    }

    canCreateTab(currentTabCount) {
        const screenWidth = window.innerWidth;
        const isSmallScreen = screenWidth <= this.rules.smallScreenWidth;

        // console.log('Validation Check:', {
        //     screenWidth,
        //     isSmallScreen,
        //     currentTabCount,
        //     maxAllowed: this.rules.maxTabsSmallScreen
        // });

        if (isSmallScreen && currentTabCount >= this.rules.maxTabsSmallScreen) {
            // console.warn('Cannot create tab: limit reached');
            return {
                valid: false,
                reason: `Maximum ${this.rules.maxTabsSmallScreen} tabs allowed\nPlease resize this window.`
            };
        }

        return { valid: true };
    }

    validateTitle(title) {
        if (!title || title.trim().length === 0) {
            return {
                valid: false,
                reason: 'Title cannot be empty',
                sanitized: 'New Tab'
            };
        }

        const sanitized = title.trim().slice(0, this.rules.maxTitleLength);

        return {
            valid: true,
            sanitized
        };
    }

    validateTabIndex(index, maxIndex) {
        return index >= 0 && index < maxIndex;
    }

    validateReorder(fromIndex, toIndex, maxIndex) {
        return (
            this.validateTabIndex(fromIndex, maxIndex) &&
            this.validateTabIndex(toIndex, maxIndex)
        );
    }

    isSmallScreen() {
        return window.innerWidth <= this.rules.smallScreenWidth;
    }

    updateRules(newRules) {
        this.rules = { ...this.rules, ...newRules };
    }

    // Helper Method
    getRemainingTabsAllowed() {
        const isSmallScreen = this.isSmallScreen();
        if (!isSmallScreen) return Infinity;

        return this.rules.maxTabsSmallScreen;
    }
}