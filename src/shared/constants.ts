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
  QUERY_CANCEL: 'orbitalDb:query:cancel',
  QUERY_AUTOCOMPLETE: 'orbitalDb:query:autocomplete',

  // Query history
  QUERY_HISTORY_ADD: 'orbitalDb:queryHistory:add',
  QUERY_HISTORY_GET: 'orbitalDb:queryHistory:get',
  QUERY_HISTORY_CLEAR: 'orbitalDb:queryHistory:clear',

  // Saved snippets
  SNIPPET_ADD: 'orbitalDb:snippet:add',
  SNIPPET_GET: 'orbitalDb:snippet:get',
  SNIPPET_UPDATE: 'orbitalDb:snippet:update',
  SNIPPET_DELETE: 'orbitalDb:snippet:delete',

  // File dialogs
  DIALOG_OPEN_DATABASE: 'orbitalDb:dialog:openDatabase',
  DIALOG_SAVE_DATABASE: 'orbitalDb:dialog:saveDatabase',
  DIALOG_OPEN_DATA_FILE: 'orbitalDb:dialog:openDataFile',
  DIALOG_SAVE_CSV: 'orbitalDb:dialog:saveCsv',

  // App metadata
  APP_GET_VERSION: 'orbitalDb:app:getVersion',
} as const;

export const DEFAULT_RESULT_LIMIT = 1000;
export const DEFAULT_QUERY_TIMEOUT_MS = 60000;

// Saved snippets limits
export const MAX_SNIPPETS_PER_PROFILE = 100;
export const MAX_SNIPPET_NAME_LENGTH = 200;
export const MAX_SNIPPET_DESCRIPTION_LENGTH = 1000;
