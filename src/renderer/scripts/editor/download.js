/**
 * Styles for HTML export including theme colors
 * @param {HTMLElement} editor - Editor element
 * @returns {Object} Style object
 */

const getEditorStyles = (editor) => {
    const styles = window.getComputedStyle(editor);
    const rootStyles = window.getComputedStyle(document.documentElement);

    // Store theme color from CSS variables
    const themeFg = rootStyles.getPropertyValue(
        '--theme-fg'
    ).trim() || styles.color;

    const themeBg = rootStyles.getPropertyValue(
        '--theme-bg'
    ).trim() || styles.backgroundColor;

    const themeAccent = rootStyles.getPropertyValue(
        '--theme-accent'
    ).trim() || '';

    return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        color: themeFg,
        backgroundColor: themeBg,
        themeAccent: themeAccent
    }
};

/**
 * Export editor content as HTML
 * @param {HTMLElement} editor - Editor element
 * @param {boolean} includeStyles - Include inline styles
 * @returns {string} HTML string
 */

export const exportHTML = (editor, includeStyles = true) => {
    let html = editor.innerHTML;

    if (includeStyles) {
        const styles = getEditorStyles(editor);
        const styleString = `
            font-size: ${styles.fontSize}; 
            line-height: ${styles.lineHeight}; 
            color: ${styles.color}; 
            background-color: ${styles.backgroundColor};
            padding: 1rem;
        `;
        html = `<div style="${styleString}">${html}</div>`;
    }

    return html;
}

/**
 * Download as HTML file with proper theme styling
 * @param {HTMLElement} editor - Editor element
 * @param {string} filename - Output filename
 */

export const downloadHTML = (editor, filename = 'document.html') => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documents</title>
    <style>
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&family=Anuphan:wght@400;600;700&display=swap');

*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    line-height: var(--line-height-normal);
    -webkit-text-size-adjust: 100%;
    -moz-text-size-adjust: 100%;
    text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
}

:root {
  --text: #000;
  --background: #faf9f5;
  --muted: #666;
  --border: #a7a6a3;
  --code-bg: #eae9e5;
  --heading-border: #a7a6a3;
  --Links: color:rgb(50, 50, 153);
}

@media (prefers-color-scheme: dark) {
  :root {
    --text: #f4f4f4;
    --background: #141414;
    --muted: #999;
    --border: #343434;
    --code-bg: #1f1f1f;
    --heading-border: #333;
    --Links: color:hsla(240, 85%, 69%, 1.00);
  }
}

body {
  font-family: 'Inter Tight', 'Anuphan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 2.5rem;
  line-height: 1.75;
  color: var(--text);
  background-color: var(--background);
  animation: fadeIn 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes fadeIn {
  100% {
    opacity: 0;
  }
  70% {
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

p {
  margin: 0 0 1.5rem;
}

h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25; 
}

h1 {
  font-size: 2em;
  border-bottom: 1px solid var(--heading-border);
  padding-bottom: 10px;
}

h2 {
  font-size: 1.5em;
  border-bottom: 1px solid var(--heading-border);
  padding-bottom: 8px;
}

h3 { font-size: 1.7em; }
h4 { font-size: 1.425em; }
h5 { font-size: 1.245em; }
h6 { font-size: 1em; }

a {
    color: var(--Links);
    text-decoration: underline;
    transition: color 0.2s ease;
    line-height: 0;
    height: 30px;
    display: inline-block;
    align-content: center;
    text-decoration: none;
    border-bottom: solid 1px currentColor;
}

a:hover, a:focus {
  color: var(--muted);
}

code {
  background: var(--code-bg);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: Consolas, Menlo, Monaco, "Courier New", monospace;
  font-size: 0.95em;
}

pre {
  background: var(--code-bg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 0 0 1.5rem;
}

pre code {
  background: none;
  padding: 0;
  border-radius: 0;
  font-size: 0.95em;
  color: inherit;
}

blockquote {
  border-left: 4px solid var(--border);
  margin: 0 0 1.5rem;
  padding-left: 16px;
  color: var(--muted);
  font-style: italic;
}

ul, ol {
  margin: 0 0 1.5rem 1.5rem;
  padding: 0;
  margin-top: 1rem;
}

li {
  margin-bottom: 0.5rem;
}

li > ul, li > ol {
  margin-top: 0.5rem;
}

hr {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1.5rem;
}

th, td {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}

th {
  background: var(--code-bg);
  font-weight: 600;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1rem auto;
}

input[type="checkbox"],
input[type="radio"] {
    width: 1rem;
    height: 1rem;
    padding: 0;
    margin-right: var(--space-2);
    accent-color: var(--color-interactive-primary);
    margin-right: 0.3rem;
    transform: translateY(1.5px);
}

img,
video,
audio,
iframe,
embed,
object {
    max-width: 100%;
    height: auto;
    display: block;
}

figcaption {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    text-align: center;
    margin-top: var(--space-2);
    font-style: italic;
}

section,
article,
aside,
nav {
    display: block;
}

@media (max-width: 640px) {
  body {
    padding: 1.5rem;
  }
}
    </style>
</head>
<body>
${editor.innerHTML}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

}