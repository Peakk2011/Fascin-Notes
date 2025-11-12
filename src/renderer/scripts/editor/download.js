/**
 * Styles for HTML export including theme colors
 * @param {HTMLElement} editor - Editor element
 * @returns {Object} Style object
 */

const getEditerStyles = (editer) => {
    const styles = window.getComputedStyle(editer);
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

export const exportHTML = (editer, includeStyles = true) => {
    let html = editer.innerHTML;

    if (includeStyles) {
        const styles = getEditerStyles(editer);
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

export const downloadHTML = (editer, filename = 'document.html') => {
    const styles = getEditerStyles(editer);

    const html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exported Note</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            color: ${styles.color};
            background-color: ${styles.backgroundColor};
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            min-height: 100vh;
        }
        
        .exported-content {
            font-size: ${styles.fontSize};
            line-height: ${styles.lineHeight};
            color: ${styles.color};
            background-color: ${styles.backgroundColor};
        }
        
        h1 { 
            font-size: 2em; 
            margin: 0.67em 0; 
            color: ${styles.color};
        }
        h2 { 
            font-size: 1.5em; 
            margin: 0.75em 0; 
            color: ${styles.color};
        }
        h3 { 
            font-size: 1.17em; 
            margin: 0.83em 0; 
            color: ${styles.color};
        }
        h4 { 
            font-size: 1em; 
            margin: 1.12em 0; 
            color: ${styles.color};
        }
        
        blockquote {
            border-left: 4px solid ${styles.themeAccent};
            margin: 1em 0;
            padding-left: 1em;
            color: ${styles.color};
            opacity: 0.8;
            font-style: italic;
        }
        
        strong, b {
            font-weight: bold;
            color: ${styles.color};
        }
        
        em, i {
            font-style: italic;
            color: ${styles.color};
        }
        
        @media (prefers-color-scheme: dark) {
            body {
                color-scheme: dark;
            }
        }
        
        @media (prefers-color-scheme: light) {
            body {
                color-scheme: light;
            }
        }
    </style>
</head>
<body>
    <div class="exported-content">
        ${editor.innerHTML}
    </div>
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