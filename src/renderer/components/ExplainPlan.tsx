// EXPLAIN plan visualization component

import type { QueryResult } from '@shared/types';

interface ExplainPlanProps {
  result: QueryResult;
  mode: 'explain' | 'analyze';
}

export default function ExplainPlan({ result, mode }: ExplainPlanProps) {
  // EXPLAIN output comes back as rows with columns like:
  // explain_key | explain_value (for EXPLAIN)
  // or with additional timing/cardinality columns (for EXPLAIN ANALYZE)

  // DuckDB EXPLAIN returns text in a column called 'explain_key' or similar
  // We'll display it as formatted text
  const planText = result.rows.map(row => {
    // Handle different output formats - DuckDB may return plan as single column or multiple columns
    if (result.columns.length === 1) {
      return String(row[0] || '');
    }
    // For multi-column output, join with tabs
    return row.map(cell => String(cell || '')).join('\t');
  }).join('\n');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold">Query Plan</h3>
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            mode === 'explain'
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
              : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
          }`}>
            {mode === 'explain' ? 'EXPLAIN (Estimated)' : 'EXPLAIN ANALYZE (Actual)'}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {result.executionTimeMs.toFixed(2)}ms
        </div>
      </div>

      {/* Info Banner */}
      <div className={`p-3 rounded-lg border ${
        mode === 'explain'
          ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800'
          : 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
      }`}>
        <div className="text-sm">
          {mode === 'explain' ? (
            <>
              <strong>EXPLAIN</strong> shows the query plan with estimated cardinalities.
              The query is <em>not executed</em>.
            </>
          ) : (
            <>
              <strong>EXPLAIN ANALYZE</strong> executes the query and shows actual runtime metrics.
              Compare estimated vs actual cardinalities to identify optimization opportunities.
            </>
          )}
        </div>
      </div>

      {/* Query Plan Output */}
      <div className="bg-gray-900 dark:bg-black rounded-lg p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-green-400 dark:text-green-300 whitespace-pre">
          {planText}
        </pre>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="text-sm text-blue-900 dark:text-blue-200">
          <strong>💡 Reading the plan:</strong>
          <ul className="mt-2 ml-4 space-y-1 list-disc text-xs text-blue-800 dark:text-blue-300">
            <li><strong>SEQ_SCAN</strong> - Sequential table scan (may be slow for large tables)</li>
            <li><strong>INDEX_SCAN</strong> - Using an index (usually faster)</li>
            <li><strong>HASH_JOIN / MERGE_JOIN</strong> - Join strategies</li>
            <li><strong>FILTER</strong> - WHERE clause filtering</li>
            <li><strong>PROJECTION</strong> - SELECT column selection</li>
            {mode === 'analyze' && (
              <li><strong>EC vs Actual</strong> - Large differences indicate statistics may need updating</li>
            )}
          </ul>
        </div>
      </div>

      {/* Advanced Options Hint */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        <strong>Tip:</strong> You can configure explain output with{' '}
        <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
          PRAGMA explain_output = &apos;all&apos;
        </code>{' '}
        to see both physical and optimized plans.
      </div>
    </div>
  );
}
