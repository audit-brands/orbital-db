// Import Data page for loading data sources into DuckDB

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { openConnection } from '../state/slices/profilesSlice';

type FileFormat = 'csv' | 'parquet' | 'json';

interface ImportOptions {
  filePath: string;
  fileName: string;
  format: FileFormat;
  tableName: string;
}

export default function ImportDataPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const profile = useAppSelector((state) =>
    state.profiles.list.find((p) => p.id === profileId)
  );

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [tableName, setTableName] = useState('');
  const [format, setFormat] = useState<FileFormat>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profileId) {
      // Ensure connection is open
      dispatch(openConnection(profileId));
    }
  }, [dispatch, profileId]);

  const handleSelectFile = async () => {
    try {
      const result = await window.orbitalDb.files.selectFile();

      if (result) {
        setSelectedFile(result);
        // Extract filename and suggest as table name
        const fileName = result.split('/').pop()?.split('.')[0] || 'imported_data';
        setTableName(fileName.toLowerCase().replace(/[^a-z0-9_]/g, '_'));

        // Detect format from extension
        const ext = result.split('.').pop()?.toLowerCase();
        if (ext === 'csv') setFormat('csv');
        else if (ext === 'parquet') setFormat('parquet');
        else if (ext === 'json' || ext === 'jsonl' || ext === 'ndjson') setFormat('json');

        setError(null);
        setSuccess(false);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const generateImportSQL = (options: ImportOptions): string => {
    const { filePath, format, tableName } = options;
    const escapedPath = filePath.replace(/'/g, "''");

    switch (format) {
      case 'csv':
        return `CREATE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${escapedPath}');`;
      case 'parquet':
        return `CREATE TABLE ${tableName} AS SELECT * FROM read_parquet('${escapedPath}');`;
      case 'json':
        return `CREATE TABLE ${tableName} AS SELECT * FROM read_json_auto('${escapedPath}');`;
      default:
        return '';
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !tableName.trim() || !profileId) {
      setError('Please select a file and provide a table name');
      return;
    }

    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      setError('Invalid table name. Use only letters, numbers, and underscores. Must start with a letter or underscore.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const sql = generateImportSQL({
      filePath: selectedFile,
      fileName: selectedFile.split('/').pop() || 'file',
      format,
      tableName,
    });

    try {
      await window.orbitalDb.query.run(profileId, sql);
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTableName('');
    setFormat('csv');
    setError(null);
    setSuccess(false);
  };

  if (!profile) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">Profile not found</div>
        <button onClick={() => navigate('/profiles')} className="btn-primary">
          Go to Profiles
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import Data</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Load CSV, Parquet, or JSON files into DuckDB
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Profile: <span className="font-medium">{profile.name}</span> •{' '}
          <span className="text-sm">{profile.dbPath}</span>
        </p>
      </div>

      {/* File Selection */}
      <div className="card mb-4">
        <h2 className="text-lg font-semibold mb-4">1. Select Data File</h2>
        <div className="space-y-4">
          <button onClick={handleSelectFile} className="btn-primary">
            📁 Choose File
          </button>

          {selectedFile && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Selected File:
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 font-mono break-all">
                {selectedFile}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Format & Table Name */}
      {selectedFile && (
        <div className="card mb-4">
          <h2 className="text-lg font-semibold mb-4">2. Configure Import</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                File Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as FileFormat)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="csv">CSV</option>
                <option value="parquet">Parquet</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="my_table"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use only letters, numbers, and underscores. Must start with a letter or underscore.
              </p>
            </div>

            {tableName && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                  Generated SQL:
                </div>
                <pre className="text-xs text-blue-600 dark:text-blue-400 font-mono overflow-x-auto">
                  {generateImportSQL({
                    filePath: selectedFile,
                    fileName: selectedFile.split('/').pop() || 'file',
                    format,
                    tableName,
                  })}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Button */}
      {selectedFile && tableName && (
        <div className="card mb-4">
          <h2 className="text-lg font-semibold mb-4">3. Import</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Importing...' : '⬆️ Import Data'}
            </button>
            <button onClick={handleReset} className="btn-secondary" disabled={loading}>
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="text-red-700 dark:text-red-400 font-medium mb-1">Import Error</div>
          <div className="text-sm text-red-600 dark:text-red-300 font-mono">{error}</div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2">
            <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
            <div>
              <div className="font-medium text-green-700 dark:text-green-300">
                Data imported successfully!
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                Table &quot;{tableName}&quot; has been created.
              </div>
              <div className="mt-3 flex space-x-2">
                <button
                  onClick={() => navigate(`/db/${profileId}/schema`)}
                  className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  View in Schema Browser
                </button>
                <button
                  onClick={() => navigate(`/db/${profileId}/query`)}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Query Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      {!selectedFile && (
        <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Supported File Formats
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>
              <strong>CSV:</strong> Automatically detects headers, delimiters, and data types
            </li>
            <li>
              <strong>Parquet:</strong> Fast columnar format with built-in compression
            </li>
            <li>
              <strong>JSON:</strong> Supports JSON, JSONL (newline-delimited), and NDJSON formats
            </li>
          </ul>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
            DuckDB will automatically infer column types and create the optimal schema.
          </p>
        </div>
      )}
    </div>
  );
}
