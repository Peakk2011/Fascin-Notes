// This file is part of Fascin-Notes
// Use for index.html renderer (frontend)

/*
Use Mintkit to build and this why we built this:
    - Low bundle size
    - Lightweight and fully optimize on this application
    - Electron-optimized
*/

import { Mint } from '../../framework/mint.js';
import { Page } from './page.js';

const rootPath = '#app';

const App = () => {
    Mint.init(async () => {
        const html = await Page.markups();
        Mint.injectHTML(rootPath, html);

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