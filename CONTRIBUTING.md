# Contributing Guide

Thanks for everyone to taking the time to contribute this project that keeps a high bar for code quality and performance, so please follow my the guidelines below.

## 1. Workflow

- Give your Brunch a clear and understandable name, and explain what it does well.
- If you're not finished with the code, you can discard it, but it must not cause errors or impact the app. Leave a comment explaining what's left.
- The renderer (frontend) side of this project uses a custom framework called [Mintkit framework] (https://github.com/Peakk2011/Mintkit) that manages pages and eliminates the use of `index.html` for adding components.
- To run this project, there are two commands: `npm run dev` will open the dev tools for you, and `npm run start` will only open the app (which will run faster and provide an example of how the actual app will open).

## 2. Code Style

- The naming conventions in Fascinate Note (Fasin-Note) must be the same as the original. For example, variable names and functions are case sensitive, except for model files, which are case sensitive. For example, if the file is a `.css` or `.html` file, it is case sensitive.
## 3. Performance

- If you're testing something in the main process that could impact performance, please benchmark it for us to see how fast it is.
- Do not use I/O sync in the main process.
- Use memory cache/lazy load if appropriate.

## 4. Security

- Sanitize all input from the renderer.
- Do not use Electron's `remote` API.
- Always validate IPC parameters.

By contributing, you agree to follow these rules to keep the codebase fast, safe, and maintainable.
