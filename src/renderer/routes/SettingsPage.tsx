// Settings page

import { useAppDispatch, useAppSelector } from '../state/hooks';
import { setThemeMode, updateSettings, resetSettings, addToast } from '../state/slices/uiSlice';
import { useEffect, useState } from 'react';
import { DEFAULT_QUERY_TIMEOUT_MS } from '@shared/constants';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const settings = useAppSelector((state) => state.ui.settings);
  const [version, setVersion] = useState<string>('');

  // Local state for form inputs
  const [editorFontSize, setEditorFontSize] = useState(settings.editorFontSize);
  const [timeoutInput, setTimeoutInput] = useState<string>(
    String(settings.defaultQueryTimeout ?? DEFAULT_QUERY_TIMEOUT_MS)
  );

  useEffect(() => {
    window.orbitalDb.app.getVersion().then(setVersion);
  }, []);

  const handleThemeModeChange = (mode: 'light' | 'dark' | 'auto') => {
    dispatch(setThemeMode(mode));
    dispatch(addToast({
      type: 'success',
      message: `Theme mode set to ${mode === 'auto' ? 'Auto (System)' : mode}`,
      duration: 3000,
    }));
  };

  const handleSaveEditorSettings = () => {
    dispatch(updateSettings({
      editorFontSize,
      editorShowLineNumbers: settings.editorShowLineNumbers,
    }));
    dispatch(addToast({
      type: 'success',
      message: 'Editor settings saved',
      duration: 3000,
    }));
  };

  const handleToggleLineNumbers = () => {
    dispatch(updateSettings({
      editorShowLineNumbers: !settings.editorShowLineNumbers,
    }));
  };

  const handleToggleReopenLastProfile = () => {
    dispatch(updateSettings({
      reopenLastProfile: !settings.reopenLastProfile,
    }));
    dispatch(addToast({
      type: 'success',
      message: settings.reopenLastProfile ? 'Auto-open disabled' : 'Auto-open enabled',
      duration: 3000,
    }));
  };

  const handleSaveQueryTimeout = () => {
    const parsedTimeout = Number(timeoutInput);

    // Validate timeout value
    if (!Number.isFinite(parsedTimeout) || parsedTimeout < 0) {
      dispatch(addToast({
        type: 'error',
        message: 'Invalid timeout value. Must be a positive number or 0 to disable.',
        duration: 5000,
      }));
      return;
    }

    // Update settings
    dispatch(updateSettings({ defaultQueryTimeout: parsedTimeout }));
    dispatch(addToast({
      type: 'success',
      message: parsedTimeout === 0
        ? 'Default query timeout disabled'
        : `Default query timeout set to ${(parsedTimeout / 1000).toFixed(1)}s`,
      duration: 4000,
    }));
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      dispatch(resetSettings());
      setEditorFontSize(14);
      setTimeoutInput(String(DEFAULT_QUERY_TIMEOUT_MS));
      dispatch(addToast({
        type: 'info',
        message: 'Settings reset to defaults',
        duration: 4000,
      }));
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Theme Mode</label>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Current: {settings.themeMode === 'auto' ? `Auto (System: ${theme})` : settings.themeMode}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleThemeModeChange('light')}
                  className={`px-4 py-2 rounded transition-colors ${
                    settings.themeMode === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => handleThemeModeChange('dark')}
                  className={`px-4 py-2 rounded transition-colors ${
                    settings.themeMode === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  🌙 Dark
                </button>
                <button
                  onClick={() => handleThemeModeChange('auto')}
                  className={`px-4 py-2 rounded transition-colors ${
                    settings.themeMode === 'auto'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  🌗 Auto (System)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Editor Preferences</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Editor font size in pixels (10-24)
              </div>
              <input
                type="number"
                min="10"
                max="24"
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(Math.max(10, Math.min(24, parseInt(e.target.value) || 14)))}
                className="input w-full max-w-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Show Line Numbers</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Display line numbers in SQL editor
                </div>
              </div>
              <button
                onClick={handleToggleLineNumbers}
                className={`px-4 py-2 rounded transition-colors ${
                  settings.editorShowLineNumbers
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                {settings.editorShowLineNumbers ? 'ON' : 'OFF'}
              </button>
            </div>

            <button onClick={handleSaveEditorSettings} className="btn-primary">
              Save Editor Settings
            </button>
          </div>
        </div>

        {/* Query Execution Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Query Execution</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="timeout" className="block text-sm font-medium mb-2">
                Default Query Timeout
              </label>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Maximum time allowed for query execution. Set to 0 to disable timeout.
                {settings.defaultQueryTimeout !== undefined && settings.defaultQueryTimeout > 0 && (
                  <span className="block mt-1 text-blue-600 dark:text-blue-400">
                    Current: {(settings.defaultQueryTimeout / 1000).toFixed(1)}s
                  </span>
                )}
                {(settings.defaultQueryTimeout === undefined || settings.defaultQueryTimeout === 0) && (
                  <span className="block mt-1 text-gray-600 dark:text-gray-400">
                    Current: No timeout (queries can run indefinitely)
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <input
                  id="timeout"
                  type="number"
                  min={0}
                  step={1000}
                  value={timeoutInput}
                  onChange={(e) => setTimeoutInput(e.target.value)}
                  className="input w-full max-w-xs"
                  placeholder="e.g., 120000"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">milliseconds</span>
                <button
                  onClick={handleSaveQueryTimeout}
                  className="btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Startup Behavior */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Startup Behavior</h2>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Reopen Last Profile</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Automatically open the last used profile on startup
              </div>
            </div>
            <button
              onClick={handleToggleReopenLastProfile}
              className={`px-4 py-2 rounded transition-colors ${
                settings.reopenLastProfile
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              {settings.reopenLastProfile ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Reset Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Reset</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Reset All Settings</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Restore all settings to their default values
              </div>
            </div>
            <button onClick={handleResetSettings} className="btn-secondary">
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Version:</span> {version || 'Loading...'}
            </div>
            <div>
              <span className="font-medium">Application:</span> Orbital DB
            </div>
            <div>
              <span className="font-medium">Description:</span> Desktop client for DuckDB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
