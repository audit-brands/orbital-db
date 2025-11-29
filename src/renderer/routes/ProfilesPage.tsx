// Profiles management page

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadProfiles, createProfile, updateProfile, deleteProfile } from '../state/slices/profilesSlice';
import { addToast } from '../state/slices/uiSlice';
import type { DuckDBProfile, DuckDBProfileInput } from '@shared/types';
import ProfileForm from '../components/ProfileForm';
import ProfileList from '../components/ProfileList';

export default function ProfilesPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { list: profiles, loading } = useAppSelector((state) => state.profiles);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<DuckDBProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    dispatch(loadProfiles());
  }, [dispatch]);

  // Filter profiles based on search query
  const filteredProfiles = profiles.filter(profile => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = profile.name.toLowerCase().includes(query);
    const pathMatch = profile.dbPath.toLowerCase().includes(query);

    return nameMatch || pathMatch;
  });

  const handleCreate = async (input: DuckDBProfileInput) => {
    try {
      if (editingProfile) {
        // Update existing connection
        await dispatch(updateProfile({ id: editingProfile.id, update: input }));
        dispatch(addToast({
          type: 'success',
          message: `Connection "${input.name}" updated successfully`,
          duration: 4000,
        }));
        setEditingProfile(null);
      } else {
        // Create new connection
        await dispatch(createProfile(input));
        dispatch(addToast({
          type: 'success',
          message: `Connection "${input.name}" created successfully`,
          duration: 4000,
        }));
      }
      setShowForm(false);
    } catch (err) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to ${editingProfile ? 'update' : 'create'} connection: ${(err as Error).message}`,
        duration: 7000,
      }));
    }
  };

  const handleEdit = (profile: DuckDBProfile) => {
    setEditingProfile(profile);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    setEditingProfile(null);
  };

  const handleDelete = async (id: string) => {
    const profile = profiles.find(p => p.id === id);
    const connectionName = profile?.name || 'connection';

    if (confirm(`Are you sure you want to delete the connection "${connectionName}"?`)) {
      try {
        await dispatch(deleteProfile(id));
        dispatch(addToast({
          type: 'success',
          message: `Connection "${connectionName}" deleted successfully`,
          duration: 4000,
        }));
      } catch (err) {
        dispatch(addToast({
          type: 'error',
          message: `Failed to delete connection: ${(err as Error).message}`,
          duration: 7000,
        }));
      }
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Database Connections</h1>
        <div className="flex space-x-2">
          <button onClick={() => navigate('/create-database')} className="btn-primary">
            🚀 Create Database 🚀
          </button>
          <button
            onClick={() => {
              setEditingProfile(null);
              setShowForm(!showForm);
            }}
            className="btn-secondary"
          >
            {showForm ? 'Cancel' : '+ New Connection'}
          </button>
        </div>
      </div>

      {/* Search bar - only show when there are profiles */}
      {profiles.length > 0 && (
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search connections by name or path..."
              className="input-field w-full pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Found {filteredProfiles.length} of {profiles.length} connection{profiles.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingProfile ? 'Edit Connection' : 'Create New Connection'}
          </h2>
          <ProfileForm
            onSubmit={handleCreate}
            onCancel={handleCancelEdit}
            initialValues={editingProfile ? {
              name: editingProfile.name,
              dbPath: editingProfile.dbPath,
              attachedFiles: editingProfile.attachedFiles
            } : undefined}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading connections...</div>
      ) : profiles.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No database connections yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Create Your First Connection
          </button>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">🔍</div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">No connections match your search</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            Try a different search term or clear the filter
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="btn-secondary"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <ProfileList profiles={filteredProfiles} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}
