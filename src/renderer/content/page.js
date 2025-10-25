// page.js
// This file is part of Fascin-Notes
// Use for index.html renderer (frontend)

import { noteFeatures } from '../scripts/note.js';
import { fetchJSON } from '../../utils/fetch.js';
import { createModelFind } from './contentComponents/model/modelFind.js';

export const Page = {
    async markups() {
        const config = await fetchJSON(
            'renderer/content/pageConfig.json'
        );
        const modelFind = await createModelFind();
        
        return `
            <div class="${config.statusContainerClass}">
                <div
                    class="${config.saveIndicatorClass}"
                    id="${config.saveIndicatorId}">
                </div>
                <span id="${config.statusTextId}">${config.initialStatusText}</span>
            </div>
    
            <div class="${config.textareaContainerClass}">
                <textarea id="${config.textareaId}" placeholder="${config.textareaPlaceholder}" spellcheck="false"></textarea>
    
                <div class="${config.zoomControlsClass}">
                    <button
                        id="${config.resetZoomButtonId}"
                        title="${config.resetZoomButtonTitle}">
                        <span>${config.resetZoomButtonText}</span>
                    </button>
                </div>
            </div>
            
            ${modelFind.markups}
        `;
    },

    async init() {
        try {
            const config = await fetchJSON('renderer/content/pageConfig.json');
            const noteAPI = await noteFeatures();

            if (!noteAPI) {
                throw new Error('Failed to initialize note features');
            }

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

            // Initialize components
            const modelFind = await createModelFind();
            modelFind.init({ pageConfig: config, noteAPI });

            return noteAPI;
        } catch (error) {
            console.log('Error in Page.init:', error);
            return null;
        }
    }
}