// Main process entry point

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { DuckDBWorkerClient } from './DuckDBWorkerClient';
import { ProfileStore } from './ProfileStore';
import { registerIpcHandlers } from './ipcHandlers';

// Initialize services
let mainWindow: BrowserWindow | null = null;
const duckdbService = new DuckDBWorkerClient();
const profileStore = new ProfileStore();

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, '../preload/preload.js'),
    },
    title: 'Orbital DB',
  });

  // Load the renderer
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Register IPC handlers
  registerIpcHandlers(duckdbService, profileStore);

  // Create window
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await duckdbService.destroy();
});
