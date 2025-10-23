let autoSaveTimeout;
let currentFontSize = 16;
let activeTabId = null;
const body = document.body;

const textarea = document.getElementById('autoSaveTextarea');
const saveIndicator = document.getElementById('saveIndicator');
const statusText = document.getElementById('statusText');

// Save via object per tab
const tabsData = {}; // key = tabId, value = { text, fontSize }

const loadTabData = (tabId) => {
    activeTabId = tabId;
    const data = tabsData[tabId] || { text: '', fontSize: 16 };
    textarea.value = data.text;
    currentFontSize = data.fontSize;
    textarea.style.fontSize = `${currentFontSize}px`;
};

const saveTabData = () => {
    if (!activeTabId) return;
    tabsData[activeTabId] = {
        text: textarea.value,
        fontSize: currentFontSize
    };
    saveIndicator.classList.remove('saving');
    statusText.textContent = `Saved ${new Date().toLocaleTimeString('th-TH')}`;
    setTimeout(() => {
        statusText.textContent = 'Saved';
    }, 1000);
};

const showSaving = () => {
    saveIndicator.classList.add('saving');
    statusText.textContent = 'Recording';
};

const zoomIn = () => {
    if (currentFontSize < 128) {
        currentFontSize += 2;
        textarea.style.fontSize = `${currentFontSize}px`;
        saveTabData();
    }
};

const zoomOut = () => {
    if (currentFontSize > 8) {
        currentFontSize -= 2;
        textarea.style.fontSize = `${currentFontSize}px`;
        saveTabData();
    }
};

const resetZoom = () => {
    currentFontSize = 16;
    textarea.style.fontSize = `${currentFontSize}px`;
    saveTabData();
};

const triggerAutoSave = () => {
    clearTimeout(autoSaveTimeout);
    showSaving();
    autoSaveTimeout = setTimeout(() => saveTabData(), 1000);
};

textarea.addEventListener('input', triggerAutoSave);

document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
            e.preventDefault(); zoomIn();
        } else if (e.key === '-' || e.key === '_') {
            e.preventDefault(); zoomOut();
        } else if (e.key === '0') {
            e.preventDefault(); resetZoom();
        }
    }
});

textarea.addEventListener('wheel', e => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.deltaY < 0 ? zoomIn() : zoomOut();
    }
});

window.electronAPI.onLoadTabData((tabId, data) => {
    tabsData[tabId] = data || { text: '', fontSize: 16 };
    loadTabData(tabId);
});

window.addEventListener('beforeunload', () => saveTabData());