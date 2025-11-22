/**
 * Logger utility that prevents crashes from broken pipe errors
 * when console output is not available so this one will fix that to you.
 */

const safeLog = (message, ...args) => {
    try {
        console.log(message, ...args);
    } catch (error) {
        // Silently ignore EPIPE and other console errors
        if (error.code !== 'EPIPE') {
            /* 
                Re-throw if it's a different error
                console.error('Logging error:', error);
            */
        }
    }
};

const safeError = (message, ...args) => {
    try {
        console.error(message, ...args);
    } catch (error) {
        // Silently ignore EPIPE and other console errors
        if (error.code !== 'EPIPE') {
            /*
                Re-throw if it's a different error
                console.error('Logging error:', error);
            */
        }
    }
};

const safeWarn = (message, ...args) => {
    try {
        console.warn(message, ...args);
    } catch (error) {
        // Ignore EPIPE and other console errors
        if (error.code !== 'EPIPE') {
            /*
                Re-throw if it's a different error
                console.error('Logging error:', error);
            */
        }
    }
};

export { safeLog, safeError, safeWarn };