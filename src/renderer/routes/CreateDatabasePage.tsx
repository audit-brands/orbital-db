// Create Database wizard - creates a new DuckDB database from data files

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../state/hooks';
import { createProfile } from '../state/slices/profilesSlice';
import type { DuckDBProfileInput } from '@shared/types';

type FileFormat = 'csv' | 'parquet' | 'json';

interface DataFileImport {
  filePath: string;
  fileName: string;
  format: FileFormat;
  tableName: string;
}

export default function CreateDatabasePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Step 1: Database location
  const [databaseName, setDatabaseName] = useState('');
  const [databasePath, setDatabasePath] = useState('');

  // Step 2: Data files
  const [selectedFiles, setSelectedFiles] = useState<DataFileImport[]>([]);

  // Progress
  const [currentStep, setCurrentStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');

  const handleSelectDatabaseLocation = async () => {
    try {
      const result = await window.orbitalDb.files.saveDatabaseAs();
      if (result) {
        setDatabasePath(result);
        // Extract name from path
        const name = result.split('/').pop()?.replace(/\.(duckdb|db)$/i, '') || 'New Database';
        setDatabaseName(name);
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSelectDataFiles = async () => {
    try {
      const result = await window.orbitalDb.files.selectFile();
      if (result) {
        const fileName = result.split('/').pop() || 'file';
        const ext = result.split('.').pop()?.toLowerCase();

        let format: FileFormat = 'csv';
        if (ext === 'parquet') format = 'parquet';
        else if (ext === 'json' || ext === 'jsonl' || ext === 'ndjson') format = 'json';

        const tableName = fileName.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_');

        setSelectedFiles([...selectedFiles, {
          filePath: result,
          fileName,
          format,
          tableName,
        }]);
        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleUpdateTableName = (index: number, newName: string) => {
    const updated = [...selectedFiles];
    updated[index].tableName = newName;
    setSelectedFiles(updated);
  };

  const generateImportSQL = (file: DataFileImport): string => {
    const escapedPath = file.filePath.replace(/'/g, "''");
    switch (file.format) {
      case 'csv':
        return `CREATE TABLE ${file.tableName} AS SELECT * FROM read_csv_auto('${escapedPath}');`;
      case 'parquet':
        return `CREATE TABLE ${file.tableName} AS SELECT * FROM read_parquet('${escapedPath}');`;
      case 'json':
        return `CREATE TABLE ${file.tableName} AS SELECT * FROM read_json_auto('${escapedPath}');`;
    }
  };

  const handleCreate = async () => {
    if (!databasePath || !databaseName) {
      setError('Please select a database location');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one data file to import');
      return;
    }

    // Validate table names
    for (const file of selectedFiles) {
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(file.tableName)) {
        setError(`Invalid table name: ${file.tableName}. Use only letters, numbers, and underscores.`);
        return;
      }
    }

    setCreating(true);
    setError(null);

    try {
      // Step 1: Create profile
      setProgress('Creating database profile...');
      const profileInput: DuckDBProfileInput = {
        name: databaseName,
        dbPath: databasePath,
      };

      const result = await dispatch(createProfile(profileInput)).unwrap();
      const profileId = result.id;

      // Step 2: Open connection
      setProgress('Opening database connection...');
      await window.orbitalDb.connection.open(profileId);

      // Step 3: Import each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProgress(`Importing ${file.fileName} (${i + 1}/${selectedFiles.length})...`);

        const sql = generateImportSQL(file);
        await window.orbitalDb.query.run(profileId, sql);
      }

      setProgress('Database created successfully!');

      // Navigate to the new database
      setTimeout(() => {
        navigate(`/db/${profileId}/schema`);
      }, 1000);

    } catch (err) {
      setError((err as Error).message);
      setCreating(false);
      setProgress('');
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create Database from Files</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Create a new DuckDB database and import your data files in one step
        </p>
      </div>

      {/* Step 1: Database Location */}
      <div className="card mb-4">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold mr-3">
            1
          </div>
          <h2 className="text-lg font-semibold">Choose Database Location</h2>
        </div>

        <div className="ml-11 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database Name
            </label>
            <input
              type="text"
              value={databaseName}
              onChange={(e) => setDatabaseName(e.target.value)}
              placeholder="My Database"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Database File
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={databasePath}
                onChange={(e) => setDatabasePath(e.target.value)}
                placeholder="/path/to/database.duckdb"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              />
              <button onClick={handleSelectDatabaseLocation} className="btn-secondary whitespace-nowrap">
                Browse...
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select where to save your new database file (.duckdb)
            </p>
          </div>

          {databasePath && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Database location set
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Select Data Files */}
      <div className="card mb-4">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold mr-3">
            2
          </div>
          <h2 className="text-lg font-semibold">Add Data Files</h2>
        </div>

        <div className="ml-11 space-y-3">
          <button onClick={handleSelectDataFiles} className="btn-primary">
            📁 Add Data File
          </button>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{file.fileName}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{file.filePath}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="ml-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={file.tableName}
                      onChange={(e) => handleUpdateTableName(index, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} ready to import
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Button */}
      {databasePath && selectedFiles.length > 0 && (
        <div className="card">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center font-semibold mr-3">
              3
            </div>
            <h2 className="text-lg font-semibold">Create Database</h2>
          </div>

          <div className="ml-11 space-y-3">
            <div className="flex space-x-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary"
              >
                {creating ? 'Creating...' : '🚀 Create Database & Import Data'}
              </button>
              <button
                onClick={() => navigate('/profiles')}
                disabled={creating}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>

            {progress && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">{progress}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mt-4">
          <div className="text-red-700 dark:text-red-400 font-medium mb-1">Error</div>
          <div className="text-sm text-red-600 dark:text-red-300">{error}</div>
        </div>
      )}
    </div>
  );
}
