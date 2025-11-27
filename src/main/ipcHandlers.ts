// IPC Handlers - register all IPC communication handlers

import { ipcMain, app, dialog } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type { DuckDBExecutor } from './DuckDBWorkerClient';
import type { ProfileStore } from './ProfileStore';
import type { DuckDBProfileInput, DuckDBProfileUpdate } from '../shared/types';

export function registerIpcHandlers(
  duckdbService: DuckDBExecutor,
  profileStore: ProfileStore
): void {
  // App metadata
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion();
  });

  // Profile management
  ipcMain.handle(IPC_CHANNELS.PROFILES_LIST, async () => {
    try {
      return await profileStore.loadProfiles();
    } catch (error) {
      console.error('Failed to list profiles:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILES_CREATE, async (_event, input: DuckDBProfileInput) => {
    try {
      return await profileStore.createProfile(input);
    } catch (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.PROFILES_UPDATE,
    async (_event, id: string, update: DuckDBProfileUpdate) => {
      try {
        return await profileStore.updateProfile(id, update);
      } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.PROFILES_DELETE, async (_event, id: string) => {
    try {
      await profileStore.deleteProfile(id);
    } catch (error) {
      console.error('Failed to delete profile:', error);
      throw error;
    }
  });

  // Connection management
  ipcMain.handle(IPC_CHANNELS.CONNECTION_OPEN, async (_event, profileId: string) => {
    try {
      const profile = await profileStore.getProfile(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      await duckdbService.openConnection(profile);
    } catch (error) {
      console.error('Failed to open connection:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_CLOSE, async (_event, profileId: string) => {
    try {
      await duckdbService.closeConnection(profileId);
    } catch (error) {
      console.error('Failed to close connection:', error);
      throw error;
    }
  });

  // Schema introspection
  ipcMain.handle(IPC_CHANNELS.SCHEMA_LIST_SCHEMAS, async (_event, profileId: string) => {
    try {
      return await duckdbService.listSchemas(profileId);
    } catch (error) {
      console.error('Failed to list schemas:', error);
      throw error;
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_LIST_TABLES,
    async (_event, profileId: string, schemaName: string) => {
      try {
        return await duckdbService.listTables(profileId, schemaName);
      } catch (error) {
        console.error('Failed to list tables:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_GET_COLUMNS,
    async (_event, profileId: string, schemaName: string, tableName: string) => {
      try {
        return await duckdbService.getColumns(profileId, schemaName, tableName);
      } catch (error) {
        console.error('Failed to get columns:', error);
        throw error;
      }
    }
  );

  // Constraints
  ipcMain.handle(
    IPC_CHANNELS.CONSTRAINTS_LIST,
    async (_event, profileId: string, schemaName: string, tableName: string) => {
      try {
        return await duckdbService.listConstraints(profileId, schemaName, tableName);
      } catch (error) {
        console.error('Failed to list constraints:', error);
        throw error;
      }
    }
  );

  // Query execution
  ipcMain.handle(
    IPC_CHANNELS.QUERY_RUN,
    async (_event, profileId: string, sql: string, options?: { rowLimit?: number }) => {
      try {
        return await duckdbService.runQuery(profileId, sql, options);
      } catch (error) {
        console.error('Failed to execute query:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.QUERY_EXPORT_CSV,
    async (_event, profileId: string, sql: string, filePath: string) => {
      try {
        return await duckdbService.exportToCsv(profileId, sql, filePath);
      } catch (error) {
        console.error('Failed to export CSV:', error);
        throw error;
      }
    }
  );

  // File dialog handlers
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DATABASE, async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select DuckDB Database File',
        filters: [
          { name: 'DuckDB Database', extensions: ['duckdb', 'db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'createDirectory']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    } catch (error) {
      console.error('Failed to open database file dialog:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_DATABASE, async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Create DuckDB Database File',
        defaultPath: 'database.duckdb',
        filters: [
          { name: 'DuckDB Database', extensions: ['duckdb'] },
          { name: 'Database File', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    } catch (error) {
      console.error('Failed to open save database dialog:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN_DATA_FILE, async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Data File',
        filters: [
          { name: 'Data Files', extensions: ['parquet', 'csv', 'json', 'jsonl'] },
          { name: 'Parquet Files', extensions: ['parquet'] },
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'JSON Files', extensions: ['json', 'jsonl'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths;
    } catch (error) {
      console.error('Failed to open data file dialog:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE_CSV, async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Query Results to CSV',
        defaultPath: 'query_results.csv',
        filters: [
          { name: 'CSV Files', extensions: ['csv'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      return result.filePath;
    } catch (error) {
      console.error('Failed to open save CSV dialog:', error);
      throw error;
    }
  });

  console.log('IPC handlers registered');
}
