// Connection creation/edit form

import { useState } from 'react';
import type { DuckDBProfileInput, AttachedFile } from '@shared/types';
import AttachedFileList from './AttachedFileList';

interface ProfileFormProps {
  onSubmit: (profile: DuckDBProfileInput) => void;
  onCancel: () => void;
  initialValues?: Partial<DuckDBProfileInput>;
}

export default function ProfileForm({ onSubmit, onCancel, initialValues }: ProfileFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [dbPath, setDbPath] = useState(initialValues?.dbPath || ':memory:');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>(initialValues?.attachedFiles || []);
  const [error, setError] = useState<string | null>(null);

  const handleSelectDatabase = async () => {
    try {
      const result = await window.orbitalDb.files.selectDatabase();
      if (result) {
        setDbPath(result);
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const validateDbPath = (path: string): string | null => {
    if (path === ':memory:') return null;

    // Check if path ends with a data file extension
    const dataExtensions = ['.csv', '.parquet', '.json', '.jsonl', '.ndjson', '.txt'];
    const lowerPath = path.toLowerCase();

    for (const ext of dataExtensions) {
      if (lowerPath.endsWith(ext)) {
        return `This appears to be a data file (${ext}). Database path should be a .duckdb or .db file, not a data file. Use the Import feature to load data files.`;
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateDbPath(dbPath);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onSubmit({
      name,
      dbPath,
      attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Connection Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field w-full"
          placeholder="My Database"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Database Path</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={dbPath}
            onChange={(e) => {
              setDbPath(e.target.value);
              setError(null);
            }}
            className="input-field flex-1"
            placeholder=":memory: or /path/to/database.duckdb"
            required
          />
          {dbPath !== ':memory:' && (
            <button
              type="button"
              onClick={handleSelectDatabase}
              className="btn-secondary whitespace-nowrap"
            >
              Browse...
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Use <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">:memory:</code> for temporary data, or specify a <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">.duckdb</code> file path
        </p>
        {dbPath === ':memory:' && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <div className="flex items-start space-x-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  In-Memory Database
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">
                  Create this connection first, then use the <strong>Import</strong> button to load CSV, Parquet, or JSON files into memory.
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  ⚠️ All data will be lost when the connection closes.
                </p>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <AttachedFileList
          files={attachedFiles}
          onChange={setAttachedFiles}
        />
      </div>

      <div className="flex space-x-2">
        <button type="submit" className="btn-primary">
          {initialValues ? 'Update' : 'Create'} Connection
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
