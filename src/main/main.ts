// Main process entry point

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { DuckDBService } from './DuckDBService';
import { ProfileStore } from './ProfileStore';
import { registerIpcHandlers } from './ipcHandlers';

// Suppress EPIPE errors when stdout/stderr closes (harmless during shutdown)
process.on('uncaughtException', (error) => {
  // Ignore EPIPE errors from console output
  if (error.message?.includes('EPIPE')) {
    return;
  }
  // Log other uncaught exceptions
  console.error('Uncaught exception:', error);
});

// Initialize services
let mainWindow: BrowserWindow | null = null;

// TEMPORARY: Worker thread disabled due to DuckDB threading crashes (see commit history)
// TODO: Re-enable with proper synchronization to prevent concurrent access to connections
// function createDuckDbExecutor(): DuckDBExecutor {
//   try {
//     return new DuckDBWorkerClient();
//   } catch (error) {
//     console.warn('Failed to initialize DuckDB worker, falling back to in-process service:', error);
//     return new DuckDBService();
//   }
// }
// const duckdbService = createDuckDbExecutor();

const duckdbService = new DuckDBService();
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
