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
  QueryOptions,
  AttachedFile,
  StatementType,
} from '../shared/types';

interface OpenConnection {
  instance: DuckDBInstance;
  connection: DuckDBConnection;
  profile: DuckDBProfile;
}

export class DuckDBService {
  private connections = new Map<string, OpenConnection>();
  private profileLocks = new Map<string, Promise<void>>();

  private async withProfileLock<T>(profileId: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.profileLocks.get(profileId) ?? Promise.resolve();
    let release: (() => void) | undefined;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const chained = previous
      .catch(() => undefined)
      .then(() => current);

    this.profileLocks.set(profileId, chained);

    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release?.();
      if (this.profileLocks.get(profileId) === chained) {
        this.profileLocks.delete(profileId);
      }
    }
  }

  async openConnection(profile: DuckDBProfile): Promise<void> {
    await this.withProfileLock(profile.id, async () => {
      if (this.connections.has(profile.id)) {
        // Connection already open, reuse existing
        return;
      }

      let instance: DuckDBInstance | undefined;
      let connection: DuckDBConnection | undefined;

      try {
        instance = await DuckDBInstance.create(profile.dbPath);
        connection = await instance.connect();

        if (profile.readOnly) {
          await connection.run('PRAGMA read_only=1;');
        }

        await connection.run(`PRAGMA memory_limit='${CONFIG.duckdb.defaultMemoryLimit}';`);
        await connection.run(`PRAGMA threads=${CONFIG.duckdb.defaultThreads};`);

        if (profile.extensions?.length) {
          for (const ext of profile.extensions) {
            await connection.run(`LOAD '${ext}';`);
          }
        }

        // Create views for attached files
        if (profile.attachedFiles?.length) {
          for (const file of profile.attachedFiles) {
            await this.createAttachedFileView(connection, file);
          }
        }

        this.connections.set(profile.id, { instance, connection, profile });
      } catch (error) {
        // Clean up partially created resources on failure
        if (connection) {
          try {
            connection.closeSync();
          } catch (closeError) {
            // Silently ignore cleanup errors
          }
        }
        if (instance) {
          try {
            instance.closeSync();
          } catch (closeError) {
            // Silently ignore cleanup errors
          }
        }
        throw error;
      }
    });
  }

  async closeConnection(profileId: string): Promise<void> {
    await this.withProfileLock(profileId, async () => {
      const entry = this.connections.get(profileId);
      if (!entry) {
        // No connection to close
        return;
      }

      entry.connection.closeSync();
      entry.instance.closeSync();
      this.connections.delete(profileId);
    });
  }

  async closeAllConnections(): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map((profileId) =>
      this.closeConnection(profileId)
    );
    await Promise.all(closePromises);
  }

  async destroy(): Promise<void> {
    await this.closeAllConnections();
  }

  /**
   * Creates a view for an attached file using DuckDB's read functions.
   * This allows querying external files (CSV, Parquet, JSON) as if they were tables.
   */
  private async createAttachedFileView(
    connection: DuckDBConnection,
    file: AttachedFile
  ): Promise<void> {
    const escapedPath = file.path.replace(/'/g, "''");
    const escapedAlias = file.alias.replace(/"/g, '""');

    let readFunction: string;

    switch (file.type) {
      case 'csv':
        readFunction = `read_csv('${escapedPath}', AUTO_DETECT=TRUE)`;
        break;
      case 'parquet':
        readFunction = `read_parquet('${escapedPath}')`;
        break;
      case 'json':
        readFunction = `read_json('${escapedPath}', AUTO_DETECT=TRUE)`;
        break;
      case 'auto': {
        // Try to detect based on file extension
        const ext = file.path.toLowerCase().split('.').pop();
        if (ext === 'csv') {
          readFunction = `read_csv('${escapedPath}', AUTO_DETECT=TRUE)`;
        } else if (ext === 'parquet') {
          readFunction = `read_parquet('${escapedPath}')`;
        } else if (ext === 'json' || ext === 'jsonl' || ext === 'ndjson') {
          readFunction = `read_json('${escapedPath}', AUTO_DETECT=TRUE)`;
        } else {
          // Default to CSV for unknown types
          readFunction = `read_csv('${escapedPath}', AUTO_DETECT=TRUE)`;
        }
        break;
      }
      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }

    try {
      const createViewSQL = `CREATE OR REPLACE VIEW "${escapedAlias}" AS SELECT * FROM ${readFunction}`;
      await connection.run(createViewSQL);
    } catch (error) {
      throw new Error(
        `Failed to attach file "${file.alias}": ${(error as Error).message}`
      );
    }
  }

  async interruptQuery(profileId: string): Promise<void> {
    const entry = this.connections.get(profileId);
    if (!entry) {
      // No connection to interrupt
      return;
    }
    entry.connection.interrupt();
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

  async runQuery(profileId: string, sql: string, options?: QueryOptions): Promise<QueryResult> {
    return this.withProfileLock(profileId, async () => {
      const connection = this.getConnectionOrThrow(profileId);
      const start = performance.now();
      const rowLimit = options?.rowLimit ?? CONFIG.results.maxRows;
      const maxExecutionTimeMs = options?.maxExecutionTimeMs ?? CONFIG.results.maxExecutionTimeMs;
      const enforceLimit = Boolean(options?.enforceResultLimit);

      const { wrappedSql, limitApplied } = maybeWrapQueryWithLimit(sql, rowLimit, enforceLimit);
      const sqlToExecute = limitApplied ? wrappedSql : sql;

      let timer: NodeJS.Timeout | null = null;
      const basePromise = connection.runAndReadAll(sqlToExecute);
      let readerPromise: Promise<Awaited<typeof basePromise>> = basePromise;
      if (maxExecutionTimeMs > 0) {
        basePromise.catch(() => {
          // Swallow rejections when timeout fires; race promise will handle error.
        });
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            try {
              connection.interrupt();
            } catch (interruptError) {
              // Silently ignore interrupt errors
            }
            reject(new Error(`Query exceeded the configured timeout of ${maxExecutionTimeMs}ms`));
          }, maxExecutionTimeMs);
        });
        readerPromise = Promise.race([basePromise, timeoutPromise]);
      }

      let reader;
      try {
        reader = await readerPromise;
      } catch (error) {
        // Enhance error message with helpful context
        throw enhanceQueryError(error, sql);
      }
      if (timer) {
        clearTimeout(timer);
      }
      const executionTimeMs = performance.now() - start;

      const columnNames = reader.columnNames();
      const columnTypes = reader.columnTypes();

      const columns = columnNames.map((name, index) => ({
        name,
        dataType: columnTypes[index].toString(),
      }));

      const rows = reader.getRows();
      let resultRows = rows;
      let truncated = false;
      if (rowLimit && rowLimit > 0) {
        if (rows.length > rowLimit) {
          resultRows = rows.slice(0, rowLimit);
          truncated = true;
        }
      }

      const statementType = detectStatementType(sql);

      // For DML operations, rowCount represents affected rows
      // For DQL operations, rowCount represents returned rows
      const affectedRows = statementType === 'DML' ? resultRows.length : undefined;

      return {
        columns,
        rows: resultRows,
        rowCount: resultRows.length,
        executionTimeMs,
        truncated,
        statementType,
        affectedRows,
      };
    });
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
    // Safely escape schema name to prevent SQL injection
    const escapedSchema = escapeSqlString(schemaName);
    const sql = `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = '${escapedSchema}'
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
    // Safely escape schema and table names to prevent SQL injection
    const escapedSchema = escapeSqlString(schemaName);
    const escapedTable = escapeSqlString(tableName);
    const sql = `
      SELECT column_name, data_type, is_nullable, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = '${escapedSchema}' AND table_name = '${escapedTable}'
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
    // Safely escape schema and table names to prevent SQL injection
    const escapedSchema = escapeSqlString(schemaName);
    const escapedTable = escapeSqlString(tableName);
    const sql = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = '${escapedSchema}' AND table_name = '${escapedTable}';
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
      return [];
    }
  }

  /**
   * Get autocomplete suggestions from DuckDB using the sql_auto_complete function.
   * This provides context-aware suggestions including keywords, table names, column names, and functions.
   *
   * @param profileId - The profile ID for the database connection
   * @param queryString - The partial SQL query to autocomplete
   * @returns Array of autocomplete suggestions
   */
  async getAutocompleteSuggestions(profileId: string, queryString: string): Promise<string[]> {
    return this.withProfileLock(profileId, async () => {
      const connection = this.getConnectionOrThrow(profileId);

      try {
        // Use DuckDB's native sql_auto_complete function
        const escapedQuery = queryString.replace(/'/g, "''");
        const autocompleteSQL = `SELECT suggestion FROM sql_auto_complete('${escapedQuery}')`;

        const reader = await connection.runAndReadAll(autocompleteSQL);
        const rows = reader.getRows();

        // Extract suggestion strings from rows
        const suggestions = rows.map(row => String(row[0]));

        // Post-process suggestions to fix known DuckDB autocomplete quirks
        return filterAndCorrectSuggestions(suggestions, queryString);
      } catch (error) {
        // If autocomplete fails, return empty array (graceful degradation)
        return [];
      }
    });
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
    return this.withProfileLock(profileId, async () => {
      const connection = this.getConnectionOrThrow(profileId);

      const escapedPath = filePath.replace(/'/g, "''");
      const copySQL = `COPY (${sql}) TO '${escapedPath}' (HEADER, DELIMITER ',');`;

      await connection.run(copySQL);

      const countSQL = `SELECT COUNT(*) FROM (${sql})`;
      const countReader = await connection.runAndReadAll(countSQL);
      const rows = countReader.getRows();
      const rowCount = Number(rows[0][0]);

      return rowCount;
    });
  }
}

/**
 * Safely escapes a SQL string literal by replacing single quotes with two single quotes.
 * This prevents SQL injection when using user input in WHERE clauses.
 */
function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

function trimTrailingSemicolon(sql: string): string {
  return sql.replace(/;\s*$/, '').trim();
}

function detectStatementType(sql: string): StatementType {
  const trimmed = sql.trim().toUpperCase();
  const firstWord = trimmed.split(/\s+/)[0];

  // DQL - Data Query Language (including utility commands that query metadata)
  // FROM-first syntax: "FROM table SELECT *" is DQL (returns data like SELECT)
  if (firstWord === 'SELECT' || firstWord === 'WITH' || firstWord === 'FROM' || trimmed.startsWith('(SELECT')) {
    return 'DQL';
  }

  // PIVOT/UNPIVOT operations (DuckDB extension) - these also return data
  if (['PIVOT', 'UNPIVOT'].includes(firstWord)) {
    return 'DQL';
  }

  // Utility/metadata commands - treat as DQL since they query information
  if (['SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'SUMMARIZE', 'PRAGMA'].includes(firstWord)) {
    return 'DQL';
  }

  // DML - Data Manipulation Language
  if (['INSERT', 'UPDATE', 'DELETE', 'MERGE'].includes(firstWord)) {
    return 'DML';
  }

  // DDL - Data Definition Language
  if ([
    'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'RENAME',
    'COMMENT', 'VACUUM', 'ANALYZE'
  ].includes(firstWord)) {
    return 'DDL';
  }

  // TCL - Transaction Control Language
  if (['BEGIN', 'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'START'].includes(firstWord)) {
    return 'TCL';
  }

  return 'UNKNOWN';
}

function isSelectLike(sql: string): boolean {
  const trimmed = sql.trim();
  if (!trimmed) {
    return false;
  }
  const sanitized = trimmed.replace(/^\(+/, '').trimStart().toUpperCase();
  return sanitized.startsWith('SELECT') || sanitized.startsWith('WITH');
}

function maybeWrapQueryWithLimit(
  sql: string,
  rowLimit: number | undefined,
  enforce: boolean
): { wrappedSql: string; limitApplied: boolean } {
  if (!enforce || !rowLimit || rowLimit <= 0) {
    return { wrappedSql: sql, limitApplied: false };
  }

  const trimmed = sql.trim();
  if (!trimmed) {
    return { wrappedSql: sql, limitApplied: false };
  }

  const withoutSemicolon = trimTrailingSemicolon(trimmed);
  if (!isSelectLike(withoutSemicolon)) {
    return { wrappedSql: sql, limitApplied: false };
  }

  if (withoutSemicolon.includes(';')) {
    // Multiple statements detected - do not wrap to avoid altering behavior
    return { wrappedSql: sql, limitApplied: false };
  }

  // Check if query already has a LIMIT clause - if so, don't wrap
  // Use case-insensitive regex to detect LIMIT keyword
  const hasLimitClause = /\bLIMIT\b/i.test(withoutSemicolon);
  if (hasLimitClause) {
    // Query already has LIMIT, don't wrap it
    return { wrappedSql: sql, limitApplied: false };
  }

  const limitWithSentinel = rowLimit + 1;
  const wrappedSql = `SELECT * FROM (${withoutSemicolon}) AS orbital_limited_result LIMIT ${limitWithSentinel}`;
  return { wrappedSql, limitApplied: true };
}

/**
 * Enhances DuckDB error messages with user-friendly context and suggestions.
 * Detects common SQL mistakes and provides helpful guidance.
 */
function enhanceQueryError(error: unknown, sql: string): Error {
  const originalMessage = (error as Error).message;

  // Common SQL keyword typos and corrections
  const commonMistakes = [
    { pattern: /\bSHOW\s+TABLE\s*$/i, suggestion: 'Did you mean "SHOW TABLES"? The correct command is "SHOW TABLES" (plural).' },
    { pattern: /\bSELECT\s+.*\s+FORM\s+/i, suggestion: 'Did you mean "FROM" instead of "FORM"?' },
    { pattern: /\bWHERE\s+.*\s+EQUAL\s+/i, suggestion: 'Did you mean "=" instead of "EQUAL"?' },
    { pattern: /\bORDER\s+(?!BY)/i, suggestion: 'Did you mean "ORDER BY"?' },
    { pattern: /\bGROUP\s+(?!BY)/i, suggestion: 'Did you mean "GROUP BY"?' },
  ];

  // Check for common mistakes in the SQL
  for (const mistake of commonMistakes) {
    if (mistake.pattern.test(sql)) {
      return new Error(`${originalMessage}\n\n${mistake.suggestion}`);
    }
  }

  // If it's a parser error at end of input, provide more context
  if (originalMessage.includes('syntax error at end of input')) {
    return new Error(
      `${originalMessage}\n\nYour query appears to be incomplete or has a syntax error. ` +
      `Check for missing keywords, parentheses, or semicolons.`
    );
  }

  // If it's a generic parser error, suggest checking syntax
  if (originalMessage.includes('Parser Error')) {
    return new Error(
      `${originalMessage}\n\nCheck your SQL syntax. Common issues include:\n` +
      `- Misspelled keywords (e.g., "FORM" instead of "FROM")\n` +
      `- Missing or mismatched quotes\n` +
      `- Missing commas or parentheses`
    );
  }

  // Return original error if we can't enhance it
  return error as Error;
}

/**
 * Filters and corrects autocomplete suggestions from DuckDB to fix known quirks.
 *
 * Known issues:
 * - DuckDB suggests "table" instead of "tables" for "SHOW TA..." context
 * - Need to filter out invalid suggestions for certain contexts
 *
 * @param suggestions - Raw suggestions from DuckDB's sql_auto_complete
 * @param queryString - The partial SQL query being completed
 * @returns Filtered and corrected suggestions
 */
function filterAndCorrectSuggestions(suggestions: string[], queryString: string): string[] {
  const normalizedQuery = queryString.trim().toUpperCase();

  // Special case: SHOW command - only suggest valid SHOW targets
  if (normalizedQuery.startsWith('SHOW')) {
    // Filter out invalid suggestions like "table" (singular)
    const filtered = suggestions.filter(suggestion => {
      const upper = suggestion.toUpperCase();

      // Remove "TABLE" (singular) from suggestions for SHOW command
      if (upper === 'TABLE') {
        return false;
      }

      return true;
    });

    // If user typed "SHOW TA", ensure "TABLES" is in the list
    if (normalizedQuery.match(/^SHOW\s+TA/)) {
      if (!filtered.some(s => s.toUpperCase() === 'TABLES')) {
        filtered.unshift('TABLES');
      }
      // Remove any "table" (case-insensitive) suggestions
      return filtered.filter(s => s.toUpperCase() !== 'TABLE');
    }

    return filtered;
  }

  return suggestions;
}
