/**
 * Generate menu items HTML markup recursively
 * @param {Array} items - Menu items configuration
 * @param {Object} config - Menu configuration
 * @returns {string} HTML markup
 */
const generateMenuItems = (items, config) => {
    return items.map(item => {
        if (item.type === 'separator') {
            return `<div class="${config.separatorClass}"></div>`;
        }

        const shortcutMarkup = item.shortcut
            ? `<span class="${config.shortcutClass}">${item.shortcut}</span>`
            : '';

        const commandAttr = item.command ? `data-command="${item.command}"` : '';
        const valueAttr = item.value ? `data-value="${item.value}"` : '';

        if (item.submenu) {
            return `
                <div id="${item.id}" class="${config.itemClass}" role="menuitem" aria-haspopup="true" ${commandAttr}>
                    <span>${item.label}</span>
                    <div class="${config.submenuClass}">
                        ${generateMenuItems(item.submenu, config)}
                    </div>
                </div>
            `;
        }

        return `
            <div id="${item.id}" class="${config.itemClass}" role="menuitem" tabindex="-1" aria-disabled="false" ${commandAttr} ${valueAttr}>
                ${item.label}
                ${shortcutMarkup}
            </div>
        `;
    }).join('');
};

/**
 * Render complete menu markup
 * @param {Object} config - Menu configuration
 * @returns {string} Complete menu HTML
 */
export const renderMenu = (config) => {
    return `
        <div id="${config.menuId}" class="${config.menuClass}" role="menu">
            ${generateMenuItems(config.items, config)}
        </div>
    `;
};