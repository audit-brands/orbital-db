// Save Snippet Dialog component

import { useState } from 'react';
import { MAX_SNIPPET_NAME_LENGTH, MAX_SNIPPET_DESCRIPTION_LENGTH } from '@shared/constants';

interface SaveSnippetDialogProps {
  sql: string;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}

export default function SaveSnippetDialog({ sql, onSave, onCancel }: SaveSnippetDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!name.trim()) {
      alert('Please enter a name for the SQL query');
      return;
    }

    console.log('Saving SQL:', { name: name.trim(), description: description.trim() });
    onSave(name.trim(), description.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      if (!name.trim()) {
        alert('Please enter a name for the SQL query');
        return;
      }
      onSave(name.trim(), description.trim());
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleDialogClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4"
        onKeyDown={handleKeyDown}
        onClick={handleDialogClick}
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Save SQL Query
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name * ({name.length}/{MAX_SNIPPET_NAME_LENGTH})
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_SNIPPET_NAME_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Top 10 Customers by Revenue"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (optional) ({description.length}/{MAX_SNIPPET_DESCRIPTION_LENGTH})
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_SNIPPET_DESCRIPTION_LENGTH}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what this query does..."
              rows={3}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              SQL Query
            </label>
            <code className="block text-xs font-mono bg-gray-100 dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-auto text-gray-900 dark:text-gray-100">
              {sql}
            </code>
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary">
              Save SQL
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-500 text-right">
            Press Cmd+Enter to save, Esc to cancel
          </div>
        </div>
      </div>
    </div>
  );
}
