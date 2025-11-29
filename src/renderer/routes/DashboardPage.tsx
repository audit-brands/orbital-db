// Dashboard page

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadProfiles } from '../state/slices/profilesSlice';
import DatabaseOverview from '../components/DatabaseOverview';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: profiles, loading } = useAppSelector((state) => state.profiles);

  useEffect(() => {
    dispatch(loadProfiles());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Welcome to Orbital DB</h1>

      {profiles.length === 0 ? (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Orbital DB is a modern desktop client for managing and querying DuckDB databases.
          </p>
          <p className="mb-4">You don&apos;t have any database connections yet.</p>
          <button onClick={() => navigate('/profiles')} className="btn-primary">
            Create Your First Connection
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <DatabaseOverview profiles={profiles} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-2">Quick Actions</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Create a new connection</li>
                <li>• Browse database schemas</li>
                <li>• Run SQL queries</li>
                <li>• Import data from CSV/Parquet/JSON</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-2">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Multiple database connections</li>
                <li>• Schema introspection</li>
                <li>• Full SQL support (DDL, DML, DQL, TCL)</li>
                <li>• Data grid viewer with export</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
