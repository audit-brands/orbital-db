// Shared TypeScript types used across main, preload, and renderer processes

export interface DuckDBProfile {
  id: string;
  name: string;
  dbPath: string; // ':memory:' or absolute path
  readOnly?: boolean;
  autoAttachDirs?: string[];
  extensions?: string[];
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

export interface QueryResult {
  columns: { name: string; dataType: string }[];
  rows: unknown[][];
  rowCount: number;
  executionTimeMs: number;
  truncated?: boolean;
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
