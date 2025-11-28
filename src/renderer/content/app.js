// This file is part of Fascinate-Note
// Use for index.html renderer (frontend)

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
                    window.noteAPI = noteAPI;
                }
            } catch (error) {
                console.error('Failed to initialize Page:', error);
            }
        }
    });
};

App();