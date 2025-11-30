// Performance Statistics Page - Query performance insights and trends

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { SLOW_QUERY_THRESHOLD_MS } from '@shared/constants';
import type { QueryHistoryEntry } from '@shared/types';

interface PerformanceMetrics {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  slowQueries: number;
  avgExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  fastestQuery: QueryHistoryEntry | null;
  slowestQuery: QueryHistoryEntry | null;
  totalRowsReturned: number;
}

export default function PerformanceStatsPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');

  useEffect(() => {
    async function loadHistory() {
      if (!profileId) return;

      setLoading(true);
      try {
        const entries = await window.orbitalDb.queryHistory.get(profileId);
        setHistory(entries);
      } catch (err) {
        console.error('Failed to load query history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [profileId]);

  useEffect(() => {
    if (history.length === 0) {
      setMetrics(null);
      return;
    }

    // Filter by time range
    const now = Date.now();
    const cutoffTime = {
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000,
      '30d': now - 30 * 24 * 60 * 60 * 1000,
      'all': 0,
    }[timeRange];

    const filtered = history.filter(entry => entry.timestamp >= cutoffTime);

    if (filtered.length === 0) {
      setMetrics(null);
      return;
    }

    // Calculate metrics
    const successful = filtered.filter(e => e.success);
    const failed = filtered.filter(e => !e.success);
    const slow = successful.filter(e => e.executionTimeMs >= SLOW_QUERY_THRESHOLD_MS);

    const executionTimes = successful.map(e => e.executionTimeMs).sort((a, b) => a - b);
    const avgTime = executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length;
    const medianTime = executionTimes[Math.floor(executionTimes.length / 2)] || 0;
    const p95Time = executionTimes[Math.floor(executionTimes.length * 0.95)] || 0;

    const fastest = successful.length > 0
      ? successful.reduce((min, e) => e.executionTimeMs < min.executionTimeMs ? e : min)
      : null;

    const slowest = successful.length > 0
      ? successful.reduce((max, e) => e.executionTimeMs > max.executionTimeMs ? e : max)
      : null;

    const totalRows = successful.reduce((sum, e) => sum + e.rowCount, 0);

    setMetrics({
      totalQueries: filtered.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      slowQueries: slow.length,
      avgExecutionTime: avgTime,
      medianExecutionTime: medianTime,
      p95ExecutionTime: p95Time,
      fastestQuery: fastest,
      slowestQuery: slowest,
      totalRowsReturned: totalRows,
    });
  }, [history, timeRange]);

  if (!profileId) {
    return (
      <div className="text-center py-12 text-red-600">
        Invalid profile ID
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Performance Statistics</h1>

        {/* Time Range Selector */}
        <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
          {(['24h', '7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              } ${range !== '24h' ? 'border-l border-gray-300 dark:border-gray-600' : ''}`}
            >
              {range === '24h' ? 'Last 24h' : range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading performance data...</div>
      ) : !metrics ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-2">No query history for the selected time range.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Run some queries to see performance statistics here.
          </p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Queries */}
            <div className="card">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Queries</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {metrics.totalQueries.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.successfulQueries} successful, {metrics.failedQueries} failed
              </div>
            </div>

            {/* Success Rate */}
            <div className="card">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Success Rate</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {metrics.totalQueries > 0 ? ((metrics.successfulQueries / metrics.totalQueries) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.successfulQueries} of {metrics.totalQueries} queries
              </div>
            </div>

            {/* Slow Queries */}
            <div className="card">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Slow Queries</div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {metrics.slowQueries}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {metrics.successfulQueries > 0 ? ((metrics.slowQueries / metrics.successfulQueries) * 100).toFixed(1) : 0}% of successful
              </div>
            </div>

            {/* Total Rows */}
            <div className="card">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Rows</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {metrics.totalRowsReturned.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Avg {metrics.successfulQueries > 0 ? Math.round(metrics.totalRowsReturned / metrics.successfulQueries).toLocaleString() : 0} per query
              </div>
            </div>
          </div>

          {/* Execution Time Statistics */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Execution Time Distribution</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics.avgExecutionTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Mean execution time
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Median (p50)</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics.medianExecutionTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  50th percentile
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">p95</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {metrics.p95ExecutionTime.toFixed(0)}ms
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  95th percentile
                </div>
              </div>
            </div>
          </div>

          {/* Fastest and Slowest Queries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Fastest Query */}
            {metrics.fastestQuery && (
              <div className="card bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">⚡</span>
                  <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Fastest Query</h3>
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {metrics.fastestQuery.executionTimeMs.toFixed(0)}ms
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded p-2 border border-green-200 dark:border-green-800">
                  <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                    {metrics.fastestQuery.sql.length > 150
                      ? `${metrics.fastestQuery.sql.substring(0, 150)}...`
                      : metrics.fastestQuery.sql}
                  </code>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {new Date(metrics.fastestQuery.timestamp).toLocaleString()}
                </div>
              </div>
            )}

            {/* Slowest Query */}
            {metrics.slowestQuery && (
              <div className="card bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl">🐌</span>
                  <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">Slowest Query</h3>
                </div>
                <div className="mb-2">
                  <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {(metrics.slowestQuery.executionTimeMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded p-2 border border-yellow-200 dark:border-yellow-800">
                  <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                    {metrics.slowestQuery.sql.length > 150
                      ? `${metrics.slowestQuery.sql.substring(0, 150)}...`
                      : metrics.slowestQuery.sql}
                  </code>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {new Date(metrics.slowestQuery.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {/* Performance Tips */}
          {metrics.slowQueries > 0 && (
            <div className="card bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-3">
                💡 Performance Optimization Tips
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>
                    You have <strong>{metrics.slowQueries} slow {metrics.slowQueries === 1 ? 'query' : 'queries'}</strong> (taking &gt;5s).
                    Consider adding indexes on frequently filtered columns.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>
                    Use <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">EXPLAIN ANALYZE</code> to understand query execution plans.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>
                    Limit result sets when exploring data. Use <code className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">LIMIT</code> clauses to avoid fetching millions of rows.
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                  <span>
                    Consider using Parquet format for large datasets. It&apos;s optimized for analytical queries and offers better compression.
                  </span>
                </li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
