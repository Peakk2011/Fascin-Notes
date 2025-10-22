import { app, Menu } from 'electron';
import { createWindow } from './core/createWindow.js';
import { OS } from './config/osConfig.js';

if (OS === 'win32' && process.argv.some(arg => arg.includes('--squirrel'))) {
	app.quit();
}

app.whenReady().then(() => {
	Menu.setApplicationMenu(Menu.buildFromTemplate([]));
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});	
});

app.on('window-all-closed', () => {
	if (OS !== 'darwin') {
		app.quit();
	}
});