// Table data view page

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { QueryResult } from '@shared/types';
import DataGrid from '../components/DataGrid';
import { useAppDispatch } from '../state/hooks';
import { acquireConnection, releaseConnection } from '../state/slices/profilesSlice';

/**
 * Safely escapes a SQL identifier by replacing double quotes with two double quotes.
 * This prevents SQL injection when using identifiers in queries.
 */
function escapeSqlIdentifier(identifier: string): string {
  return identifier.replace(/"/g, '""');
}

export default function TablePage() {
  const { profileId, schemaName, tableName } = useParams<{
    profileId: string;
    schemaName: string;
    tableName: string;
  }>();
  const dispatch = useAppDispatch();
  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    dispatch(acquireConnection(profileId));
    return () => {
      dispatch(releaseConnection(profileId));
    };
  }, [dispatch, profileId]);

  useEffect(() => {
    const loadTableData = async () => {
      if (!profileId || !schemaName || !tableName) return;

      setLoading(true);
      setError(null);

      try {
        // Safely escape schema and table names to prevent SQL injection
        const escapedSchema = escapeSqlIdentifier(schemaName);
        const escapedTable = escapeSqlIdentifier(tableName);
        const sql = `SELECT * FROM "${escapedSchema}"."${escapedTable}" LIMIT 1000`;
        const result = await window.orbitalDb.query.run(profileId, sql);
        setData(result);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadTableData();
  }, [profileId, schemaName, tableName]);

  return (
    <div className="max-w-full">
      <h1 className="text-2xl font-bold mb-4">
        {schemaName}.{tableName}
      </h1>

      {loading && <div className="text-gray-500">Loading table data...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}
      {data && (
        <div className="card">
          <div className="mb-4 text-sm text-gray-500">
            {data.rowCount} rows • {data.executionTimeMs.toFixed(2)}ms
            {data.truncated && (
              <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                Showing first results only
              </span>
            )}
          </div>
          <DataGrid result={data} />
        </div>
      )}
    </div>
  );
}
