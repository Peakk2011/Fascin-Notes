// This file is part of Fascin-Notes
// Use for index.html renderer (frontend)

import { Mint } from '../../framework/mint.js';
import { Page } from './page.js';

const rootPath = '#app';

const App = () => {
    const init = {
        html: Page.markups,
    };

    Mint.init(async () => {
        Mint.injectHTML(rootPath, init.html);

        if (Page.init) {
            try {
                const noteAPI = await Page.init();

                if (noteAPI) {
                    // expose API globally for debugging or external access
                    window.noteAPI = noteAPI;
                } else {
                    console.error('Note API initialization returned null');
                }
            } catch (error) {
                console.error('Failed to initialize Page:', error);
            }
        }
    });
};

App();