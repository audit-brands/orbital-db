// Component for managing attached files in a profile

import { useState } from 'react';
import type { AttachedFile, CsvOptions } from '@shared/types';

interface AttachedFileListProps {
  files: AttachedFile[];
  onChange: (files: AttachedFile[]) => void;
  disabled?: boolean;
}

export default function AttachedFileList({ files, onChange, disabled }: AttachedFileListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'url'>('file');
  const [newAlias, setNewAlias] = useState('');
  const [newPath, setNewPath] = useState('');
  const [newType, setNewType] = useState<AttachedFile['type']>('auto');
  const [showCsvOptions, setShowCsvOptions] = useState(false);
  const [csvOptions, setCsvOptions] = useState<CsvOptions>({});
  const [error, setError] = useState<string | null>(null);

  const isRemoteUrl = (path: string): boolean => {
    return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('s3://');
  };

  const handleSelectFile = async () => {
    if (!window.orbitalDb) {
      setError('Electron APIs are unavailable. This feature requires the Electron runtime.');
      return;
    }

    try {
      const result = await window.orbitalDb.files.selectDataFiles();
      if (result && result.length > 0) {
        setNewPath(result[0]);

        // Auto-suggest alias from filename (cross-platform path handling)
        const fileName = result[0].split(/[/\\]/).pop() || '';
        const baseName = fileName.replace(/\.(csv|parquet|json|jsonl)$/i, '');
        const suggestedAlias = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        setNewAlias(suggestedAlias);

        // Auto-detect file type
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'csv' || ext === 'txt') {
          setNewType('csv');
          setShowCsvOptions(true); // Show CSV options for .csv and .txt files
        } else if (ext === 'parquet') {
          setNewType('parquet');
          setShowCsvOptions(false);
        } else if (ext === 'json' || ext === 'jsonl') {
          setNewType('json');
          setShowCsvOptions(false);
        } else {
          setNewType('auto');
          setShowCsvOptions(false);
        }

        setError(null);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePathChange = (path: string) => {
    setNewPath(path);

    // Auto-detect if URL and suggest alias from URL
    if (isRemoteUrl(path)) {
      try {
        const url = new URL(path);
        const fileName = url.pathname.split('/').pop() || '';
        const baseName = fileName.replace(/\.(csv|parquet|json|jsonl)$/i, '');
        const suggestedAlias = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        if (suggestedAlias) {
          setNewAlias(suggestedAlias);
        }

        // Auto-detect file type from URL extension
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'csv' || ext === 'txt') {
          setNewType('csv');
          setShowCsvOptions(true);
        } else if (ext === 'parquet') {
          setNewType('parquet');
          setShowCsvOptions(false);
        } else if (ext === 'json' || ext === 'jsonl') {
          setNewType('json');
          setShowCsvOptions(false);
        } else {
          setNewType('auto');
          setShowCsvOptions(false);
        }
      } catch {
        // Invalid URL, ignore auto-detection
      }
    }
  };

  const handleAddFile = () => {
    setError(null);

    // Validate alias
    if (!newAlias.trim()) {
      setError('Alias is required');
      return;
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newAlias)) {
      setError('Alias must start with a letter or underscore and contain only letters, numbers, and underscores');
      return;
    }

    // Check for duplicate alias
    if (files.some(f => f.alias.toLowerCase() === newAlias.toLowerCase())) {
      setError('An attached file with this alias already exists');
      return;
    }

    if (!newPath.trim()) {
      setError('File path is required');
      return;
    }

    const newFile: AttachedFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      alias: newAlias.trim(),
      path: newPath.trim(),
      type: newType,
      // Only include csvOptions if showCsvOptions is true and options are set
      csvOptions: showCsvOptions && Object.keys(csvOptions).length > 0 ? csvOptions : undefined,
    };

    onChange([...files, newFile]);

    // Reset form
    setNewAlias('');
    setNewPath('');
    setNewType('auto');
    setShowCsvOptions(false);
    setCsvOptions({});
    setIsAdding(false);
  };

  const handleRemoveFile = (id: string) => {
    onChange(files.filter(f => f.id !== id));
  };

  const getFileTypeIcon = (type: AttachedFile['type']) => {
    switch (type) {
      case 'csv': return '📊';
      case 'parquet': return '📦';
      case 'json': return '📋';
      case 'auto': return '📄';
      default: return '📄';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Attached Files</label>
        {!disabled && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-sm btn-secondary px-2 py-1"
          >
            + Attach File
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        Attach CSV, Parquet, or JSON files that will be queryable as tables
      </p>

      {files.length === 0 && !isAdding && (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 border-dashed">
          <p className="text-sm text-gray-500">No files attached</p>
          <p className="text-xs text-gray-400 mt-1">
            Attached files appear as queryable tables in the schema browser
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => {
            const isRemote = isRemoteUrl(file.path);
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileTypeIcon(file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {file.alias}
                      </code>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {file.type === 'auto' ? 'auto-detect' : file.type.toUpperCase()}
                      </span>
                      {isRemote && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" title="Remote file">
                          🌐 Remote
                        </span>
                      )}
                      {file.csvOptions?.delimiter && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" title="Custom delimiter">
                          delim: {file.csvOptions.delimiter === '\t' ? '\\t' : file.csvOptions.delimiter}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-1" title={file.path}>
                      {file.path}
                    </p>
                  </div>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="ml-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    title="Remove attached file"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdding && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded space-y-3">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Attach New File
          </h4>

          {/* Input Mode Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                inputMode === 'file'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              📁 Local File
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                inputMode === 'url'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              🌐 Remote URL
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              {inputMode === 'file' ? 'File Path' : 'Remote URL'}
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newPath}
                onChange={(e) => handlePathChange(e.target.value)}
                className="input-field flex-1 text-sm"
                placeholder={inputMode === 'file' ? '/path/to/data.csv' : 'https://example.com/data.csv'}
              />
              {inputMode === 'file' && (
                <button
                  type="button"
                  onClick={handleSelectFile}
                  className="btn-secondary text-sm whitespace-nowrap"
                >
                  Browse...
                </button>
              )}
            </div>
            {inputMode === 'url' && (
              <p className="text-xs text-gray-500 mt-1">
                Supports HTTP, HTTPS, and S3 URLs
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Table Alias (used in SQL queries)
            </label>
            <input
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="sales_data"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use lowercase letters, numbers, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">File Type</label>
            <select
              value={newType}
              onChange={(e) => {
                const type = e.target.value as AttachedFile['type'];
                setNewType(type);
                // Show CSV options only for CSV type
                setShowCsvOptions(type === 'csv');
              }}
              className="input-field w-full text-sm"
            >
              <option value="auto">Auto-detect</option>
              <option value="csv">CSV / Text</option>
              <option value="parquet">Parquet</option>
              <option value="json">JSON/JSONL</option>
            </select>
          </div>

          {/* CSV Options */}
          {showCsvOptions && (
            <div className="p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  CSV Options
                </h5>
                <button
                  type="button"
                  onClick={() => setCsvOptions({})}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Reset to auto-detect"
                >
                  Reset
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Delimiter</label>
                <select
                  value={csvOptions.delimiter || ''}
                  onChange={(e) => setCsvOptions({ ...csvOptions, delimiter: e.target.value || undefined })}
                  className="input-field w-full text-xs"
                >
                  <option value="">Auto-detect</option>
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;) - 1BRC format</option>
                  <option value="\t">Tab (\t)</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={csvOptions.header !== false}
                    onChange={(e) => setCsvOptions({ ...csvOptions, header: e.target.checked || undefined })}
                    className="form-checkbox"
                  />
                  <span className="text-xs">First row contains column names</span>
                </label>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
                  Advanced Options
                </summary>
                <div className="mt-2 space-y-2 pl-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Encoding</label>
                    <input
                      type="text"
                      value={csvOptions.encoding || ''}
                      onChange={(e) => setCsvOptions({ ...csvOptions, encoding: e.target.value || undefined })}
                      placeholder="UTF-8 (default)"
                      className="input-field w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">NULL String</label>
                    <input
                      type="text"
                      value={csvOptions.nullstr || ''}
                      onChange={(e) => setCsvOptions({ ...csvOptions, nullstr: e.target.value || undefined })}
                      placeholder="Empty values"
                      className="input-field w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Skip Lines</label>
                    <input
                      type="number"
                      min="0"
                      value={csvOptions.skip || ''}
                      onChange={(e) => setCsvOptions({ ...csvOptions, skip: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="0"
                      className="input-field w-full text-xs"
                    />
                  </div>
                </div>
              </details>
            </div>
          )}

          {error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleAddFile}
              className="btn-primary text-sm px-3 py-1"
            >
              Add File
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewAlias('');
                setNewPath('');
                setNewType('auto');
                setError(null);
              }}
              className="btn-secondary text-sm px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
