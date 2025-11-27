// Shared TypeScript types used across main, preload, and renderer processes

export interface AttachedFile {
  id: string;
  alias: string; // Table name used in SQL queries (e.g., "sales_data")
  path: string; // Absolute file path or URL
  type: 'parquet' | 'csv' | 'json' | 'auto'; // File format, 'auto' for auto-detection
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  timestamp: number; // Unix timestamp in milliseconds
  executionTimeMs: number;
  rowCount: number;
  statementType?: StatementType;
  success: boolean;
  error?: string; // Error message if query failed
}

export interface SavedSnippet {
  id: string;
  name: string;
  description?: string;
  sql: string;
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

export interface DuckDBProfile {
  id: string;
  name: string;
  dbPath: string; // ':memory:' or absolute path
  readOnly?: boolean;
  autoAttachDirs?: string[];
  extensions?: string[];
  attachedFiles?: AttachedFile[]; // Files attached as queryable tables/views
  queryHistory?: QueryHistoryEntry[]; // Last N queries executed on this profile
  savedSnippets?: SavedSnippet[]; // User-saved query snippets
  createdAt: string;
  updatedAt: string;
}

export type DuckDBProfileInput = Omit<DuckDBProfile, 'id' | 'createdAt' | 'updatedAt'>;

export type DuckDBProfileUpdate = Partial<DuckDBProfileInput>;

export interface SchemaInfo {
  schemaName: string;
}

export interface TableInfo {
  schemaName: string;
  tableName: string;
  tableType: 'BASE TABLE' | 'VIEW' | string;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  ordinalPosition: number;
}

export interface QueryParam {
  name?: string;
  value: unknown;
}

export type StatementType = 'DQL' | 'DML' | 'DDL' | 'TCL' | 'UNKNOWN';

export interface QueryResult {
  columns: { name: string; dataType: string }[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs: number;
  truncated?: boolean;
  statementType?: StatementType;
  affectedRows?: number; // For DML operations (INSERT, UPDATE, DELETE)
}

export interface ConstraintInfo {
  constraintName: string;
  constraintType: string; // e.g., PRIMARY KEY, UNIQUE, FOREIGN KEY, CHECK
  columnNames: string[];
  details?: string;
}

export interface QueryOptions {
  rowLimit?: number;
  maxExecutionTimeMs?: number;
  enforceResultLimit?: boolean;
}

// Standardized IPC response wrapper
export interface IpcResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
