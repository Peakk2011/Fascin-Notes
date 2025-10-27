import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export class TabStorage {
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

    async ensureStroageDir() {
        try {
            await fs.mkdir(
                this.storageDir,
                {
                    recursive: true
                }
            )
        } catch (error) {
            console.error(
                'Error creating stroage directory',
                error
            );
        }
    }

    async saveTabs(tabs) {
        try {
            await this.ensureStroageDir();

            const tabsData = tabs.map(tab => ({
                title: tab.title,
                url: tab.url || '',
                isActive: tab.isActive || false,
                // You can add more fields here
            }));

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
                `Saved ${tabs.length} tabs to ${this.storageFile}`
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

    async loadTabs() {
        try {
            const fileContent = await fs.readFile(
                this.storageFile,
                'utf-8'
            );
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

    async getStoragePath() {
        return this.storageFile;
    }
}

/*
    UPDATE Mon/27/10/2025
    This file is part of Fascin-Notes
    Use for storage the tabs
    But it not connect the renderer side
*/