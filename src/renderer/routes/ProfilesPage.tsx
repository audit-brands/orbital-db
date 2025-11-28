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

  useEffect(() => {
    dispatch(loadProfiles());
  }, [dispatch]);

  const handleCreate = async (input: DuckDBProfileInput) => {
    try {
      if (editingProfile) {
        // Update existing profile
        await dispatch(updateProfile({ id: editingProfile.id, update: input }));
        dispatch(addToast({
          type: 'success',
          message: `Profile "${input.name}" updated successfully`,
          duration: 4000,
        }));
        setEditingProfile(null);
      } else {
        // Create new profile
        await dispatch(createProfile(input));
        dispatch(addToast({
          type: 'success',
          message: `Profile "${input.name}" created successfully`,
          duration: 4000,
        }));
      }
      setShowForm(false);
    } catch (err) {
      dispatch(addToast({
        type: 'error',
        message: `Failed to ${editingProfile ? 'update' : 'create'} profile: ${(err as Error).message}`,
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
    const profileName = profile?.name || 'profile';

    if (confirm(`Are you sure you want to delete "${profileName}"?`)) {
      try {
        await dispatch(deleteProfile(id));
        dispatch(addToast({
          type: 'success',
          message: `Profile "${profileName}" deleted successfully`,
          duration: 4000,
        }));
      } catch (err) {
        dispatch(addToast({
          type: 'error',
          message: `Failed to delete profile: ${(err as Error).message}`,
          duration: 7000,
        }));
      }
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Database Profiles</h1>
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
            {showForm ? 'Cancel' : '+ New Profile'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingProfile ? 'Edit Profile' : 'Create New Profile'}
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
        <div className="text-center py-12 text-gray-500">Loading profiles...</div>
      ) : profiles.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No profiles yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Create Your First Profile
          </button>
        </div>
      ) : (
        <ProfileList profiles={profiles} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}
