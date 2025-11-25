// Profiles management page

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadProfiles, createProfile, deleteProfile } from '../state/slices/profilesSlice';
import type { DuckDBProfileInput } from '@shared/types';
import ProfileForm from '../components/ProfileForm';
import ProfileList from '../components/ProfileList';

export default function ProfilesPage() {
  const dispatch = useAppDispatch();
  const { list: profiles, loading } = useAppSelector((state) => state.profiles);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(loadProfiles());
  }, [dispatch]);

  const handleCreate = async (input: DuckDBProfileInput) => {
    await dispatch(createProfile(input));
    setShowForm(false);
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : 'New Profile'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Create New Profile</h2>
          <ProfileForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
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
        <ProfileList profiles={profiles} onDelete={handleDelete} />
      )}
    </div>
  );
}
