import { ipcMain } from 'electron';
import { OS } from '../config/osConfig.js';
import { safeLog, safeError } from '../utils/safeLogger.js';

export class IpcManager {
    constructor() {
        this.handlers = new Map();
    }

    init() {
        this.setupOSHandler();
        safeLog('IPC Manager initialized');
    }

    // OS
    setupOSHandler() {
        ipcMain.handle('get-os', () => OS);
    }

    // Register Handler
    registerHandler(channel, handler) {
        if (typeof channel !== 'string' || !channel.trim() || typeof handler !== 'function') {
            return safeError('Invalid handler registration');
        }

        // Remove old
        if (this.handlers.has(channel)) {
            const old = this.handlers.get(channel);
            ipcMain.removeListener(channel, old);
        }

        const wrapped = (event, ...args) => {
            if (event.__ipcGuard === channel) return;
            event.__ipcGuard = channel;
            try {
                handler(event, ...args);
            } catch (err) {
                safeError(`IPC Error [${channel}]:`, err, { args });
            } finally {
                delete event.__ipcGuard;
            };
        }

        this.handlers.set(channel, wrapped);
        ipcMain.on(channel, wrapped);
    }

    // Cleanup
    cleanup() {
        // safeLog('Starting IPC Manager cleanup...');

        // Remove all
        this.handlers.forEach((handler, channel) => {
            ipcMain.removeListener(channel, handler);
        });
        this.handlers.clear();

        // Remove handlers
        ['get-os'].forEach(ch =>
            ipcMain.removeHandler(ch)
        );

        // safeLog('IPC Manager cleaned up');
    }
}