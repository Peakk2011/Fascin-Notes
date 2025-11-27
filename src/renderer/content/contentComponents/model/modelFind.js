// This file type is from Fascin Notes (Frontend side)
// Find and Replace Modal

import { Mint } from '../../../../framework/mint.js';
import { fetchJSON } from '../../../../utils/fetch.js';
Mint.include('stylesheet/style-components/find.css');

/**
 * Creates a Find modal for contenteditable elements
 * @returns {Promise<Object>} Modal component with markups and init method
 */
export const createModelFind = async () => {
    let config;

    try {
        config = await fetchJSON(
            'renderer/content/contentComponents/model/modelFindConfig.json'
        );
    } catch (error) {
        console.error('[ModelFind] Failed to load configuration:', error);
        
        throw new Error(
            'Find modal configuration could not be loaded'
        );
    }

    return {
        markups: `
            <div id="${config.modalId}" class="${config.modalClass}" role="dialog" aria-labelledby="find-modal-title" aria-modal="true">
                <div class="${config.contentClass}">
                    <div class="${config.headerClass}">
                        <button 
                            id="${config.closeButtonId}" 
                            class="${config.closeButtonClass}"
                            aria-label="Close find modal"
                            type="button">
                            ${config.closeButtonContent}
                        </button>
                    </div>
                    <div class="${config.bodyClass}">
                        <textarea 
                            id="${config.findInputId}" 
                            placeholder="${config.findInputPlaceholder}"
                            aria-label="Search term"
                            autocomplete="off"
                            spellcheck="false"></textarea>
                        <span 
                            id="${config.statusTextId}" 
                            class="find-status" 
                            role="status" 
                            aria-live="polite"></span>
                        <button 
                            id="${config.findButtonId}"
                            type="button"
                            aria-label="Find next occurrence">
                            ${config.findButtonText}
                        </button>
                    </div>
                </div>
            </div>
        `,

        init({ pageConfig, noteAPI }) {
            // Validation
            if (!pageConfig?.textareaId) {
                console.error('[ModelFind] Invalid pageConfig: missing textareaId');
                return;
            }

            if (!noteAPI) {
                console.error('[ModelFind] Invalid noteAPI: API not provided');
                return;
            }

            // DOM elements cache
            const elements = {
                textarea: null,
                findModal: null,
                closeModalBtn: null,
                findInput: null,
                findButton: null,
                findStatus: null
            };

            // State management
            const state = {
                isModalVisible: false,
                lastSearchTerm: '',
                currentMatchIndex: -1,
                totalMatches: 0,
                searchMatches: []
            };

            // Cleanup functions
            const eventListeners = [];

            /**
             * Initialize DOM elements with error handling
             * @returns {boolean} Success status
             */
            const initializeElements = () => {
                try {
                    elements.textarea = document.getElementById(pageConfig.textareaId);
                    elements.findModal = document.getElementById(config.modalId);
                    elements.closeModalBtn = document.getElementById(config.closeButtonId);
                    elements.findInput = document.getElementById(config.findInputId);
                    elements.findButton = document.getElementById(config.findButtonId);
                    elements.findStatus = document.getElementById(config.statusTextId);

                    const missingElements = Object.entries(elements)
                        .filter(([_, el]) => !el)
                        .map(([key]) => key);

                    if (missingElements.length > 0) {
                        console.error(
                            '[ModelFind] Missing DOM elements:',
                            missingElements
                        );
                        return false;
                    }

                    return true;
                } catch (error) {
                    console.error(
                        '[ModelFind] Element initialization failed:',
                        error
                    );
                    return false;
                }
            };

            /**
             * Get text content from contenteditable element
             * @returns {string} Text content
             */
            const getTextContent = () => {
                if (!elements.textarea) {
                    console.warn('[ModelFind] Textarea element not found');
                    return '';
                }
                return elements.textarea.textContent || elements.textarea.innerText || '';
            };

            /**
             * Get all text nodes from an element
             * @param {HTMLElement} element - Root element
             * @returns {Text[]} Array of text nodes
             */
            const getTextNodes = (element) => {
                const textNodes = [];

                try {
                    const walker = document.createTreeWalker(
                        element,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode: (node) => {
                                return node.textContent.trim()
                                    ? NodeFilter.FILTER_ACCEPT
                                    : NodeFilter.FILTER_REJECT;
                            }
                        },
                        false
                    );

                    let node;
                    while (node = walker.nextNode()) {
                        textNodes.push(node);
                    }
                } catch (error) {
                    console.error(
                        '[ModelFind] Failed to get text nodes:',
                        error
                    );
                }

                return textNodes;
            };

            /**
             * Find all matches of search term in text
             * @param {string} text - Text to search
             * @param {string} searchTerm - Term to find
             * @returns {number[]} Array of match indices
             */
            const findAllMatches = (text, searchTerm) => {
                const matches = [];
                const lowerText = text.toLowerCase();
                const lowerTerm = searchTerm.toLowerCase();
                let index = 0;

                while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
                    matches.push(index);
                    index += searchTerm.length;
                }

                return matches;
            };

            /**
             * Update status message
             * @param {string} message - Status message
             * @param {string} type - Message type ('error', 'success', 'info')
             */
            const updateStatus = (message, type = 'info') => {
                if (!elements.findStatus) {
                    return;
                }

                elements.findStatus.textContent = message;
                elements.findStatus.className = `find-status find-status--${type}`;

                // Auto-clear after 3 seconds
                if (type !== 'error') {
                    setTimeout(() => {
                        if (elements.findStatus.textContent === message) {
                            elements.findStatus.textContent = '';
                        }
                    }, 3000);
                }
            };

            /**
             * Select text range in contenteditable
             * @param {number} startIndex - Start index
             * @param {number} endIndex - End index
             * @returns {boolean} Success status
             */
            const selectTextRange = (startIndex, endIndex) => {
                try {
                    const range = document.createRange();
                    const selection = window.getSelection();
                    const textNodes = getTextNodes(elements.textarea);

                    if (textNodes.length === 0) {
                        console.warn('[ModelFind] No text nodes found');
                        return false;
                    }

                    let currentLength = 0;
                    let rangeSet = false;

                    for (const node of textNodes) {
                        const nodeLength = node.textContent.length;
                        const nodeEnd = currentLength + nodeLength;

                        // Check if this node contains the start of our selection
                        if (!rangeSet && currentLength <= startIndex && startIndex < nodeEnd) {
                            const startOffset = startIndex - currentLength;
                            range.setStart(node, startOffset);
                            rangeSet = true;
                        }

                        // Check if this node contains the end of our selection
                        if (rangeSet && currentLength <= endIndex && endIndex <= nodeEnd) {
                            const endOffset = endIndex - currentLength;
                            range.setEnd(node, endOffset);

                            selection.removeAllRanges();
                            selection.addRange(range);

                            // Scroll to selection
                            const rect = range.getBoundingClientRect();
                            if (rect.top < 0 || rect.bottom > window.innerHeight) {
                                range.startContainer.parentElement?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center'
                                });
                            }

                            return true;
                        }

                        currentLength = nodeEnd;
                    }

                    console.warn('[ModelFind] Could not set text range');
                    return false;
                } catch (error) {
                    console.error(
                        '[ModelFind] Text selection failed:',
                        error
                    );
                    return false;
                }
            };

            /**
             * Show the find modal
             */
            const showModal = () => {
                if (!elements.findModal) return;

                state.isModalVisible = true;
                elements.findModal.style.display = 'flex';

                requestAnimationFrame(() => {
                    elements.findModal.classList.add('visible');

                    // Focus and select input after animation starts
                    setTimeout(() => {
                        if (elements.findInput) {
                            elements.findInput.focus();
                            elements.findInput.select();
                        }
                    }, 50);
                });
            };

            /**
             * Hide the find modal
             */
            const hideModal = () => {
                if (!elements.findModal) return;

                state.isModalVisible = false;
                elements.findModal.classList.remove('visible');

                const handleTransitionEnd = (e) => {
                    if (e.target === elements.findModal && e.propertyName === 'opacity') {
                        elements.findModal.style.display = 'none';
                    }
                };

                elements.findModal.addEventListener(
                    'transitionend',
                    handleTransitionEnd,
                    {
                        once: true
                    }
                );

                // Fallback timeout in case transition doesn't fire
                setTimeout(() => {
                    if (!state.isModalVisible && elements.findModal.style.display !== 'none') {
                        elements.findModal.style.display = 'none';
                    }
                }, 300);
            };

            /**
             * Handle find operation
             */
            const handleFind = () => {
                const searchTerm = elements.findInput?.value?.trim();

                if (!searchTerm) {
                    updateStatus('Enter a search term', 'error');
                    return;
                }

                if (!elements.textarea) {
                    updateStatus('Editor not found', 'error');
                    return;
                }

                const text = getTextContent();

                if (!text) {
                    updateStatus('No results', 'error');
                    return;
                }

                // Find all matches
                state.searchMatches = findAllMatches(text, searchTerm);
                state.totalMatches = state.searchMatches.length;

                if (state.totalMatches === 0) {
                    updateStatus(
                        config.statusNotFoundText || 'No matches found',
                        'error'
                    );
                    state.currentMatchIndex = -1;
                    return;
                }

                // Move to next match or start from beginning
                if (searchTerm !== state.lastSearchTerm) {
                    state.currentMatchIndex = 0;
                } else {
                    state.currentMatchIndex = (state.currentMatchIndex + 1) % state.totalMatches;
                }

                state.lastSearchTerm = searchTerm;

                const matchIndex = state.searchMatches[
                    state.currentMatchIndex
                ];

                const success = selectTextRange(
                    matchIndex,
                    matchIndex + searchTerm.length
                );

                if (success) {
                    hideModal();
                    elements.textarea.focus();

                    if (state.totalMatches > 1) {
                        updateStatus(
                            `Match ${state.currentMatchIndex + 1} of ${state.totalMatches}`,
                            'success'
                        );
                    }
                } else {
                    updateStatus('Failed to select text', 'error');
                }
            };

            /**
             * Clear search status when input changes
             */
            const handleInputChange = () => {
                if (elements.findStatus?.textContent) {
                    elements.findStatus.textContent = '';
                }
                state.lastSearchTerm = '';
                state.currentMatchIndex = -1;
            };

            /**
             * Add event listener with cleanup tracking
             */
            const addEventListener = (element, event, handler, options) => {
                if (!element) return;

                element.addEventListener(
                    event,
                    handler, 
                    options
                );

                eventListeners.push({
                    element,
                    event,
                    handler,
                    options
                });
            };

            /**
             * Initialize event listeners
             */
            const initializeEventListeners = () => {
                // Keyboard shortcuts
                addEventListener(document, 'keydown', (e) => {
                    // Ctrl/Cmd + F to open find
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                        e.preventDefault();
                        showModal();
                        return;
                    }

                    // Escape to close modal
                    if (e.key === 'Escape' && state.isModalVisible) {
                        e.preventDefault();
                        hideModal();
                        return;
                    }
                });

                // Close button
                addEventListener(
                    elements.closeModalBtn,
                    'click',
                    hideModal
                );

                // Click outside to close
                addEventListener(elements.findModal, 'click', (e) => {
                    if (e.target === elements.findModal) {
                        hideModal();
                    }
                });

                // Input change handler
                addEventListener(
                    elements.findInput,
                    'input',
                    handleInputChange
                );

                // Find button
                addEventListener(
                    elements.findButton,
                    'click',
                    handleFind
                );

                // Enter key in input
                addEventListener(elements.findInput, 'keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFind();
                    }
                });
            };

            /**
             * Cleanup function for destroying the modal
             */
            const destroy = () => {
                // Remove all event listeners
                eventListeners.forEach(({ element, event, handler, options }) => {
                    element?.removeEventListener(
                        event,
                        handler,
                        options
                    );
                });
                eventListeners.length = 0;

                // Clear state
                Object.keys(state).forEach(key => {
                    state[key] = null;
                });

                // Clear element references
                Object.keys(elements).forEach(key => {
                    elements[key] = null;
                });

                console.info('[ModelFind] Component destroyed');
            };

            // Initialize component
            if (!initializeElements()) {
                console.error('[ModelFind] Component initialization failed');
                return;
            }

            initializeEventListeners();
            // console.info('[ModelFind] Component initialized successfully');
            // Return cleanup function
            return { destroy };
        }
    };
};