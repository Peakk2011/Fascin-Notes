// `page.js` This file is part of Fascinate-Note (Renderer Side)

import { noteFeatures } from '../scripts/note.js';
import { createModelFind } from './contentComponents/model/modelFind.js';
import { createContextMenu } from './contentComponents/contextmenu/contextMenu.js';
import { getConfig } from './pageServices/configService.js';
import { createPageMarkup } from './pages/pageMarkup.js';
import { createTitlebar } from './pageComponents/titlebar.js';
import { initEditorPage } from './pages/editorPage.js';
import '../../api/cursor-behavior.js';

export const Page = {
    // Cache instances
    _modelFindCache: null,
    _contextMenuCache: null,
    _titlebarCache: null,

    async _getModelFind() {
        if (!this._modelFindCache) {
            this._modelFindCache = await createModelFind();
        }
        return this._modelFindCache;
    },

    async _getContextMenu() {
        if (!this._contextMenuCache) {
            this._contextMenuCache = await createContextMenu();
        }
        return this._contextMenuCache;  
    },

    async _getTitlebar() {
        // Only create titlebar in Electron environment
        if (window.electronAPI) {
            if (!this._titlebarCache) {
                this._titlebarCache = await createTitlebar();
            }
            return this._titlebarCache;
        }
        return null; // Return null if not in Electron
    },

    async markups() {
        const [config, modelFind, contextMenu, titlebar] = await Promise.all([
            getConfig(),
            this._getModelFind(),
            this._getContextMenu(),
            this._getTitlebar()
        ]);

        return createPageMarkup(config, modelFind, contextMenu, titlebar);
    },

    async init() {
        try {
            // Load in parallel (config already cached from markups())
            const [config, noteAPI, modelFind, contextMenu] = await Promise.all([
                getConfig(),
                noteFeatures(),
                this._getModelFind(),
                this._getContextMenu()
            ]);

            if (!noteAPI) {
                throw new Error('Failed to initialize note features');
            }

            const result = await initEditorPage(
                config,
                noteAPI,
                modelFind,
                contextMenu
            );

            return result.noteAPI;
        } catch (error) {
            console.log('Error in Page.init:', error);
            return null;
        }
    }
};