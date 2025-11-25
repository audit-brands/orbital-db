// Dashboard page

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadProfiles } from '../state/slices/profilesSlice';

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
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Welcome to DuckDB Glass</h1>
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          DuckDB Glass is a desktop client for managing and querying DuckDB databases.
        </p>
        {profiles.length === 0 ? (
          <div>
            <p className="mb-4">You don't have any database profiles yet.</p>
            <button onClick={() => navigate('/profiles')} className="btn-primary">
              Create Your First Profile
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-4">You have {profiles.length} database profile(s).</p>
            <button onClick={() => navigate('/profiles')} className="btn-primary">
              View Profiles
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-semibold mb-2">Quick Actions</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Create a new profile</li>
            <li>• Browse database schemas</li>
            <li>• Run SQL queries</li>
            <li>• View table data</li>
          </ul>
        </div>
        <div className="card">
          <h3 className="font-semibold mb-2">Features</h3>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• Multiple database profiles</li>
            <li>• Schema introspection</li>
            <li>• Query execution</li>
            <li>• Data grid viewer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
