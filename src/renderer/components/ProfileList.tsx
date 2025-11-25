// Profile list component

import { useNavigate } from 'react-router-dom';
import type { DuckDBProfile } from '@shared/types';

interface ProfileListProps {
  profiles: DuckDBProfile[];
  onDelete: (id: string) => void;
}

export default function ProfileList({ profiles, onDelete }: ProfileListProps) {
  const navigate = useNavigate();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {profiles.map((profile) => (
        <div key={profile.id} className="card hover:shadow-lg transition-shadow min-w-0">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg">{profile.name}</h3>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
            <div className="truncate">
              <span className="font-medium">Path:</span> {profile.dbPath}
            </div>
            {profile.readOnly && (
              <div className="text-yellow-600 dark:text-yellow-500">Read-only</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/db/${profile.id}/schema`)}
              className="flex-1 min-w-[80px] btn-primary text-sm py-1.5"
            >
              Schema
            </button>
            <button
              onClick={() => navigate(`/db/${profile.id}/query`)}
              className="flex-1 min-w-[80px] btn-secondary text-sm py-1.5"
            >
              Query
            </button>
            <button
              onClick={() => onDelete(profile.id)}
              className="flex-1 min-w-[80px] py-1.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
