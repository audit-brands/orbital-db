// Saved Snippets component - displays saved query snippets for a profile

import { useState, useEffect, useCallback } from 'react';
import type { SavedSnippet } from '@shared/types';
import { MAX_SNIPPETS_PER_PROFILE } from '@shared/constants';

interface SavedSnippetsProps {
  profileId: string;
  onSelectQuery: (sql: string) => void;
  onEditSnippet?: (snippet: SavedSnippet) => void;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    throw err;
  }
}

export default function SavedSnippets({ profileId, onSelectQuery, onEditSnippet }: SavedSnippetsProps) {
  const [snippets, setSnippets] = useState<SavedSnippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadSnippets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if API is available
      if (!window.orbitalDb?.snippets) {
        console.warn('Snippets API not available yet');
        setSnippets([]);
        return;
      }

      const entries = await window.orbitalDb.snippets.get(profileId);
      // Sort by most recently updated first
      const sorted = entries.sort((a, b) => b.updatedAt - a.updatedAt);
      setSnippets(sorted);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadSnippets();
  }, [loadSnippets]);

  const handleDelete = async (snippetId: string, snippetName: string) => {
    if (!confirm(`Are you sure you want to delete "${snippetName}"?`)) {
      return;
    }

    try {
      if (!window.orbitalDb?.snippets) {
        console.warn('Snippets API not available');
        return;
      }

      await window.orbitalDb.snippets.delete(profileId, snippetId);
      setSnippets(prev => prev.filter(s => s.id !== snippetId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCopy = async (snippet: SavedSnippet) => {
    try {
      await copyToClipboard(snippet.sql);
      setCopiedId(snippet.id);
      setTimeout(() => setCopiedId(null), 2000); // Clear after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="text-sm text-gray-500">Loading saved SQL...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
        <div className="text-sm text-red-700 dark:text-red-400">
          Failed to load saved SQL: {error}
        </div>
      </div>
    );
  }

  if (snippets.length === 0) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Saved SQL</h3>
        </div>
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">No saved SQL yet</p>
          <p className="text-xs mt-1">Save a query to create your first saved SQL</p>
        </div>
      </div>
    );
  }

  const isNearLimit = snippets.length >= MAX_SNIPPETS_PER_PROFILE * 0.9;
  const isAtLimit = snippets.length >= MAX_SNIPPETS_PER_PROFILE;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Saved SQL</h3>
        <span className={`text-xs ${isNearLimit ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-gray-500'}`}>
          {snippets.length}/{MAX_SNIPPETS_PER_PROFILE} queries
        </span>
      </div>

      {isAtLimit && (
        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
          Maximum number of saved queries reached. Delete some queries to save new ones.
        </div>
      )}

      <div className="space-y-2">
        {snippets.map((snippet) => (
          <div
            key={snippet.id}
            className="p-3 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {snippet.name}
                </h4>
                {snippet.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {snippet.description}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                {formatTimestamp(snippet.updatedAt)}
              </span>
            </div>

            <code className="text-xs font-mono block bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 mb-2 overflow-x-auto">
              {snippet.sql.length > 150 ? `${snippet.sql.substring(0, 150)}...` : snippet.sql}
            </code>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => handleCopy(snippet)}
                className="text-xs btn-secondary px-2 py-1"
              >
                {copiedId === snippet.id ? '✓ Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => onSelectQuery(snippet.sql)}
                className="text-xs btn-secondary px-2 py-1"
              >
                Run
              </button>
              {onEditSnippet && (
                <button
                  onClick={() => onEditSnippet(snippet)}
                  className="text-xs btn-secondary px-2 py-1"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDelete(snippet.id, snippet.name)}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-2 py-1"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
