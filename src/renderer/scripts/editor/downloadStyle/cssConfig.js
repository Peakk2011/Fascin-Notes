// CSS config for downloading HTML in Fascinate Note
import { WebElements, Design } from '../../../../framework/units.js';

const { spacing, borderRadius } = WebElements;
const { designConfig } = Design;

/**
 * @typedef {'light' | 'dark'} ThemeMode
 */

/**
 * @typedef {Object} ThemeColors
 * @property {string} text
 * @property {string} background
 * @property {string} muted
 * @property {string} border
 * @property {string} codeBg
 * @property {string} headingBorder
 * @property {string} links
 */

/** @type {Record<ThemeMode, ThemeColors>} */
const theme = {
    light: {
        text: '#000',
        background: '#faf9f5',
        muted: '#666',
        border: '#a7a6a3',
        codeBg: '#eae9e5',
        headingBorder: '#a7a6a3',
        links: 'rgb(50, 50, 153)',
    },
    dark: {
        text: '#f4f4f4',
        background: '#141414',
        muted: '#999',
        border: '#343434',
        codeBg: '#1f1f1f',
        headingBorder: '#333',
        links: 'hsla(240, 85%, 69%, 1)',
    },
};

/**
 * Generate CSS for theme
 * @param {ThemeMode} mode
 * @returns {string}
 */
const themeStyles = (mode) => {
    const colors = theme[mode];
    
    return `
        body {
            color: ${colors.text};
            background: ${colors.background};
        }

        h1, h2 {
            border-bottom-color: ${colors.headingBorder};
        }

        a {
            color: ${colors.links};
        }

        a:hover, a:focus {
            color: ${colors.muted};
        }

        code, pre {
            background: ${colors.codeBg};
        }

        blockquote {
            border-left-color: ${colors.border};
            color: ${colors.muted};
        }

        hr {
            border-top-color: ${colors.border};
        }

        th, td {
            border-color: ${colors.border};
        }

        th {
            background: ${colors.codeBg};
        }
    `;
};

/**
 * @typedef {Object} downloadMarkupsContent
 * @property {string} styles - Complete CSS string
 * @property {Record<ThemeMode, ThemeColors>} theme - Theme colors
 */

/** @type {downloadMarkupsContent} */
export const downloadMarkupsContent = {
    styles: `
        @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,100..900;1,100..900&family=Anuphan:wght@400;600;700&display=swap');

        *, *::before, *::after {
            box-sizing: ${designConfig.boxSizing || 'border-box'};
            margin: 0;
            padding: 0;
        }

        html {
            -webkit-text-size-adjust: ${designConfig.textSizeAdjust};
        }

        body {
            font-family: 'Inter Tight', 'Anuphan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: ${designConfig.lineHeight};
            -webkit-font-smoothing: ${designConfig.fontSmoothingWebkit};
            -moz-osx-font-smoothing: ${designConfig.fontSmoothingMoz};
            text-rendering: ${designConfig.textRendering};
            max-width: 750px;
            margin: 0 auto;
            padding: ${spacing[6]};
            color: ${theme.light.text};
            background: ${theme.light.background};
        }

        @media (max-width: 768px) {
            body {
                max-width: 100%;
                padding: ${spacing[6]};
            }
        }

        h1, h2, h3, h4, h5, h6 {
            margin-top: ${spacing[6]};
            margin-bottom: ${spacing[4]};
            font-weight: 600;
            line-height: ${designConfig.headingLineHeight};
        }

        h1 {
            font-size: 2em;
        }

        h2 {
            font-size: 1.5em;
        }

        h3 { font-size: 1.7em; }
        h4 { font-size: 1.425em; }
        h5 { font-size: 1.245em; }
        h6 { font-size: 1em; }

        a {
            color: ${theme.light.links};
            text-decoration: ${designConfig.textDecorationNone};
            transition: color 150ms ease;
            border-bottom: solid 1px currentColor;
        }

        a:hover, a:focus {
            color: ${theme.light.muted};
        }

        code {
            background: ${theme.light.codeBg};
            padding: ${spacing[0.5]} ${spacing[1]};
            border-radius: ${borderRadius.sm};
            font-family: Consolas, Monaco, 'Courier New', monospace;
            font-size: 0.95em;
        }

        pre {
            background: ${theme.light.codeBg};
            padding: ${spacing[4]};
            border-radius: ${borderRadius.md};
            overflow-x: auto;
            margin: 0 0 ${spacing[6]};
        }

        pre code {
            background: ${designConfig.backgroundNone};
            padding: 0;
            border-radius: 0;
        }

        blockquote {
            border-left: 4px solid ${theme.light.border};
            margin: 0 0 ${spacing[6]};
            padding-left: ${spacing[4]};
            color: ${theme.light.muted};
            font-style: italic;
        }

        ul, ol {
            margin: ${spacing[4]} 0 ${spacing[6]} ${spacing[6]};
            padding: 0;
        }

        li {
            margin-bottom: ${spacing[2]};
        }

        li > ul, li > ol {
            margin-top: ${spacing[2]};
        }

        hr {
            border: ${designConfig.borderNone};
            border-top: 1px solid ${theme.light.border};
        }

        table {
            border-collapse: ${designConfig.borderCollapse};
            width: 100%;
            margin-bottom: ${spacing[6]};
        }

        th, td {
            border: 1px solid ${theme.light.border};
            padding: ${spacing[2]} ${spacing[3]};
            text-align: left;
        }

        th {
            background: ${theme.light.codeBg};
            font-weight: 600;
        }

        img, video, audio, iframe, embed, object {
            max-width: 100%;
            height: ${designConfig.heightAuto};
            display: ${designConfig.displayBlock};
            margin: ${spacing[4]} auto;
        }

        input[type="checkbox"],
        input[type="radio"] {
            width: ${spacing[4]};
            height: ${spacing[4]};
            margin-right: ${spacing[2]};
            transform: translateY(1.5px);
        }

        figcaption {
            font-size: 0.875rem;
            text-align: center;
            margin-top: ${spacing[2]};
            font-style: italic;
        }

        @media (prefers-color-scheme: dark) {
            ${themeStyles('dark')}
        }
    `,
    
    theme,
};

// Check validation
if (!theme.light || !theme.dark) {
    throw new Error('Theme configuration is missing');
}