// Schema Redux slice

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { SchemaInfo, TableInfo, ColumnInfo } from '@shared/types';

interface SchemaState {
  schemas: SchemaInfo[];
  tables: Record<string, TableInfo[]>; // key: schemaName
  columns: Record<string, ColumnInfo[]>; // key: `${schemaName}.${tableName}`
  loading: boolean;
  error: string | null;
}

const initialState: SchemaState = {
  schemas: [],
  tables: {},
  columns: {},
  loading: false,
  error: null,
};

// Async thunks
export const loadSchemas = createAsyncThunk(
  'schema/loadSchemas',
  async (profileId: string) => {
    return await window.duckdbGlass.schema.listSchemas(profileId);
  }
);

export const loadTables = createAsyncThunk(
  'schema/loadTables',
  async ({ profileId, schemaName }: { profileId: string; schemaName: string }) => {
    const tables = await window.duckdbGlass.schema.listTables(profileId, schemaName);
    return { schemaName, tables };
  }
);

export const loadColumns = createAsyncThunk(
  'schema/loadColumns',
  async ({
    profileId,
    schemaName,
    tableName,
  }: {
    profileId: string;
    schemaName: string;
    tableName: string;
  }) => {
    const columns = await window.duckdbGlass.schema.getColumns(profileId, schemaName, tableName);
    return { schemaName, tableName, columns };
  }
);

const schemaSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    clearSchema: (state) => {
      state.schemas = [];
      state.tables = {};
      state.columns = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Load schemas
      .addCase(loadSchemas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSchemas.fulfilled, (state, action) => {
        state.schemas = action.payload;
        state.loading = false;
      })
      .addCase(loadSchemas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load schemas';
      })
      // Load tables
      .addCase(loadTables.fulfilled, (state, action) => {
        state.tables[action.payload.schemaName] = action.payload.tables;
      })
      // Load columns
      .addCase(loadColumns.fulfilled, (state, action) => {
        const key = `${action.payload.schemaName}.${action.payload.tableName}`;
        state.columns[key] = action.payload.columns;
      });
  },
});

export const { clearSchema } = schemaSlice.actions;
export default schemaSlice.reducer;
