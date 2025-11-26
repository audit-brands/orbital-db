// Query Editor component for running custom SQL

import { useState } from 'react';
import type { QueryResult } from '@shared/types';
import DataGrid from './DataGrid';

interface QueryEditorProps {
  profileId: string;
}

// Detect SQL statement type
function detectStatementType(sql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CREATE' | 'ALTER' | 'DROP' | 'TRANSACTION' | 'OTHER' {
  const trimmed = sql.trim().toUpperCase();
  if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('CREATE')) return 'CREATE';
  if (trimmed.startsWith('ALTER')) return 'ALTER';
  if (trimmed.startsWith('DROP')) return 'DROP';
  if (trimmed.startsWith('BEGIN') || trimmed.startsWith('COMMIT') || trimmed.startsWith('ROLLBACK')) return 'TRANSACTION';
  return 'OTHER';
}

export default function QueryEditor({ profileId }: QueryEditorProps) {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statementType, setStatementType] = useState<string>('SELECT');

  const handleRunQuery = async () => {
    if (!sql.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Detect statement type
    const stmtType = detectStatementType(sql);
    setStatementType(stmtType);

    try {
      const queryResult = await window.orbitalDb.query.run(profileId, sql);
      setResult(queryResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to run query
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunQuery();
    }
  };

  const handleExportCSV = async () => {
    if (!result || !sql) return;

    try {
      // Show save dialog
      const filePath = await window.orbitalDb.files.saveCsvAs();
      if (!filePath) return; // User cancelled

      // Use DuckDB's native COPY TO command for memory-efficient export
      // This streams directly to disk without loading all data into memory
      const rowCount = await window.orbitalDb.query.exportCsv(profileId, sql, filePath);

      // Show success feedback
      alert(`Successfully exported ${rowCount.toLocaleString()} rows to ${filePath.split('/').pop()}`);
    } catch (err) {
      setError(`Export failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* SQL Editor */}
      <div className="card">
        <div className="mb-2 flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            SQL Query
          </label>
          <span className="text-xs text-gray-500">Press Cmd/Ctrl+Enter to run</span>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full h-40 p-3 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your SQL query here..."
        />
        <div className="mt-3 flex space-x-2">
          <button onClick={handleRunQuery} disabled={loading} className="btn-primary">
            {loading ? 'Running...' : 'Run Query'}
          </button>
          <button
            onClick={() => {
              setSql('');
              setResult(null);
              setError(null);
            }}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="text-red-700 dark:text-red-400 font-medium mb-1">Error</div>
          <div className="text-sm text-red-600 dark:text-red-300 font-mono">{error}</div>
        </div>
      )}

      {result && (
        <div className="card flex-1">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Results</h3>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                {result.executionTimeMs.toFixed(2)}ms
              </div>
              {result.rowCount > 0 && (
                <button
                  onClick={handleExportCSV}
                  className="btn-secondary text-sm"
                  title="Export results to CSV"
                >
                  📥 Export CSV
                </button>
              )}
            </div>
          </div>

          {/* For SELECT queries with data */}
          {statementType === 'SELECT' && result.rowCount > 0 && (
            <>
              <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
              </div>
              <DataGrid result={result} />
            </>
          )}

          {/* For SELECT queries with no data */}
          {statementType === 'SELECT' && result.rowCount === 0 && (
            <div className="text-center py-8 text-gray-500">
              Query executed successfully. No rows returned.
            </div>
          )}

          {/* For DDL statements (CREATE, ALTER, DROP) */}
          {(statementType === 'CREATE' || statementType === 'ALTER' || statementType === 'DROP') && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">
                    {statementType} statement executed successfully
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Schema changes have been applied
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For DML statements (INSERT, UPDATE, DELETE) */}
          {(statementType === 'INSERT' || statementType === 'UPDATE' || statementType === 'DELETE') && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 dark:text-blue-400 text-2xl">✓</span>
                <div>
                  <div className="font-medium text-blue-700 dark:text-blue-300">
                    {statementType} statement executed successfully
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {result.rowCount > 0
                      ? `${result.rowCount} row${result.rowCount !== 1 ? 's' : ''} affected`
                      : 'No rows affected'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For TRANSACTION statements */}
          {statementType === 'TRANSACTION' && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-purple-600 dark:text-purple-400 text-2xl">✓</span>
                <div>
                  <div className="font-medium text-purple-700 dark:text-purple-300">
                    Transaction statement executed successfully
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For OTHER statements */}
          {statementType === 'OTHER' && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600 dark:text-gray-400 text-2xl">✓</span>
                <div>
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    Statement executed successfully
                  </div>
                  {result.rowCount > 0 && (
                    <>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 mb-3">
                        {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
                      </div>
                      <DataGrid result={result} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!result && !error && !loading && (
        <div className="card text-center text-gray-500 py-12">
          Enter a SQL query and click &quot;Run Query&quot; or press Cmd/Ctrl+Enter to see results
        </div>
      )}
    </div>
  );
}
