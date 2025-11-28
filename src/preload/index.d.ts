// Type declarations for window.orbitalDb API

import {
  DuckDBProfile,
  DuckDBProfileInput,
  DuckDBProfileUpdate,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  ConstraintInfo,
  QueryResult,
  QueryParam,
  QueryOptions,
  QueryHistoryEntry,
  SavedSnippet,
} from '../shared/types';

declare global {
  interface Window {
    orbitalDb: {
      profiles: {
        list(): Promise<DuckDBProfile[]>;
        create(profile: DuckDBProfileInput): Promise<DuckDBProfile>;
        update(id: string, update: DuckDBProfileUpdate): Promise<DuckDBProfile>;
        delete(id: string): Promise<void>;
      };
      connection: {
        open(profileId: string): Promise<void>;
        close(profileId: string): Promise<void>;
      };
      schema: {
        listSchemas(profileId: string): Promise<SchemaInfo[]>;
        listTables(profileId: string, schemaName: string): Promise<TableInfo[]>;
        getColumns(
          profileId: string,
          schemaName: string,
          tableName: string
        ): Promise<ColumnInfo[]>;
      };
      query: {
        run(
          profileId: string,
          sql: string,
          params?: QueryParam[],
          options?: QueryOptions
        ): Promise<QueryResult>;
        exportCsv(profileId: string, sql: string, filePath: string): Promise<number>;
        cancel(profileId: string): Promise<void>;
        autocomplete(profileId: string, queryString: string): Promise<string[]>;
      };
      queryHistory: {
        add(profileId: string, entry: Omit<QueryHistoryEntry, 'id'>): Promise<QueryHistoryEntry>;
        get(profileId: string): Promise<QueryHistoryEntry[]>;
        clear(profileId: string): Promise<void>;
      };
      snippets: {
        add(
          profileId: string,
          snippet: Omit<SavedSnippet, 'id' | 'createdAt' | 'updatedAt'>
        ): Promise<SavedSnippet>;
        get(profileId: string): Promise<SavedSnippet[]>;
        update(
          profileId: string,
          snippetId: string,
          updates: Partial<Pick<SavedSnippet, 'name' | 'description' | 'sql'>>
        ): Promise<SavedSnippet>;
        delete(profileId: string, snippetId: string): Promise<void>;
      };
      constraints: {
        list(
          profileId: string,
          schemaName: string,
          tableName: string
        ): Promise<ConstraintInfo[]>;
      };
      app: {
        getVersion(): Promise<string>;
      };
      files: {
        selectDataFiles(): Promise<string[] | null>;
        selectDatabase(): Promise<string | null>;
        saveDatabaseAs(): Promise<string | null>;
        saveCsvAs(): Promise<string | null>;
      };
    };
  }
}

export {};
