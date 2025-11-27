// Top bar component

import { useAppSelector, useAppDispatch } from '../state/hooks';
import { toggleTheme } from '../state/slices/uiSlice';

export default function TopBar() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.ui.theme);
  const { activeProfile, status, error } = useAppSelector((state) => {
    const activeId = state.profiles.activeProfileId;
    const profile = activeId ? state.profiles.list.find((p) => p.id === activeId) : null;
    const connectionStatus = activeId ? state.profiles.connectionStatus[activeId] : undefined;
    const connectionError = activeId ? state.profiles.connectionErrors[activeId] : undefined;
    return {
      activeProfile: profile,
      status: connectionStatus,
      error: connectionError,
    };
  });

  const statusStyles =
    status === 'failed'
      ? {
          container: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
          dot: 'bg-red-500',
          label: 'Connection Failed',
        }
      : status === 'connecting'
        ? {
            container: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
            dot: 'bg-yellow-500 animate-pulse',
            label: 'Connecting',
          }
        : {
            container: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
            dot: 'bg-green-500',
            label: 'Connected',
          };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {activeProfile && (
            <div
              className={`flex items-center space-x-3 px-3 py-1 rounded-full text-sm ${statusStyles.container}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`}></span>
              <div className="flex flex-col leading-tight">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {statusStyles.label}: {activeProfile.name}
                  </span>
                  <span
                    title={activeProfile.dbPath === ':memory:' ? 'In-memory database (data lost on disconnect)' : 'File-based database (changes persist to disk)'}
                    className="text-base"
                  >
                    {activeProfile.dbPath === ':memory:' ? '🧠' : '💾'}
                  </span>
                </div>
                {error && (
                  <span className="text-xs opacity-80">
                    {error}
                  </span>
                )}
              </div>
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
