// page.js
// This file is part of Fascinate-Note
// Use for index.html renderer (frontend)

import { noteFeatures } from '../scripts/note.js';
import { fetchJSON } from '../../utils/fetch.js';
import { createModelFind } from './contentComponents/model/modelFind.js';
import { initRichEditor } from './rich.js';
import '../../api/cursor-behavior.js';

export const Page = {
    // Cache instances
    _modelFindCache: null,
    _configCache: null,

    async _getConfig() {
        if (!this._configCache) {
            this._configCache = await fetchJSON(
                'renderer/content/pageConfig.json'
            );
        }
        return this._configCache;
    },

    async _getModelFind() {
        if (!this._modelFindCache) {
            this._modelFindCache = await createModelFind();
        }
        return this._modelFindCache;
    },

    async markups() {
        const config = await this._getConfig();
        const modelFind = await this._getModelFind();

        return `
            <div class="${config.statusContainerClass}">
                <div
                    class="${config.saveIndicatorClass}"
                    id="${config.saveIndicatorId}">
                </div>
                <span id="${config.statusTextId}">${config.initialStatusText}</span>
            </div>
    
            <!--
                Currently, it not inserting Class ID data
                into the JSON in some <div>s that may be left behind.
            -->

            <div class="${config.textareaContainerClass}">
                <div id="${config.textareaId}" contenteditable="true" spellcheck="false" class="editable-div" data-placeholder="${config.textareaPlaceholder}"></div>
    
                <div class="${config.zoomControlsClass}">
                    <button id="format-bold" title="Bold">
                        <span>B</span>
                    </button>

                    <button id="format-italic" title="Italic">
                        <span style="font-style: italic;">I</span>
                    </button>

                    <button
                        id="${config.resetZoomButtonId}"
                        title="${config.resetZoomButtonTitle}">
                        <span>${config.resetZoomButtonText}</span>
                    </button>

                    <button id="${config.exportHtmlButtonId}" title="${config.exportHtmlButtonTitle}">
                        <span>${config.exportHtmlButtonText}</span>
                    </button>
                </div>
            </div>
            
            ${modelFind.markups}
        `;
    },

    async init() {
        try {
            // Load in parallel (config already cached from markups())
            const [config, noteAPI] = await Promise.all([
                this._getConfig(),
                noteFeatures()
            ]);

            if (!noteAPI) {
                throw new Error('Failed to initialize note features');
            }

            // Initialize rich editor component (placeholder overlay + format buttons)
            const rich = initRichEditor({
                editorId: config.textareaId,
                placeholderText: config.textareaPlaceholder,
                formatButtons: {
                    bold: 'format-bold',
                    italic: 'format-italic'
                }
            });

            window.rich = rich;

            // Setup event listeners
            requestAnimationFrame(() => {
                // Reset zoom button
                const resetBtn = document.getElementById(config.resetZoomButtonId);
                if (resetBtn) {
                    resetBtn.addEventListener('click', async () => {
                        try {
                            await noteAPI.resetZoom();
                        } catch (error) {
                            console.error('Error resetting zoom:', error);
                        }
                    });
                }

                // Export HTML button
                const exportBtn = document.getElementById(config.exportHtmlButtonId);
                if (exportBtn && rich) {
                    exportBtn.addEventListener('click', () => {
                        const filename = `note-${new Date().toISOString().slice(0, 10)}.html`;
                        rich.downloadHTML(filename);
                    });
                }
            });

            // Initialize model find component (use cached instance)
            const modelFind = await this._getModelFind();
            modelFind.init({ pageConfig: config, noteAPI });

            return noteAPI;
        } catch (error) {
            console.log('Error in Page.init:', error);
            return null;
        }
    }
}