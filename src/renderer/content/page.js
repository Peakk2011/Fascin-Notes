// page.js
// This file is part of Fascinate-Note
// Use for index.html renderer (frontend)

import { noteFeatures } from '../scripts/note.js';
import { fetchJSON } from '../../utils/fetch.js';
import { createModelFind } from './contentComponents/model/modelFind.js';
import { createContextMenu } from './contentComponents/contextmenu/contextMenu.js';
import { initRichEditor } from './rich.js';
import { translate } from '../../api/translate/translator.js';
import '../../api/cursor-behavior.js';

export const Page = {
    // Cache instances
    _modelFindCache: null,
    _contextMenuCache: null,
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

    async _getContextMenu() {
        if (!this._contextMenuCache) {
            this._contextMenuCache = await createContextMenu();
        }
        return this._contextMenuCache;
    },

    async markups() {
        const [config, modelFind, contextMenu] = await Promise.all([
            this._getConfig(),
            this._getModelFind(),
            this._getContextMenu()
        ]);

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
                    <button
                        id="${config.resetZoomButtonId}"
                        title="${config.resetZoomButtonTitle}">
                        <span>${config.resetZoomButtonText}</span>
                    </button>

                    <div class="export-container">
                        <button id="${config.exportHtmlButtonId}" title="${config.exportHtmlButtonTitle}">
                            <span>${config.exportHtmlButtonText}</span>
                        </button>
                        <div id="export-menu" class="export-menu">
                            <button id="export-html">${config.exportMenuHtmlText}</button>
                            <button id="export-txt">${config.exportMenuTxtText}</button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="selection-menu" class="selection-menu">
                <button data-command="bold" title="Bold"><b>B</b></button>
                <button data-command="italic" title="Italic"><i>I</i></button>
                <button data-command="underline" title="Underline"><u>U</u></button>
                <span class="separator"></span>
                <button data-command="formatBlock" data-value="H1" title="Heading 1">H1</button>
                <button data-command="formatBlock" data-value="H2" title="Heading 2">H2</button>
                <button data-command="formatBlock" data-value="H3" title="Heading 3">H3</button>
                <span class="separator"></span>
                <button data-command="formatBlock" data-value="BLOCKQUOTE" title="Blockquote">“ ”</button>
                <span class="separator"></span>
                <button data-command="insertUnorderedList" title="Unordered List">• List</button>
                <button data-command="insertOrderedList" title="Ordered List">1. List</button>
            </div>
            
            ${modelFind.markups}
            ${contextMenu.markups}
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

            // Initialize rich editor component
            const rich = initRichEditor({
                editorId: config.textareaId,
                placeholderText: config.textareaPlaceholder
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
                const exportMenu = document.getElementById('export-menu');
                const exportHtmlBtn = document.getElementById('export-html');
                const exportTxtBtn = document.getElementById('export-txt');

                if (exportBtn && exportMenu && rich) {
                    exportBtn.addEventListener('click', () => {
                        exportMenu.classList.toggle('show');
                    });

                    exportHtmlBtn.addEventListener('click', () => {
                        const filename = `note-${new Date().toISOString().slice(0, 10)}.html`;
                        rich.downloadHTML(filename);
                        exportMenu.classList.remove('show');
                    });

                    exportTxtBtn.addEventListener('click', () => {
                        const filename = `note-${new Date().toISOString().slice(0, 10)}.txt`;
                        rich.downloadTXT(filename);
                        exportMenu.classList.remove('show');
                    });

                    // Hide menu when clicking outside
                    document.addEventListener('click', (event) => {
                        if (!exportBtn.contains(event.target) && !exportMenu.contains(event.target)) {
                            exportMenu.classList.remove('show');
                        }
                    });
                }
            });

            // Selection Menu
            const editor = document.getElementById(config.textareaId);
            const selectionMenu = document.getElementById('selection-menu');

            if (editor && selectionMenu) {
                const MENU_OFFSET = 12;
                const MENU_HIDE_DELAY = 0;
                const VIEWPORT_PADDING = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1;

                /**
                 * Calculates optimal menu position based on text selection
                 * @param {DOMRect} selectionRect - Bounding rectangle of selected text
                 * @returns {{left: number, top: number}} Calculated position
                 */
                const calculateMenuPosition = (selectionRect) => {
                    const menuWidth = selectionMenu.offsetWidth;
                    const menuHeight = selectionMenu.offsetHeight;

                    const scrollX = window.scrollX || window.pageXOffset;
                    const scrollY = window.scrollY || window.pageYOffset;

                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;

                    // Horizontal position
                    let left = selectionRect.left + scrollX + (selectionRect.width - menuWidth) / 2;

                    // Vertical position
                    let top = selectionRect.bottom + scrollY + MENU_OFFSET;

                    // Horizontal boundary checks with padding
                    if (left < scrollX + VIEWPORT_PADDING) {
                        left = scrollX + VIEWPORT_PADDING;
                    } else if (left + menuWidth > viewportWidth + scrollX - VIEWPORT_PADDING) {
                        left = viewportWidth + scrollX - menuWidth - VIEWPORT_PADDING;
                    }

                    // Vertical boundary check
                    if (top + menuHeight > viewportHeight + scrollY - VIEWPORT_PADDING) {
                        // If menu would go off-screen, adjust to stay visible
                        top = viewportHeight + scrollY - menuHeight - VIEWPORT_PADDING;
                    }

                    return { left, top };
                };

                /**
                 * Shows or hides selection menu based on current text selection
                 */
                const showSelectionMenu = () => {
                    try {
                        const selection = window.getSelection();

                        // Hide menu if no text is selected
                        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
                            selectionMenu.classList.remove('show');
                            return;
                        }

                        const range = selection.getRangeAt(0);
                        const rect = range.getBoundingClientRect();

                        // Validate selection is within editor bounds
                        if (!editor.contains(range.commonAncestorContainer)) {
                            selectionMenu.classList.remove('show');
                            return;
                        }

                        const position = calculateMenuPosition(rect);

                        // Apply calculated position
                        selectionMenu.style.left = `${position.left}px`;
                        selectionMenu.style.top = `${position.top}px`;

                        // Trigger reflow to ensure transition plays
                        void selectionMenu.offsetWidth;

                        selectionMenu.classList.add('show');

                        // Update button states
                        const buttons = selectionMenu.querySelectorAll('button[data-command]');
                        buttons.forEach(button => {
                            const command = button.dataset.command;
                            const value = button.dataset.value;

                            if (command === 'formatBlock') {
                                const blockValue = document.queryCommandValue('formatBlock').toUpperCase();
                                if (blockValue === value) {
                                    button.classList.add('active');
                                } else {
                                    button.classList.remove('active');
                                }
                            } else if (document.queryCommandState(command)) {
                                button.classList.add('active');
                            } else {
                                button.classList.remove('active');
                            }
                        });
                    } catch (error) {
                        console.error('Error showing selection menu:', error);
                        selectionMenu.classList.remove('show');
                    }
                };

                /**
                 * Handles menu button clicks and executes formatting commands
                 * @param {MouseEvent} e - Click event
                 */
                const handleMenuClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const button = e.target.closest('button');
                    if (!button) return;

                    const command = button.dataset.command;
                    const value = button.dataset.value || null;

                    if (command === 'formatBlock') {
                        try {
                            // Toggle heading: if already applied, revert to paragraph
                            const currentValue = document.queryCommandValue('formatBlock').toUpperCase();
                            const newValue = (currentValue === value) ? 'P' : value;

                            document.execCommand(command, false, newValue);
                        } catch (error) {
                            console.error('Error executing formatBlock command:', error);
                        }
                    } else if (command) {
                        try {
                            // Save selection before command execution
                            const selection = window.getSelection();
                            const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

                            document.execCommand(command, false, value);

                            // Restore selection if needed
                            if (range && selection.rangeCount === 0) {
                                selection.addRange(range);
                            }

                        } catch (error) {
                            console.error('Error executing command:', error);
                        }
                    }

                    // Update menu state after command execution
                    setTimeout(showSelectionMenu, MENU_HIDE_DELAY);
                };

                /**
                 * Hides menu when editor loses focus
                 */
                const handleEditorBlur = () => {
                    // Small delay to allow menu interactions before hiding
                    setTimeout(() => {
                        if (!selectionMenu.matches(':hover')) {
                            selectionMenu.classList.remove('show');
                        }
                    }, 100);
                };

                // Event listeners
                document.addEventListener(
                    'selectionchange',
                    showSelectionMenu
                );

                editor.addEventListener(
                    'blur',
                    handleEditorBlur
                );

                selectionMenu.addEventListener(
                    'mousedown',
                    handleMenuClick
                );

                // Cleanup function
                window.cleanupSelectionMenu = () => {
                    document.removeEventListener(
                        'selectionchange',
                        showSelectionMenu
                    );

                    editor.removeEventListener(
                        'blur',
                        handleEditorBlur
                    );

                    selectionMenu.removeEventListener(
                        'mousedown',
                        handleMenuClick
                    );
                };
            }

            // Initialize model find component (use cached instance)
            const modelFind = await this._getModelFind();
            modelFind.init({ pageConfig: config, noteAPI });

            // Initialize context menu component
            const contextMenu = await this._getContextMenu();
            contextMenu.init({ pageConfig: config, noteAPI });

            // (async () => {
            //     try {
            //         console.log("Running translation tests...");
            //         // Thai translation
            //         const thai = await translate.thai("Hello world");
            //         console.log("Thai:", thai);

            //         // English translation
            //         const english = await translate.english("สวัสดีครับ");
            //         console.log("English:", english);

            //         // Japanese translation
            //         const japanese = await translate.japanese("Good morning");
            //         console.log("Japanese:", japanese);

            //         console.log("Translation tests finished.");
            //     } catch (error) {
            //         console.error("Translation test failed:", error);
            //     }
            // })();

            return noteAPI;
        } catch (error) {
            console.log('Error in Page.init:', error);
            return null;
        }
    }
}