// This file type is from Fascin Notes (Frontend side)
// Find and Replace Modal

import { Mint } from '../../../../framework/mint.js';
import { fetchJSON } from '../../../../utils/fetch.js';
Mint.include('stylesheet/style-components/find.css'); 

export const createModelFind = async () => {
    const config = await fetchJSON(
        'renderer/content/contentComponents/model/modelFindConfig.json'
    );

    return {
        markups: `
            <div id="${config.modalId}" class="${config.modalClass}">
                <div class="${config.contentClass}">
                    <div class="${config.headerClass}">
                        <h3>${config.title}</h3>
                        <button id="${config.closeButtonId}" class="${config.closeButtonClass}">${config.closeButtonContent}</button>
                    </div>
                    <div class="${config.bodyClass}">
                        <input type="text" id="${config.findInputId}" placeholder="${config.findInputPlaceholder}" autocomplete="off">
                        <span id="${config.statusTextId}" class="find-status"></span>
                        <button id="${config.findButtonId}">${config.findButtonText}</button>
                    </div>
                </div>
            </div>
        `,

        init({ pageConfig, noteAPI }) {
            if (!pageConfig || !noteAPI) {
                console.error("modelFind.init: Missing required dependencies (pageConfig, noteAPI).");
                return;
            }
            const textarea = document.getElementById(pageConfig.textareaId);
            const findModal = document.getElementById(config.modalId);
            const closeModalBtn = document.getElementById(config.closeButtonId);
            const findInput = document.getElementById(config.findInputId);
            const findButton = document.getElementById(config.findButtonId);
            const findStatus = document.getElementById(config.statusTextId);

            const showModal = () => {
                findModal.style.display = 'flex';

                requestAnimationFrame(() => {
                    findModal.classList.add('visible');
                })

                setTimeout(() => {
                    findInput.focus();
                    findInput.select();
                }, 50);
            };

            const hideModal = () => {
                findModal.classList.remove('visible');

                findModal.addEventListener('transitionend', (e) => {

                    if (e.target === findModal && e.propertyName === 'opacity') {
                        findModal.style.display = 'none';
                    }
                }, { once: true });
            };

            const handleFind = () => {
                const searchTerm = findInput.value;
                if (!searchTerm || !textarea) return;

                const text = textarea.value;
                const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());

                if (index !== -1) {
                    hideModal();
                    textarea.focus();
                    textarea.setSelectionRange(index, index + searchTerm.length);
                } else {
                    findStatus.textContent = config.statusNotFoundText;
                }
            };

            // Show modal on Ctrl/Cmd + F
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                    e.preventDefault();
                    showModal();
                }
                
                // Hide the model with keys
                if (e.key === 'Escape' && findModal.style.display !== 'none') {
                    hideModal();
                }
            });

            // Hide modal when close button is clicked
            closeModalBtn.addEventListener('click', hideModal);

            findModal.addEventListener('click', (e) => {
                if (e.target === findModal) {
                    hideModal();
                }
            });

            // Clear the text after exit
            findInput.addEventListener('input', () => {
                if (findStatus.textContent) {
                    findStatus.textContent = '';
                }
            });

            findButton.addEventListener('click', handleFind);

            findInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFind();
                }
            });
        }
    };
};