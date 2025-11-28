// Query Editor component for running custom SQL

import { useRef, useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../state/store';
import type { QueryResult, StatementType } from '@shared/types';
import VirtualizedDataGrid from './VirtualizedDataGrid';
import QueryHistory from './QueryHistory';
import SavedSnippets from './SavedSnippets';
import SaveSnippetDialog from './SaveSnippetDialog';
import SqlEditor from './SqlEditor';
import ExplainPlan from './ExplainPlan';
import { getBaseName } from '../utils/path';
import { DEFAULT_RESULT_LIMIT, DEFAULT_QUERY_TIMEOUT_MS } from '@shared/constants';
import { useAppDispatch } from '../state/hooks';
import { addToast } from '../state/slices/uiSlice';

interface QueryEditorProps {
  profileId: string;
  isReadOnly?: boolean;
}

// Statement types that mutate data (should be blocked in read-only mode)
const MUTATING_STATEMENT_TYPES = new Set<StatementType>(['DML', 'DDL', 'TCL']);

type TabView = 'results' | 'history' | 'saved';

export default function QueryEditor({ profileId, isReadOnly = false }: QueryEditorProps) {
  const theme = useSelector((state: RootState) => state.ui.theme);
  const dispatch = useAppDispatch();
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeoutMs, setTimeoutMs] = useState<string>(`${DEFAULT_QUERY_TIMEOUT_MS}`);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabView>('results');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [snippetsRefreshKey, setSnippetsRefreshKey] = useState(0);
  const [explainMode, setExplainMode] = useState<'off' | 'explain' | 'analyze'>('off');
  const [elapsedTime, setElapsedTime] = useState(0);
  const cancelRequestedRef = useRef(false);
  const currentRunRef = useRef<Promise<QueryResult> | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const queryStartTimeRef = useRef<number | null>(null);

  const handleRunQuery = useCallback(async () => {
    const trimmed = sql.trim();
    if (!trimmed) {
      setError('Please enter a SQL query');
      return;
    }

    cancelRequestedRef.current = false;
    setLoading(true);
    setError(null);
    setResult(null);

    // Start tracking query execution time
    const startTime = Date.now();
    queryStartTimeRef.current = startTime;
    setElapsedTime(0);

    // Update elapsed time every 100ms
    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    const parsedTimeout = Number(timeoutMs);
    const maxExecutionTimeMs =
      Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : undefined;

    // Wrap query with EXPLAIN or EXPLAIN ANALYZE if mode is enabled
    let queryToRun = trimmed;
    if (explainMode === 'explain') {
      queryToRun = `EXPLAIN ${trimmed}`;
    } else if (explainMode === 'analyze') {
      queryToRun = `EXPLAIN ANALYZE ${trimmed}`;
    }

    const runPromise = window.orbitalDb.query.run(
      profileId,
      queryToRun,
      undefined,
      {
        rowLimit: DEFAULT_RESULT_LIMIT,
        maxExecutionTimeMs,
        enforceResultLimit: true,
      }
    );

    currentRunRef.current = runPromise;

    runPromise
      .then((queryResult) => {
        if (cancelRequestedRef.current || currentRunRef.current !== runPromise) {
          return;
        }

        // Check read-only enforcement using backend's statement classification
        if (isReadOnly && queryResult.statementType && MUTATING_STATEMENT_TYPES.has(queryResult.statementType)) {
          setError(`This profile is read-only. ${queryResult.statementType} statements are not allowed.`);
          setResult(null);

          // Record failed query in history
          if (window.orbitalDb?.queryHistory) {
            window.orbitalDb.queryHistory.add(profileId, {
              sql: trimmed,
              timestamp: Date.now(),
              executionTimeMs: queryResult.executionTimeMs,
              rowCount: 0,
              statementType: queryResult.statementType,
              success: false,
              error: `This profile is read-only. ${queryResult.statementType} statements are not allowed.`,
            }).catch(err => {
              console.error('Failed to record query history:', err);
            });
          }

          return;
        }

        setResult(queryResult);

        // Show success toast for all statement types
        if (queryResult.statementType) {
          const typeLabel = queryResult.statementType === 'DQL' ? 'Query' :
                          queryResult.statementType === 'DDL' ? 'DDL' :
                          queryResult.statementType === 'DML' ? 'DML' :
                          queryResult.statementType === 'TCL' ? 'Transaction' :
                          'Query';

          const rowInfo = queryResult.statementType === 'DQL' && queryResult.rowCount > 0
            ? ` - ${queryResult.rowCount.toLocaleString()} row${queryResult.rowCount !== 1 ? 's' : ''}`
            : '';

          dispatch(addToast({
            type: 'success',
            message: `${typeLabel} executed successfully in ${queryResult.executionTimeMs.toFixed(0)}ms${rowInfo}`,
            duration: 4000,
          }));
        }

        // Record successful query in history
        if (window.orbitalDb?.queryHistory) {
          window.orbitalDb.queryHistory.add(profileId, {
            sql: trimmed,
            timestamp: Date.now(),
            executionTimeMs: queryResult.executionTimeMs,
            rowCount: queryResult.rowCount,
            statementType: queryResult.statementType,
            success: true,
          }).then(() => {
            // Trigger history refresh and switch to results tab
            setHistoryRefreshKey(prev => prev + 1);
            setActiveTab('results');
          }).catch(err => {
            console.error('Failed to record query history:', err);
          });
        }
      })
      .catch((err) => {
        if (cancelRequestedRef.current) {
          const errorMsg = 'Query cancelled by user';
          setError(errorMsg);

          // Show cancellation toast
          dispatch(addToast({
            type: 'info',
            message: 'Query execution cancelled',
            duration: 3000,
          }));

          // Record cancelled query in history
          if (window.orbitalDb?.queryHistory) {
            window.orbitalDb.queryHistory.add(profileId, {
              sql: trimmed,
              timestamp: Date.now(),
              executionTimeMs: 0,
              rowCount: 0,
              success: false,
              error: errorMsg,
            }).catch(historyErr => {
              console.error('Failed to record query history:', historyErr);
            });
          }
        } else {
          const errorMessage = (err as Error).message;
          setError(errorMessage);

          // Compute elapsed time from ref (in case timer hasn't updated state yet)
          const executionTime = queryStartTimeRef.current ? Date.now() - queryStartTimeRef.current : 0;

          // Check if this is a timeout error
          const isTimeout = errorMessage.toLowerCase().includes('timeout') ||
                           errorMessage.toLowerCase().includes('interrupted') ||
                           errorMessage.toLowerCase().includes('cancelled');

          if (isTimeout) {
            dispatch(addToast({
              type: 'warning',
              message: `Query timed out after ${(executionTime / 1000).toFixed(1)}s. Consider optimizing or increasing timeout.`,
              duration: 6000,
            }));
          }

          // Record failed query in history
          if (window.orbitalDb?.queryHistory) {
            window.orbitalDb.queryHistory.add(profileId, {
              sql: trimmed,
              timestamp: Date.now(),
              executionTimeMs: executionTime,
              rowCount: 0,
              success: false,
              error: errorMessage,
            }).catch(historyErr => {
              console.error('Failed to record query history:', historyErr);
            });
          }
        }
      })
      .finally(() => {
        if (currentRunRef.current === runPromise) {
          currentRunRef.current = null;
          setLoading(false);
          queryStartTimeRef.current = null;

          // Clear the timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      });
  }, [sql, timeoutMs, profileId, isReadOnly, explainMode, dispatch]);

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl+Enter to run query
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunQuery();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunQuery]); // handleRunQuery is now properly memoized

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleCancelQuery = async () => {
    if (!loading) {
      return;
    }
    cancelRequestedRef.current = true;
    try {
      await window.orbitalDb.query.cancel(profileId);
    } catch (err) {
      console.error('Failed to cancel query:', err);
    } finally {
      currentRunRef.current = null;
      setLoading(false);
      setResult(null);
      setError('Query cancelled by user');
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

      // Show success toast
      const fileName = getBaseName(filePath) || 'file';
      dispatch(addToast({
        type: 'success',
        message: `Successfully exported ${rowCount.toLocaleString()} rows to ${fileName}`,
        duration: 5000,
      }));
    } catch (err) {
      dispatch(addToast({
        type: 'error',
        message: `Export failed: ${(err as Error).message}`,
        duration: 7000,
      }));
    }
  };

  const handleSelectHistoryQuery = (historySql: string) => {
    setSql(historySql);
    setError(null);
    setResult(null);
  };

  const handleSaveSnippet = async (name: string, description: string) => {
    try {
      if (!window.orbitalDb?.snippets) {
        console.warn('Snippets API not available');
        return;
      }

      await window.orbitalDb.snippets.add(profileId, {
        name,
        description: description || undefined,
        sql: sql.trim(),
      });

      setShowSaveDialog(false);
      setSnippetsRefreshKey(prev => prev + 1);
      setActiveTab('saved');

      dispatch(addToast({
        type: 'success',
        message: `SQL query saved as "${name}"`,
        duration: 4000,
      }));
    } catch (err) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to save SQL query: ${(err as Error).message}`,
        duration: 7000,
      }));
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
        <div className="border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
          <SqlEditor
            value={sql}
            onChange={setSql}
            onExecute={handleRunQuery}
            readOnly={false}
            theme={theme}
            profileId={profileId}
          />
        </div>

        {/* Progress Indicator */}
        {loading && (
          <div className="mt-3 mb-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full"></div>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {explainMode === 'off' ? 'Executing query...' : explainMode === 'explain' ? 'Generating query plan...' : 'Analyzing query execution...'}
                </span>
              </div>
              <span className="text-sm text-blue-700 dark:text-blue-300 font-mono">
                {(elapsedTime / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-blue-600 dark:bg-blue-400 animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-3 items-center">
          <button onClick={handleRunQuery} disabled={loading} className="btn-primary">
            {loading ? 'Running...' : explainMode === 'off' ? 'Run Query' : explainMode === 'explain' ? 'Explain Query' : 'Explain & Analyze'}
          </button>

          {/* Prominent Cancel Button when query is running */}
          {loading && (
            <button
              onClick={handleCancelQuery}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors shadow-lg animate-pulse"
              title="Cancel the running query"
            >
              ⏹ Cancel Query
            </button>
          )}

          {!loading && (
            <>
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={!sql.trim()}
                className="btn-secondary"
              >
                Save Query
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
            </>
          )}

          {/* EXPLAIN Mode Selector */}
          <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
            <button
              onClick={() => setExplainMode('off')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                explainMode === 'off'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Run query normally"
            >
              Normal
            </button>
            <button
              onClick={() => setExplainMode('explain')}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                explainMode === 'explain'
                  ? 'bg-purple-600 text-white dark:bg-purple-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Show query plan without execution"
            >
              EXPLAIN
            </button>
            <button
              onClick={() => setExplainMode('analyze')}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                explainMode === 'analyze'
                  ? 'bg-orange-600 text-white dark:bg-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              title="Execute query and show actual performance metrics"
            >
              ANALYZE
            </button>
          </div>

          <label className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Timeout (ms)</span>
            <input
              type="number"
              min={1000}
              step={500}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
              className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <span className="text-[10px] text-gray-500">(0 disables)</span>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'results'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Results
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'saved'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Saved
          </button>
        </div>

        {/* Results Tab */}
        {activeTab === 'results' && (
          <>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 mb-4">
                <div className="text-red-700 dark:text-red-400 font-medium mb-1">Error</div>
                <div className="text-sm text-red-600 dark:text-red-300 font-mono">{error}</div>
              </div>
            )}

            {/* EXPLAIN Plan Display */}
            {result && (explainMode === 'explain' || explainMode === 'analyze') && (
              <ExplainPlan result={result} mode={explainMode} />
            )}

            {/* Normal Query Results */}
            {result && explainMode === 'off' && (
        <div className="card flex-1">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Results</h3>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">{result.executionTimeMs.toFixed(2)}ms</div>
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

          {/* For DQL queries (SELECT, WITH, etc.) with data */}
          {result.statementType === 'DQL' && result.rowCount > 0 && (
            <>
              <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} returned
                {result.truncated && (
                  <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                    Showing first {DEFAULT_RESULT_LIMIT.toLocaleString()} rows
                  </span>
                )}
              </div>
              <VirtualizedDataGrid result={result} />
            </>
          )}

          {/* For DQL queries with no data */}
          {result.statementType === 'DQL' && result.rowCount === 0 && (
            <div className="text-center py-8 text-gray-500">
              Query executed successfully. No rows returned.
            </div>
          )}

          {/* For DDL statements (CREATE, ALTER, DROP, etc.) */}
          {result.statementType === 'DDL' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                <div>
                  <div className="font-medium text-green-700 dark:text-green-300">
                    DDL statement executed successfully
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Schema changes have been applied
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For DML statements (INSERT, UPDATE, DELETE, MERGE) */}
          {result.statementType === 'DML' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 dark:text-blue-400 text-2xl">✓</span>
                <div>
                  <div className="font-medium text-blue-700 dark:text-blue-300">
                    DML statement executed successfully
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {result.affectedRows !== undefined
                      ? `${result.affectedRows} row${result.affectedRows !== 1 ? 's' : ''} affected`
                      : result.rowCount > 0
                      ? `${result.rowCount} row${result.rowCount !== 1 ? 's' : ''} affected`
                      : 'No rows affected'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* For TCL statements (BEGIN, COMMIT, ROLLBACK, etc.) */}
          {result.statementType === 'TCL' && (
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

          {/* For UNKNOWN/OTHER statements */}
          {(!result.statementType || result.statementType === 'UNKNOWN') && (
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
                          {result.truncated && (
                            <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                              Showing first {DEFAULT_RESULT_LIMIT.toLocaleString()} rows
                            </span>
                          )}
                        </div>
                      <VirtualizedDataGrid result={result} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

            {!result && !error && !loading && (
              <div className="text-center text-gray-500 py-12">
                Enter a SQL query and click &quot;Run Query&quot; or press Cmd/Ctrl+Enter to see results
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <QueryHistory key={historyRefreshKey} profileId={profileId} onSelectQuery={handleSelectHistoryQuery} />
        )}

        {/* Saved Tab */}
        {activeTab === 'saved' && (
          <SavedSnippets key={snippetsRefreshKey} profileId={profileId} onSelectQuery={handleSelectHistoryQuery} />
        )}
      </div>

      {/* Save Snippet Dialog */}
      {showSaveDialog && (
        <SaveSnippetDialog
          sql={sql.trim()}
          onSave={handleSaveSnippet}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
