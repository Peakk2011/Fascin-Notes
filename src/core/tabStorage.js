import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

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
            console.error(
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
            await this.ensureStorageDir();

            const tabsDataPromises = tabsToSave.map(async (tab) => {
                let content = '';
                if (tab.view && !tab.url) {
                    try {
                        content = await tab.view.webContents.executeJavaScript(
                            'document.getElementById("autoSaveTextarea")?.value || ""'
                        );
                    } catch (e) {
                        console.error(
                            `Could not get content for tab "${tab.title}":`,
                            e.message
                        );
                    }
                }
                return {
                    title: tab.title,
                    url: tab.url || '',
                    isActive: tab === activeTab,
                    content: content,
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
            console.log(
                `Saved ${tabsToSave.length} tabs to ${this.storageFile}`
            );
            return true;
        } catch (error) {
            console.error(
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

            console.log(`Loaded ${data.tabs.length} tabs from storage`);
            return data.tabs || [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('No saved tabs found');
            } else {
                console.error(
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
            console.log('Cleared saved tabs');
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return true;
            }
            console.error(
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