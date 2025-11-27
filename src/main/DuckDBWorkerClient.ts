import { Worker } from 'worker_threads';
import type {
  DuckDBProfile,
  QueryResult,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  ConstraintInfo,
  QueryOptions,
} from '../shared/types';

type WorkerMethod =
  | 'openConnection'
  | 'closeConnection'
  | 'closeAllConnections'
  | 'interruptQuery'
  | 'runQuery'
  | 'listSchemas'
  | 'listTables'
  | 'getColumns'
  | 'listConstraints'
  | 'exportToCsv';

interface WorkerRequest {
  id: number;
  method: WorkerMethod;
  args?: unknown[];
}

interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: {
    message: string;
  };
}

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export interface DuckDBExecutor {
  openConnection(profile: DuckDBProfile): Promise<void>;
  closeConnection(profileId: string): Promise<void>;
  closeAllConnections(): Promise<void>;
  interruptQuery(profileId: string): Promise<void>;
  runQuery(profileId: string, sql: string, options?: QueryOptions): Promise<QueryResult>;
  listSchemas(profileId: string): Promise<SchemaInfo[]>;
  listTables(profileId: string, schemaName: string): Promise<TableInfo[]>;
  getColumns(profileId: string, schemaName: string, tableName: string): Promise<ColumnInfo[]>;
  listConstraints(profileId: string, schemaName: string, tableName: string): Promise<ConstraintInfo[]>;
  exportToCsv(profileId: string, sql: string, filePath: string): Promise<number>;
}

export class DuckDBWorkerClient implements DuckDBExecutor {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, PendingRequest<unknown>>();
  private destroyed = false;

  constructor() {
    this.worker = new Worker(new URL('./workers/duckdbWorker.js', import.meta.url), {
      argv: [],
    });

    this.worker.on('message', (message: WorkerResponse) => {
      const pending = this.pending.get(message.id);
      if (!pending) {
        return;
      }
      this.pending.delete(message.id);
      if (message.ok) {
        pending.resolve(message.result);
      } else {
        pending.reject(new Error(message.error?.message || 'DuckDB worker error'));
      }
    });

    this.worker.on('error', (error) => {
      this.rejectAll(error);
    });

    this.worker.on('exit', (code) => {
      if (!this.destroyed && code !== 0) {
        this.rejectAll(new Error(`DuckDB worker exited unexpectedly with code ${code}`));
      }
    });
  }

  private rejectAll(error: unknown): void {
    for (const [, pending] of this.pending.entries()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private call<T>(method: WorkerMethod, ...args: unknown[]): Promise<T> {
    if (this.destroyed) {
      return Promise.reject(new Error('DuckDB worker client has been destroyed.'));
    }
    const id = this.nextId++;
    const payload: WorkerRequest = { id, method, args };
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.worker.postMessage(payload);
    });
  }

  openConnection(profile: DuckDBProfile): Promise<void> {
    return this.call<void>('openConnection', profile);
  }

  closeConnection(profileId: string): Promise<void> {
    return this.call<void>('closeConnection', profileId);
  }

  closeAllConnections(): Promise<void> {
    return this.call<void>('closeAllConnections');
  }

  interruptQuery(profileId: string): Promise<void> {
    return this.call<void>('interruptQuery', profileId);
  }

  runQuery(profileId: string, sql: string, options?: QueryOptions): Promise<QueryResult> {
    return this.call<QueryResult>('runQuery', profileId, sql, options);
  }

  listSchemas(profileId: string): Promise<SchemaInfo[]> {
    return this.call<SchemaInfo[]>('listSchemas', profileId);
  }

  listTables(profileId: string, schemaName: string): Promise<TableInfo[]> {
    return this.call<TableInfo[]>('listTables', profileId, schemaName);
  }

  getColumns(profileId: string, schemaName: string, tableName: string): Promise<ColumnInfo[]> {
    return this.call<ColumnInfo[]>('getColumns', profileId, schemaName, tableName);
  }

  listConstraints(profileId: string, schemaName: string, tableName: string): Promise<ConstraintInfo[]> {
    return this.call<ConstraintInfo[]>('listConstraints', profileId, schemaName, tableName);
  }

  exportToCsv(profileId: string, sql: string, filePath: string): Promise<number> {
    return this.call<number>('exportToCsv', profileId, sql, filePath);
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    try {
      await this.closeAllConnections();
    } catch (error) {
      console.warn('Failed to close DuckDB connections before destroying worker:', error);
    } finally {
      await this.worker.terminate();
    }
  }
}
