// Profile creation/edit form

import { useState } from 'react';
import type { DuckDBProfileInput } from '@shared/types';

interface ProfileFormProps {
  onSubmit: (profile: DuckDBProfileInput) => void;
  onCancel: () => void;
  initialValues?: Partial<DuckDBProfileInput>;
}

export default function ProfileForm({ onSubmit, onCancel, initialValues }: ProfileFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [dbPath, setDbPath] = useState(initialValues?.dbPath || ':memory:');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, dbPath });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Profile Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field w-full"
          placeholder="My Database"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Database Path</label>
        <input
          type="text"
          value={dbPath}
          onChange={(e) => setDbPath(e.target.value)}
          className="input-field w-full"
          placeholder=":memory: or /path/to/database.db"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Use :memory: for an in-memory database, or provide a file path
        </p>
      </div>

      <div className="flex space-x-2">
        <button type="submit" className="btn-primary">
          {initialValues ? 'Update' : 'Create'} Profile
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
