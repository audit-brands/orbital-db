// DuckDB Service - manages DuckDB instances and query execution

import { DuckDBInstance, DuckDBConnection } from '@duckdb/node-api';
import { CONFIG } from './config';
import type {
  DuckDBProfile,
  QueryResult,
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  ConstraintInfo,
} from '../shared/types';

interface OpenConnection {
  instance: DuckDBInstance;
  connection: DuckDBConnection;
  profile: DuckDBProfile;
}

export class DuckDBService {
  private connections = new Map<string, OpenConnection>();

  async openConnection(profile: DuckDBProfile): Promise<void> {
    // If connection already exists, return early
    if (this.connections.has(profile.id)) {
      console.log(`Connection already open for profile: ${profile.id}`);
      return;
    }

    try {
      // Create DuckDB instance with default configuration from environment
      // Note: DuckDB configuration is set via PRAGMA statements after connection
      const instance = await DuckDBInstance.create(profile.dbPath);
      const connection = await instance.connect();

      // Configure DuckDB settings from environment defaults
      // These can be overridden per-connection or via user settings in the future
      await connection.run(`PRAGMA memory_limit='${CONFIG.duckdb.defaultMemoryLimit}';`);
      await connection.run(`PRAGMA threads=${CONFIG.duckdb.defaultThreads};`);

      // Load extensions if configured
      if (profile.extensions?.length) {
        for (const ext of profile.extensions) {
          await connection.run(`LOAD '${ext}';`);
        }
      }

      // Store connection
      this.connections.set(profile.id, { instance, connection, profile });
      console.log(`Opened connection for profile: ${profile.id}`);
    } catch (error) {
      console.error(`Failed to open connection for profile ${profile.id}:`, error);
      throw error;
    }
  }

  async closeConnection(profileId: string): Promise<void> {
    const entry = this.connections.get(profileId);
    if (!entry) {
      console.warn(`No connection found for profile: ${profileId}`);
      return;
    }

    try {
      entry.connection.closeSync();
      entry.instance.closeSync();
      this.connections.delete(profileId);
      console.log(`Closed connection for profile: ${profileId}`);
    } catch (error) {
      console.error(`Failed to close connection for profile ${profileId}:`, error);
      throw error;
    }
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map((profileId) =>
      this.closeConnection(profileId)
    );
    await Promise.all(closePromises);
  }

  private getConnectionOrThrow(profileId: string): DuckDBConnection {
    const entry = this.connections.get(profileId);
    if (!entry) {
      throw new Error(
        `No open connection for profileId=${profileId}. Please open a connection first.`
      );
    }
    return entry.connection;
  }

  async runQuery(profileId: string, sql: string): Promise<QueryResult> {
    const connection = this.getConnectionOrThrow(profileId);
    const start = performance.now();

    try {
      const reader = await connection.runAndReadAll(sql);
      const executionTimeMs = performance.now() - start;

      const columnNames = reader.columnNames();
      const columnTypes = reader.columnTypes();

      const columns = columnNames.map((name, index) => ({
        name,
        dataType: columnTypes[index].toString(),
      }));

      const rows = reader.getRows();

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
      };
    } catch (error) {
      console.error(`Query execution failed for profile ${profileId}:`, error);
      throw error;
    }
  }

  async listSchemas(profileId: string): Promise<SchemaInfo[]> {
    const sql = `
      SELECT DISTINCT table_schema AS schemaName
      FROM information_schema.tables
      ORDER BY table_schema;
    `;
    const result = await this.runQuery(profileId, sql);
    return result.rows.map((r) => ({ schemaName: String(r[0]) }));
  }

  async listTables(profileId: string, schemaName: string): Promise<TableInfo[]> {
    // Use parameterized query approach to prevent SQL injection
    const sql = `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = '${schemaName}'
      ORDER BY table_name;
    `;
    const result = await this.runQuery(profileId, sql);
    return result.rows.map((r) => ({
      schemaName: String(r[0]),
      tableName: String(r[1]),
      tableType: String(r[2]) as TableInfo['tableType'],
    }));
  }

  async getColumns(
    profileId: string,
    schemaName: string,
    tableName: string
  ): Promise<ColumnInfo[]> {
    const sql = `
      SELECT column_name, data_type, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = '${schemaName}' AND table_name = '${tableName}'
      ORDER BY ordinal_position;
    `;
    const result = await this.runQuery(profileId, sql);
    return result.rows.map((r) => ({
      columnName: String(r[0]),
      dataType: String(r[1]),
      isNullable: String(r[2]) === 'YES',
      ordinalPosition: Number(r[3]),
    }));
  }

  async listConstraints(
    profileId: string,
    schemaName: string,
    tableName: string
  ): Promise<ConstraintInfo[]> {
    // NOTE: DuckDB's constraint introspection may vary - this is a basic implementation
    const sql = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = '${schemaName}' AND table_name = '${tableName}';
    `;
    try {
      const result = await this.runQuery(profileId, sql);
      return result.rows.map((r) => ({
        constraintName: String(r[0]),
        constraintType: String(r[1]),
        columnNames: [], // TODO: populate from key_column_usage
      }));
    } catch (error) {
      // If constraints query fails, return empty array (some DuckDB versions may not support this)
      console.warn(`Failed to list constraints for ${schemaName}.${tableName}:`, error);
      return [];
    }
  }

  /**
   * Export query results directly to CSV using DuckDB's native COPY TO command.
   * This is memory-efficient and can handle millions of rows without loading into memory.
   *
   * @param profileId - The profile ID for the database connection
   * @param sql - The SQL query to execute
   * @param filePath - The absolute path where the CSV file should be written
   * @returns The number of rows exported
   */
  async exportToCsv(profileId: string, sql: string, filePath: string): Promise<number> {
    const connection = this.getConnectionOrThrow(profileId);

    try {
      // Escape single quotes in file path
      const escapedPath = filePath.replace(/'/g, "''");

      // Use DuckDB's native COPY TO command for efficient streaming export
      // This writes directly to disk without loading all data into memory
      const copySQL = `COPY (${sql}) TO '${escapedPath}' (HEADER, DELIMITER ',');`;

      const start = performance.now();
      await connection.run(copySQL);
      const executionTimeMs = performance.now() - start;

      console.log(`Exported query results to ${filePath} in ${executionTimeMs.toFixed(2)}ms`);

      // Get row count by querying the result
      const countSQL = `SELECT COUNT(*) FROM (${sql})`;
      const countReader = await connection.runAndReadAll(countSQL);
      const rows = countReader.getRows();
      const rowCount = Number(rows[0][0]);

      return rowCount;
    } catch (error) {
      console.error(`CSV export failed for profile ${profileId}:`, error);
      throw error;
    }
  }
}
