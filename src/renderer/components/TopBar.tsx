// Top bar component

import { useAppSelector, useAppDispatch } from '../state/hooks';
import { toggleTheme } from '../state/slices/uiSlice';

export default function TopBar() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const activeProfile = useAppSelector((state) => {
    if (!state.profiles.activeProfileId) return null;
    return state.profiles.list.find((p) => p.id === state.profiles.activeProfileId);
  });

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {activeProfile && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Connected: {activeProfile.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <button
            onClick={() => dispatch(toggleTheme())}
            className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </header>
  );
}
