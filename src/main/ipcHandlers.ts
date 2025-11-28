// IPC Handlers - register all IPC communication handlers

import { ipcMain, app, dialog } from 'electron';
import {
  IPC_CHANNELS,
  MAX_SNIPPETS_PER_PROFILE,
  MAX_SNIPPET_NAME_LENGTH,
  MAX_SNIPPET_DESCRIPTION_LENGTH,
} from '../shared/constants';
import type { DuckDBExecutor } from './DuckDBWorkerClient';
import type { ProfileStore } from './ProfileStore';
import type {
  DuckDBProfileInput,
  DuckDBProfileUpdate,
  QueryHistoryEntry,
  SavedSnippet,
} from '../shared/types';

const MAX_QUERY_HISTORY_PER_PROFILE = 50;

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

  ipcMain.handle(IPC_CHANNELS.QUERY_CANCEL, async (_event, profileId: string) => {
    try {
      await duckdbService.interruptQuery(profileId);
    } catch (error) {
      console.error('Failed to cancel query:', error);
      throw error;
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.QUERY_AUTOCOMPLETE,
    async (_event, profileId: string, queryString: string) => {
      try {
        return await duckdbService.getAutocompleteSuggestions(profileId, queryString);
      } catch (error) {
        // Gracefully return empty array on autocomplete failure
        return [];
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

  // Query history management
  ipcMain.handle(
    IPC_CHANNELS.QUERY_HISTORY_ADD,
    async (_event, profileId: string, entry: Omit<QueryHistoryEntry, 'id'>) => {
      try {
        const profile = await profileStore.getProfile(profileId);
        if (!profile) {
          throw new Error(`Profile not found: ${profileId}`);
        }

        const newEntry: QueryHistoryEntry = {
          ...entry,
          id: `qh_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };

        const history = profile.queryHistory || [];
        const updatedHistory = [newEntry, ...history].slice(0, MAX_QUERY_HISTORY_PER_PROFILE);

        await profileStore.updateProfile(profileId, { queryHistory: updatedHistory });
        return newEntry;
      } catch (error) {
        console.error('Failed to add query history entry:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.QUERY_HISTORY_GET, async (_event, profileId: string) => {
    try {
      const profile = await profileStore.getProfile(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      return profile.queryHistory || [];
    } catch (error) {
      console.error('Failed to get query history:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.QUERY_HISTORY_CLEAR, async (_event, profileId: string) => {
    try {
      await profileStore.updateProfile(profileId, { queryHistory: [] });
    } catch (error) {
      console.error('Failed to clear query history:', error);
      throw error;
    }
  });

  // Saved snippets management
  ipcMain.handle(
    IPC_CHANNELS.SNIPPET_ADD,
    async (_event, profileId: string, snippet: Omit<SavedSnippet, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const profile = await profileStore.getProfile(profileId);
        if (!profile) {
          throw new Error(`Profile not found: ${profileId}`);
        }

        // Validate snippet fields
        if (!snippet.name || typeof snippet.name !== 'string') {
          throw new Error('Snippet name is required and must be a string');
        }

        const trimmedName = snippet.name.trim();
        if (trimmedName.length === 0) {
          throw new Error('Snippet name cannot be empty');
        }

        if (trimmedName.length > MAX_SNIPPET_NAME_LENGTH) {
          throw new Error(`Snippet name cannot exceed ${MAX_SNIPPET_NAME_LENGTH} characters`);
        }

        if (snippet.description !== undefined && snippet.description !== null) {
          if (typeof snippet.description !== 'string') {
            throw new Error('Snippet description must be a string');
          }
          if (snippet.description.length > MAX_SNIPPET_DESCRIPTION_LENGTH) {
            throw new Error(`Snippet description cannot exceed ${MAX_SNIPPET_DESCRIPTION_LENGTH} characters`);
          }
        }

        if (!snippet.sql || typeof snippet.sql !== 'string') {
          throw new Error('Snippet SQL is required and must be a string');
        }

        if (snippet.sql.trim().length === 0) {
          throw new Error('Snippet SQL cannot be empty');
        }

        // Check snippet count limit
        const snippets = profile.savedSnippets || [];
        if (snippets.length >= MAX_SNIPPETS_PER_PROFILE) {
          throw new Error(`Cannot save more than ${MAX_SNIPPETS_PER_PROFILE} snippets per profile`);
        }

        const now = Date.now();
        const newSnippet: SavedSnippet = {
          name: trimmedName,
          description: snippet.description?.trim() || undefined,
          sql: snippet.sql.trim(),
          id: `snippet_${now}_${Math.random().toString(36).substring(7)}`,
          createdAt: now,
          updatedAt: now,
        };

        const updatedSnippets = [...snippets, newSnippet];

        await profileStore.updateProfile(profileId, { savedSnippets: updatedSnippets });
        return newSnippet;
      } catch (error) {
        console.error('Failed to add snippet:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.SNIPPET_GET, async (_event, profileId: string) => {
    try {
      const profile = await profileStore.getProfile(profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      return profile.savedSnippets || [];
    } catch (error) {
      console.error('Failed to get snippets:', error);
      throw error;
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.SNIPPET_UPDATE,
    async (_event, profileId: string, snippetId: string, updates: Partial<Pick<SavedSnippet, 'name' | 'description' | 'sql'>>) => {
      try {
        const profile = await profileStore.getProfile(profileId);
        if (!profile) {
          throw new Error(`Profile not found: ${profileId}`);
        }

        // Validate update fields
        if (updates.name !== undefined) {
          if (typeof updates.name !== 'string') {
            throw new Error('Snippet name must be a string');
          }
          const trimmedName = updates.name.trim();
          if (trimmedName.length === 0) {
            throw new Error('Snippet name cannot be empty');
          }
          if (trimmedName.length > MAX_SNIPPET_NAME_LENGTH) {
            throw new Error(`Snippet name cannot exceed ${MAX_SNIPPET_NAME_LENGTH} characters`);
          }
        }

        if (updates.description !== undefined && updates.description !== null) {
          if (typeof updates.description !== 'string') {
            throw new Error('Snippet description must be a string');
          }
          if (updates.description.length > MAX_SNIPPET_DESCRIPTION_LENGTH) {
            throw new Error(`Snippet description cannot exceed ${MAX_SNIPPET_DESCRIPTION_LENGTH} characters`);
          }
        }

        if (updates.sql !== undefined) {
          if (typeof updates.sql !== 'string') {
            throw new Error('Snippet SQL must be a string');
          }
          if (updates.sql.trim().length === 0) {
            throw new Error('Snippet SQL cannot be empty');
          }
        }

        const snippets = profile.savedSnippets || [];
        const snippetIndex = snippets.findIndex(s => s.id === snippetId);

        if (snippetIndex === -1) {
          throw new Error(`Snippet not found: ${snippetId}`);
        }

        // Normalize updates by trimming strings
        const normalizedUpdates: Partial<Pick<SavedSnippet, 'name' | 'description' | 'sql'>> = {};
        if (updates.name !== undefined) {
          normalizedUpdates.name = updates.name.trim();
        }
        if (updates.description !== undefined) {
          normalizedUpdates.description = updates.description.trim() || undefined;
        }
        if (updates.sql !== undefined) {
          normalizedUpdates.sql = updates.sql.trim();
        }

        const updatedSnippet: SavedSnippet = {
          ...snippets[snippetIndex],
          ...normalizedUpdates,
          updatedAt: Date.now(),
        };

        const updatedSnippets = [
          ...snippets.slice(0, snippetIndex),
          updatedSnippet,
          ...snippets.slice(snippetIndex + 1),
        ];

        await profileStore.updateProfile(profileId, { savedSnippets: updatedSnippets });
        return updatedSnippet;
      } catch (error) {
        console.error('Failed to update snippet:', error);
        throw error;
      }
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.SNIPPET_DELETE,
    async (_event, profileId: string, snippetId: string) => {
      try {
        const profile = await profileStore.getProfile(profileId);
        if (!profile) {
          throw new Error(`Profile not found: ${profileId}`);
        }

        const snippets = profile.savedSnippets || [];
        const updatedSnippets = snippets.filter(s => s.id !== snippetId);

        await profileStore.updateProfile(profileId, { savedSnippets: updatedSnippets });
      } catch (error) {
        console.error('Failed to delete snippet:', error);
        throw error;
      }
    }
  );

  console.log('IPC handlers registered');
}
