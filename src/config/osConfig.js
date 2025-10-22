import { resolvePath  } from '../utils/paths.js';

export const OS = process.platform;

export const osConfig = {
    win32: {
        name: 'Windows',
        iconPath: resolvePath('../../assets/icons/icon.ico'),
        setup: win => win.setMenuBarVisibility(false),
    },
    darwin: {
        name: 'macOS',
        iconPath: resolvePath('../../assets/icons/icon.icns'),
        setup: win => win.setVibrancy('sidebar'),
    },
    linux: {
        name: 'Linux',
        iconPath: resolvePath('../../assets/icons/icon.png'),
        setup: () => {},
    }
};