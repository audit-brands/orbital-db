// Root layout with sidebar and main content area

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../state/hooks';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import StatusBar from '../components/StatusBar';
import ToastContainer from '../components/ToastContainer';

export default function RootLayout() {
  const theme = useAppSelector((state) => state.ui.theme);

  // Apply dark mode class to document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
        <StatusBar />
      </div>
      <ToastContainer />
    </div>
  );
}
