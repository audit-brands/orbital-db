// Profiles management page

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadProfiles, createProfile, updateProfile, deleteProfile } from '../state/slices/profilesSlice';
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
    if (editingProfile) {
      // Update existing profile
      await dispatch(updateProfile({ id: editingProfile.id, update: input }));
      setEditingProfile(null);
    } else {
      // Create new profile
      await dispatch(createProfile(input));
    }
    setShowForm(false);
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
    if (confirm('Are you sure you want to delete this profile?')) {
      await dispatch(deleteProfile(id));
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
            initialValues={editingProfile ? { name: editingProfile.name, dbPath: editingProfile.dbPath } : undefined}
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
