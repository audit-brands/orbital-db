// Shared constants - IPC channel names

export const IPC_CHANNELS = {
  // Profile management
  PROFILES_LIST: 'orbitalDb:profiles:list',
  PROFILES_CREATE: 'orbitalDb:profiles:create',
  PROFILES_UPDATE: 'orbitalDb:profiles:update',
  PROFILES_DELETE: 'orbitalDb:profiles:delete',

  // Connection management
  CONNECTION_OPEN: 'orbitalDb:connection:open',
  CONNECTION_CLOSE: 'orbitalDb:connection:close',

  // Schema introspection
  SCHEMA_LIST_SCHEMAS: 'orbitalDb:schema:listSchemas',
  SCHEMA_LIST_TABLES: 'orbitalDb:schema:listTables',
  SCHEMA_GET_COLUMNS: 'orbitalDb:schema:getColumns',

  // Constraints
  CONSTRAINTS_LIST: 'orbitalDb:constraints:list',

  // Query execution
  QUERY_RUN: 'orbitalDb:query:run',
  QUERY_EXPORT_CSV: 'orbitalDb:query:exportCsv',

  // File dialogs
  DIALOG_OPEN_DATABASE: 'orbitalDb:dialog:openDatabase',
  DIALOG_SAVE_DATABASE: 'orbitalDb:dialog:saveDatabase',
  DIALOG_OPEN_DATA_FILE: 'orbitalDb:dialog:openDataFile',
  DIALOG_SAVE_CSV: 'orbitalDb:dialog:saveCsv',

  // File operations
  FILE_WRITE: 'orbitalDb:file:write',

  // App metadata
  APP_GET_VERSION: 'orbitalDb:app:getVersion',
} as const;
