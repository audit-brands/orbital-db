// Schema explorer page

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadSchemas } from '../state/slices/schemaSlice';
import { openConnection } from '../state/slices/profilesSlice';
import SchemaTree from '../components/SchemaTree';

export default function SchemaPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const dispatch = useAppDispatch();
  const { schemas, loading } = useAppSelector((state) => state.schema);
  const profile = useAppSelector((state) =>
    state.profiles.list.find((p) => p.id === profileId)
  );

  useEffect(() => {
    if (profileId) {
      // Open connection and load schemas
      dispatch(openConnection(profileId)).then(() => {
        dispatch(loadSchemas(profileId));
      });
    }
  }, [dispatch, profileId]);

  if (!profile) {
    return <div className="text-red-500">Profile not found</div>;
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Schema Explorer</h1>
      <div className="card">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">{profile.name}</h2>
          <p className="text-sm text-gray-500">{profile.dbPath}</p>
        </div>
        {loading ? (
          <div className="text-gray-500">Loading schemas...</div>
        ) : schemas.length === 0 ? (
          <div className="text-gray-500">No schemas found</div>
        ) : (
          <SchemaTree profileId={profileId!} schemas={schemas} />
        )}
      </div>
    </div>
  );
}
