// page.js
// This file is part of Fascin-Notes
// Use for index.html renderer (frontend)

import { noteFeatures } from '../scripts/note.js';

export const Page = {
    markups: `
        <div class="status">
            <div
                class="dot"
                id="saveIndicator">
            </div>
            <span id="statusText">Saved</span>
        </div>

        <div class="textarea-container">
            <textarea id="autoSaveTextarea" placeholder="Start write your texts here" spellcheck="false"></textarea>

            <div class="zoom-controls">
                <button
                    onclick="resetZoom()"
                    id="reset-zoom"
                    title="Reset Zoom">
                    <span>Reset Text Sizes</span>
                </button>
            </div>
        </div>
    `,

    async init() {
        try {
            const noteAPI = await noteFeatures();

            if (!noteAPI) {
                throw new Error('Failed to initialize note features');
            }

            // Reset zoom button
            const resetBtn = document.getElementById('reset-zoom');
            
            if (resetBtn) {
                resetBtn.addEventListener('click', async () => {
                    try {
                        await noteAPI.resetZoom();
                    } catch (error) {
                        console.error('Error resetting zoom:', error);
                    }
                });
            }

            return noteAPI;
        } catch (error) {
            console.log('Error in Page.init:', error);
            return null;
        }
    }
}