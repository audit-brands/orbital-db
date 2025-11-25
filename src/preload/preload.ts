// Preload script - bridges renderer and main process via contextBridge

import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/constants';
import type {
  DuckDBProfile,
  DuckDBProfileInput,
  DuckDBProfileUpdate,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  ConstraintInfo,
  QueryResult,
  QueryParam,
} from '../shared/types';

// Expose the DuckDB Glass API to the renderer process
contextBridge.exposeInMainWorld('duckdbGlass', {
  profiles: {
    list: (): Promise<DuckDBProfile[]> => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_LIST),
    create: (input: DuckDBProfileInput): Promise<DuckDBProfile> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_CREATE, input),
    update: (id: string, update: DuckDBProfileUpdate): Promise<DuckDBProfile> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROFILES_UPDATE, id, update),
    delete: (id: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.PROFILES_DELETE, id),
  },
  connection: {
    open: (profileId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_OPEN, profileId),
    close: (profileId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_CLOSE, profileId),
  },
  schema: {
    listSchemas: (profileId: string): Promise<SchemaInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_LIST_SCHEMAS, profileId),
    listTables: (profileId: string, schemaName: string): Promise<TableInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_LIST_TABLES, profileId, schemaName),
    getColumns: (
      profileId: string,
      schemaName: string,
      tableName: string
    ): Promise<ColumnInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_GET_COLUMNS, profileId, schemaName, tableName),
  },
  query: {
    run: (profileId: string, sql: string, _params?: QueryParam[]): Promise<QueryResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.QUERY_RUN, profileId, sql),
  },
  constraints: {
    list: (
      profileId: string,
      schemaName: string,
      tableName: string
    ): Promise<ConstraintInfo[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONSTRAINTS_LIST, profileId, schemaName, tableName),
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
  },
});
