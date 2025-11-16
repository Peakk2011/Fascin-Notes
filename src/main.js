import { app, Menu, BrowserWindow } from 'electron';
import { createWindow } from './core/createWindow.js';
import { preloadAssets } from './core/preloadAssets.js';
import { OS } from './config/osConfig.js';

const isAppleSilicon = process.arch === 'arm64';
const isIntelMac = process.arch === 'x64' && process.platform === 'darwin';

if (isIntelMac) {
	app.disableHardwareAcceleration();
	app.commandLine.appendSwitch('--disable-gpu');
	app.commandLine.appendSwitch('--disable-webgl');
}

if (OS === 'win32' && process.argv.some(arg => arg.includes('--squirrel'))) {
	app.quit();
}

app.whenReady().then(async () => {
	await preloadAssets();
	await createWindow();

	app.on('activate', async () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			await createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (OS !== 'darwin') {
		app.quit();
	}
});