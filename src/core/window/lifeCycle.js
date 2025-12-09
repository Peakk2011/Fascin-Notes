/**
 * Sets up cleanup handlers when window is closed
 * @param {BrowserWindow} mainWindow
 * @param {IpcManager} ipcManager
 */
export const setupCleanup = (mainWindow, ipcManager) => {
    mainWindow.once('closed', () => {
        ipcManager.cleanup();
    });
};