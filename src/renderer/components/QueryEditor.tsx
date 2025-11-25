// Query Editor component for running custom SQL

import { useState } from 'react';
import type { QueryResult } from '@shared/types';
import DataGrid from './DataGrid';

interface QueryEditorProps {
  profileId: string;
}

export default function QueryEditor({ profileId }: QueryEditorProps) {
  const [sql, setSql] = useState('SELECT 42 as answer;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunQuery = async () => {
    if (!sql.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const queryResult = await window.duckdbGlass.query.run(profileId, sql);
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
            <div className="text-sm text-gray-500">
              {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} •{' '}
              {result.executionTimeMs.toFixed(2)}ms
            </div>
          </div>
          <DataGrid result={result} />
        </div>
      )}

      {!result && !error && !loading && (
        <div className="card text-center text-gray-500 py-12">
          Enter a SQL query and click "Run Query" or press Cmd/Ctrl+Enter to see results
        </div>
      )}
    </div>
  );
}
