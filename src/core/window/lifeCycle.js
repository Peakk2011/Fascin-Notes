import { unregisterTabShortcuts } from '../registerTabShortcuts.js';
import { saveTabsOnClose } from '../../arch/fileSystem.js';
import { initPostLoad } from '../../arch/redistributables.js';

/**
 * Sets up input event handlers for the window
 * Prevents Ctrl+W from closing window when multiple tabs are open
 * @param {BrowserWindow} mainWindow
 * @param {TabManager} tabManager
 */
export const setupInputHandlers = (mainWindow, tabManager) => {
    setImmediate(() => {
        mainWindow.webContents.on('before-input-event', (event, input) => {
            const tabCount = tabManager?.tabs?.length || 0;
            
            if ((input.control || input.meta) && input.key.toLowerCase() === 'w') {
                if (tabCount > 1) {
                    event.preventDefault();
                }
            }
        });
    });
};

/**
 * Sets up the close handler to save tabs before closing
 * @param {BrowserWindow} mainWindow
 * @param {TabManager} tabManager
 * @param {TabStorage} tabStorage
 * @param {IpcManager} ipcManager
 */
export const setupCloseHandler = (mainWindow, tabManager, tabStorage, ipcManager) => {
    const handleClose = () => saveTabsOnClose(
        tabManager,
        tabStorage,
        ipcManager
    );

    mainWindow.on('close', handleClose);
    return handleClose;
};

/**
 * Sets up cleanup handlers when window is closed
 * @param {BrowserWindow} mainWindow
 * @param {TabChangeListener} tabChangeListener
 * @param {IpcManager} ipcManager
 * @param {TabManager} tabManager
 * @param {Function} handleClose
 */
export const setupCleanup = (mainWindow, tabChangeListener, ipcManager, tabManager, handleClose) => {
    mainWindow.once('closed', () => {
        tabChangeListener.stop();
        unregisterTabShortcuts();
        ipcManager.cleanup();
        tabManager.destroy();
        
        mainWindow.removeListener(
            'close',
            handleClose
        );
    });
};

/**
 * Sets up post-initialization operations after DOM is ready
 * @param {BrowserWindow} mainWindow
 * @param {TabManager} tabManager
 * @param {TabStorage} tabStorage
 * @param {IpcManager} ipcManager
 * @param {Object|null} cachedAppState
 * @param {number} startTime
 */
export const setupPostInitOperations = (
    mainWindow,
    tabManager,
    tabStorage,
    ipcManager,
    cachedAppState,
    startTime
) => {
    mainWindow.webContents.once('dom-ready', () => {
        console.log(`DOM ready: ${Date.now() - startTime}ms`);

        if (!cachedAppState) {
            setImmediate(() => {
                console.log('Saving deferred welcome tab');
                
                saveTabsOnClose(
                    tabManager,
                    tabStorage,
                    ipcManager
                );
            });
        }

        // Heavy operations after DOM is ready
        setImmediate(() => initPostLoad(
            mainWindow,
            tabManager,
            ipcManager,
            cachedAppState,
            startTime
        ));
    });
};