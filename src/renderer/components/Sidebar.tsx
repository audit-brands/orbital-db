// Sidebar navigation component

import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../state/hooks';
import { toggleSidebar } from '../state/slices/uiSlice';

export default function Sidebar() {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/profiles', label: 'Databases', icon: '🗄️' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-64'
      } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out`}
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        {!collapsed && (
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">DuckDB Glass</h1>
            <p className="text-xs text-gray-500">Database Client</p>
          </div>
        )}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="text-xl">{collapsed ? '☰' : '«'}</span>
        </button>
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
          <p>DuckDB Glass v0.1.0</p>
        </div>
      )}
    </aside>
  );
}
