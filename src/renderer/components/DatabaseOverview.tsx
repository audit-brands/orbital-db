// Database Overview component - shows all connections with table counts

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DuckDBProfile } from '@shared/types';
import { useAppDispatch } from '../state/hooks';
import { acquireConnection, releaseConnection } from '../state/slices/profilesSlice';

interface DatabaseStats {
  profileId: string;
  tableCount: number;
  schemaCount: number;
  loading: boolean;
  error: string | null;
}

interface DatabaseOverviewProps {
  profiles: DuckDBProfile[];
}

export default function DatabaseOverview({ profiles }: DatabaseOverviewProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [stats, setStats] = useState<Map<string, DatabaseStats>>(new Map());

  useEffect(() => {
    // Initialize stats for all profiles
    const initialStats = new Map<string, DatabaseStats>();
    profiles.forEach((profile) => {
      initialStats.set(profile.id, {
        profileId: profile.id,
        tableCount: 0,
        schemaCount: 0,
        loading: true,
        error: null,
      });
    });
    setStats(initialStats);

    // Track which profiles have had their connections acquired
    const acquiredConnections = new Set<string>();
    // Track cancellation
    let cancelled = false;

    // Fetch stats for each profile using reference-counted connections
    profiles.forEach((profile) => {
      (async () => {
        try {
          // Use reference-counted connection management
          await dispatch(acquireConnection(profile.id)).unwrap();

          // Track that we acquired this connection
          if (!cancelled) {
            acquiredConnections.add(profile.id);
          }

          // If already cancelled, release immediately and return
          if (cancelled) {
            dispatch(releaseConnection(profile.id));
            return;
          }

          const schemas = await window.orbitalDb.schema.listSchemas(profile.id);

          if (cancelled) {
            dispatch(releaseConnection(profile.id));
            return;
          }

          let totalTables = 0;
          for (const schema of schemas) {
            if (cancelled) {
              dispatch(releaseConnection(profile.id));
              return;
            }
            const tables = await window.orbitalDb.schema.listTables(profile.id, schema.schemaName);
            totalTables += tables.length;
          }

          if (cancelled) {
            dispatch(releaseConnection(profile.id));
            return;
          }

          setStats((prev) => {
            const updated = new Map(prev);
            updated.set(profile.id, {
              profileId: profile.id,
              tableCount: totalTables,
              schemaCount: schemas.length,
              loading: false,
              error: null,
            });
            return updated;
          });
        } catch (error) {
          if (!cancelled) {
            setStats((prev) => {
              const updated = new Map(prev);
              updated.set(profile.id, {
                profileId: profile.id,
                tableCount: 0,
                schemaCount: 0,
                loading: false,
                error: (error as Error).message,
              });
              return updated;
            });
          }
        } finally {
          // Always release the connection when done (only if we acquired it)
          if (acquiredConnections.has(profile.id)) {
            dispatch(releaseConnection(profile.id));
            acquiredConnections.delete(profile.id);
          }
        }
      })();
    });

    // Cleanup: mark as cancelled and release any connections that were acquired
    return () => {
      cancelled = true;
      // Only release connections we actually acquired
      acquiredConnections.forEach((profileId) => {
        dispatch(releaseConnection(profileId));
      });
    };
  }, [profiles, dispatch]);

  if (profiles.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Databases Overview</h2>
      <div className="space-y-3">
        {profiles.map((profile) => {
          const profileStats = stats.get(profile.id);
          const isMemory = profile.dbPath === ':memory:';

          return (
            <div
              key={profile.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{profile.name}</h3>
                    <span className="text-lg" title={isMemory ? 'In-Memory' : 'Persistent'}>
                      {isMemory ? '🧠' : '💾'}
                    </span>
                    {profile.readOnly && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                        Read-only
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-3">
                    {profile.dbPath}
                  </p>

                  {profileStats?.loading ? (
                    <div className="text-sm text-gray-500">Loading statistics...</div>
                  ) : profileStats?.error ? (
                    <div className="text-sm text-red-500">Error loading stats</div>
                  ) : (
                    <div className="flex space-x-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Schemas: </span>
                        <span className="font-medium">{profileStats?.schemaCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Tables: </span>
                        <span className="font-medium">{profileStats?.tableCount || 0}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/db/${profile.id}/schema`)}
                      className="text-sm px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                    >
                      Schema
                    </button>
                    <button
                      onClick={() => navigate(`/db/${profile.id}/query`)}
                      className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Query
                    </button>
                    <button
                      onClick={() => navigate(`/db/${profile.id}/extensions`)}
                      className="text-sm px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                      title="Manage DuckDB extensions"
                    >
                      🔌 Extensions
                    </button>
                    <button
                      onClick={() => navigate(`/db/${profile.id}/import`)}
                      className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Import
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
