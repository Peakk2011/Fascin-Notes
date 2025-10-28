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

    async saveTabs(tabs, activeTab = null) {
        try {
            await this.ensureStorageDir();

            const tabsData = tabs.map(tab => ({
                title: tab.title,
                url: tab.url || '',
                isActive: tab === activeTab,
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
    UPDATE 28/10/2025
    This file is part of Fascin-Notes
    Use for storage the tabs
    But when it close it not sync I will fix it tomorrow
    ปัญหามันคือการที่มัน sync เข้ามาแล้วแต่ไม่ทันที ต้อง new tabs ก่อนถึงจะเห็น
*/