// Sidebar navigation component

import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import { toggleSidebar } from '../state/slices/uiSlice';

// Space Station Icon Component - Option 0 (Original)
// Note: Options 0-7 are saved in icon-options.tsx
function SpaceStationIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Central hub */}
      <circle cx="32" cy="32" r="8" fill="currentColor" opacity="0.9" />

      {/* Solar panels - left */}
      <rect x="4" y="28" width="16" height="8" fill="currentColor" opacity="0.6" rx="1" />
      <line x1="6" y1="30" x2="18" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="6" y1="32" x2="18" y2="32" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="6" y1="34" x2="18" y2="34" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

      {/* Solar panels - right */}
      <rect x="44" y="28" width="16" height="8" fill="currentColor" opacity="0.6" rx="1" />
      <line x1="46" y1="30" x2="58" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="46" y1="32" x2="58" y2="32" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="46" y1="34" x2="58" y2="34" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />

      {/* Connecting arms */}
      <rect x="20" y="30" width="4" height="4" fill="currentColor" opacity="0.8" />
      <rect x="40" y="30" width="4" height="4" fill="currentColor" opacity="0.8" />

      {/* Orbital ring */}
      <circle cx="32" cy="32" r="14" stroke="currentColor" strokeWidth="1.5" opacity="0.3" fill="none" />

      {/* Antenna */}
      <line x1="32" y1="24" x2="32" y2="16" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <circle cx="32" cy="14" r="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/profiles', label: 'Connections', icon: '🗄️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out`}
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {collapsed ? (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mx-auto"
            title="Expand sidebar"
          >
            <SpaceStationIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </button>
        ) : (
          <>
            <div className="flex-1 flex items-center space-x-3">
              <SpaceStationIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Orbital DB</h1>
                <p className="text-xs text-gray-500">Database Client</p>
              </div>
            </div>
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Collapse sidebar"
            >
              <span className="text-xl">«</span>
            </button>
          </>
        )}
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center ${
                  collapsed ? 'justify-center' : 'space-x-3'
                } px-4 py-2 rounded transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-xl">{item.icon}</span>
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          <p>Orbital DB v0.2.0</p>
        </div>
      )}
    </aside>
  );
}
