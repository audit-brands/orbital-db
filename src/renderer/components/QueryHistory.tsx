// Query History component - displays past queries for a profile

import { useState, useEffect, useCallback } from 'react';
import type { QueryHistoryEntry } from '@shared/types';

interface QueryHistoryProps {
  profileId: string;
  onSelectQuery: (sql: string) => void;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw err;
  }
}

export default function QueryHistory({ profileId, onSelectQuery }: QueryHistoryProps) {
  const [history, setHistory] = useState<QueryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'DQL' | 'DML' | 'DDL' | 'TCL'>('all');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if API is available
      if (!window.orbitalDb?.queryHistory) {
        console.warn('Query history API not available yet');
        setHistory([]);
        return;
      }

      const entries = await window.orbitalDb.queryHistory.get(profileId);
      setHistory(entries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClearHistory = async () => {
    if (!confirm('Are you sure you want to clear all query history for this profile?')) {
      return;
    }

    try {
      if (!window.orbitalDb?.queryHistory) {
        console.warn('Query history API not available');
        return;
      }

      await window.orbitalDb.queryHistory.clear(profileId);
      setHistory([]);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCopy = async (entry: QueryHistoryEntry) => {
    try {
      await copyToClipboard(entry.sql);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getStatementTypeColor = (statementType?: string) => {
    switch (statementType) {
      case 'DQL': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'DML': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'DDL': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'TCL': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-sm text-gray-500">Loading query history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="text-sm text-red-700 dark:text-red-400">
          Failed to load query history: {error}
        </div>
      </div>
    );
  }

  // Apply filters
  const filteredHistory = history.filter((entry) => {
    // Search filter (case-insensitive SQL text search)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      if (!entry.sql.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'success' && !entry.success) return false;
    if (statusFilter === 'failed' && entry.success) return false;

    // Statement type filter
    if (typeFilter !== 'all' && entry.statementType !== typeFilter) return false;

    return true;
  });

  const hasActiveFilters = searchText || statusFilter !== 'all' || typeFilter !== 'all';

  if (history.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Query History</h3>
        </div>
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No query history yet</p>
          <p className="text-xs mt-1">Execute a query to see it here</p>
        </div>
      </div>
    );
  }

  const displayedHistory = isExpanded ? filteredHistory : filteredHistory.slice(0, 5);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Query History</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {filteredHistory.length} {filteredHistory.length !== history.length && `of ${history.length}`} queries
          </span>
          <button
            onClick={handleClearHistory}
            className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-3 space-y-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search SQL..."
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'failed')}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success Only</option>
            <option value="failed">Failed Only</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | 'DQL' | 'DML' | 'DDL' | 'TCL')}
            className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="DQL">DQL (SELECT)</option>
            <option value="DML">DML (INSERT/UPDATE/DELETE)</option>
            <option value="DDL">DDL (CREATE/ALTER/DROP)</option>
            <option value="TCL">TCL (TRANSACTION)</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No queries match your filters</p>
          <p className="text-xs mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedHistory.map((entry) => (
            <div
              key={entry.id}
              className={`p-3 rounded border ${
                entry.success
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {entry.statementType && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${getStatementTypeColor(entry.statementType)}`}>
                      {entry.statementType}
                    </span>
                  )}
                  {!entry.success && (
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                      Failed
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{formatTimestamp(entry.timestamp)}</span>
              </div>

              <code className="text-xs font-mono block bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 mb-2 overflow-x-auto">
                {entry.sql.length > 150 ? `${entry.sql.substring(0, 150)}...` : entry.sql}
              </code>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs text-gray-600 dark:text-gray-400">
                  {entry.success && (
                    <>
                      <span>{entry.rowCount.toLocaleString()} rows</span>
                      <span>{entry.executionTimeMs.toFixed(2)}ms</span>
                    </>
                  )}
                  {!entry.success && entry.error && (
                    <span className="text-red-600 dark:text-red-400">{entry.error}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(entry)}
                    className="text-xs btn-secondary px-2 py-1"
                  >
                    {copiedId === entry.id ? '✓ Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => onSelectQuery(entry.sql)}
                    className="text-xs btn-secondary px-2 py-1"
                  >
                    Run Again
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredHistory.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          {isExpanded ? 'Show Less' : `Show All (${filteredHistory.length})`}
        </button>
      )}
    </div>
  );
}
