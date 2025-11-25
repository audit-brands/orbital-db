// Settings page

import { useAppDispatch, useAppSelector } from '../state/hooks';
import { toggleTheme } from '../state/slices/uiSlice';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const [version, setVersion] = useState<string>('');

  useEffect(() => {
    window.duckdbGlass.app.getVersion().then(setVersion);
  }, []);

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-sm text-gray-500">Current: {theme}</div>
            </div>
            <button onClick={handleThemeToggle} className="btn-secondary">
              Toggle Theme
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">Version:</span> {version || 'Loading...'}
            </div>
            <div>
              <span className="font-medium">Application:</span> DuckDB Glass
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
