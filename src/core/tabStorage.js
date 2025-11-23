import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { safeLog, safeError } from '../utils/safeLogger.js';

/**
 * Handles the persistent storage of tab data to the file system.
 * It saves tab information, including titles, URLs, and content, to a JSON file,
 * allowing the application to restore sessions.
 */
export class TabStorage {
    /**
     * Initializes the TabStorage instance by defining the storage directory and file path
     * within the user's application data folder.
     */
    constructor() {
        this.storageDir = path.join(
            app.getPath('userData'),
            'tabs'
        );
        this.storageFile = path.join(
            this.storageDir,
            'tabs.json'
        );
    }

    /**
     * Ensures that the directory for storing tab data exists.
     * If the directory does not exist, it will be created recursively.
     * @private
     * @async
     * @returns {Promise<void>}
     */
    async ensureStorageDir() {
        try {
            await fs.mkdir(
                this.storageDir,
                {
                    recursive: true
                }
            )
        } catch (error) {
            safeError(
                'Error creating storage directory',
                error
            );
        }
    }

    /**
     * Saves the state of all open tabs to a JSON file.
     * For each tab, it extracts the current text content from its BrowserView.
     * @param {Array<object>} tabs - An array of tab objects from the TabManager.
     * @param {object|null} [activeTab=null] - The currently active tab object.
     * @returns {Promise<boolean>} A promise that resolves to true if saving was successful, false otherwise.
     */
    async saveTabs(tabs, activeTab = null) {
        try {
            const tabsToSave = Array.isArray(tabs) ? tabs : [];

            if (tabsToSave.length === 0) {
                safeLog(
                    'Attempted to save an empty array of tabs. Aborting to prevent data loss.'
                );
                return false;
            }

            await this.ensureStorageDir();

            safeLog('saveTabs called with:', {
                tabCount: tabsToSave.length,
                tabs: tabsToSave.map(t => t.title)
            });

            const tabsDataPromises = tabsToSave.map(async (tab) => {
                // Support both full tab objects and pre-serialized objects
                const id = tab.id || tab.tabId || null;
                const title = tab.title || '';
                const url = tab.url || '';

                // Determine isActive by comparing ids when possible, otherwise fallback to object identity
                let isActive = false;
                try {
                    const activeId = activeTab ? (activeTab.tabId || activeTab.id || null) : null;
                    if (activeId && id) {
                        isActive = activeId === id;
                    } else {
                        isActive = tab === activeTab;
                    }
                } catch (e) {
                    isActive = tab === activeTab;
                }

                // Prefer already provided content on the object; otherwise try to read from BrowserView if present
                let content = '';
                if (typeof tab.content === 'string' && tab.content.length >= 0) {
                    content = tab.content;
                } else if (tab.view && tab.view.webContents && !tab.view.webContents.isDestroyed() && !tab.url) {
                    try {
                        content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""'
                        );
                    } catch (e) {
                        safeLog(`Could not get content for "${title}":`, e.message);
                    }
                } else {
                    content = tab.contentToLoad || '';
                }

                return {
                    id,
                    title,
                    url,
                    isActive,
                    content,
                };
            });

            const tabsData = await Promise.all(tabsDataPromises);

            const data = {
                version: '1.0',
                savedAt: new Date().toISOString(),
                tabs: tabsData
            };

            await fs.writeFile(
                this.storageFile,
                JSON.stringify(
                    data,
                    null,
                    2
                ),
                'utf-8'
            );

            // Check that is real save 
            safeLog(
                `Saved ${tabsToSave.length} tabs to ${this.storageFile}`
            );
            return true;
        } catch (error) {
            safeError(
                'Error saving tabs:',
                error
            );
            return false;
        }
    }

    /**
     * Loads tab data from the JSON storage file.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of saved tab data objects.
     * Returns an empty array if the file doesn't exist or an error occurs.
     */
    async loadTabs() {
        try {
            const fileContent = await fs.readFile(
                this.storageFile,
                'utf-8'
            );
            const data = JSON.parse(fileContent);

            safeLog(`Loaded ${data.tabs.length} tabs from storage`);
            return data.tabs || [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                safeLog('No saved tabs found');
            } else {
                safeError(
                    'Error loading tabs:',
                    error
                );
            }
            return [];
        }
    }

    /**
     * Deletes the tab storage file, effectively clearing all saved tab data.
     * @returns {Promise<boolean>} A promise that resolves to true if the file was cleared successfully
     * or if it didn't exist. Resolves to false on error.
     */
    async clearTabs() {
        try {
            await fs.unlink(this.storageFile);
            safeLog('Cleared saved tabs');
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true;
            }
            safeError(
                'Error clearing tabs:',
                error
            );
            return false;
        }
    }

    /**
     * Gets the full path to the storage file.
     * @returns {Promise<string>} A promise that resolves with the storage file path.
     */
    async getStoragePath() {
        return this.storageFile;
    }
}