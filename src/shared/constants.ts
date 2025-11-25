// Shared constants - IPC channel names

export const IPC_CHANNELS = {
  // Profile management
  PROFILES_LIST: 'duckdbGlass:profiles:list',
  PROFILES_CREATE: 'duckdbGlass:profiles:create',
  PROFILES_UPDATE: 'duckdbGlass:profiles:update',
  PROFILES_DELETE: 'duckdbGlass:profiles:delete',

  // Connection management
  CONNECTION_OPEN: 'duckdbGlass:connection:open',
  CONNECTION_CLOSE: 'duckdbGlass:connection:close',

  // Schema introspection
  SCHEMA_LIST_SCHEMAS: 'duckdbGlass:schema:listSchemas',
  SCHEMA_LIST_TABLES: 'duckdbGlass:schema:listTables',
  SCHEMA_GET_COLUMNS: 'duckdbGlass:schema:getColumns',

  // Constraints
  CONSTRAINTS_LIST: 'duckdbGlass:constraints:list',

  // Query execution
  QUERY_RUN: 'duckdbGlass:query:run',

  // App metadata
  APP_GET_VERSION: 'duckdbGlass:app:getVersion',
} as const;
