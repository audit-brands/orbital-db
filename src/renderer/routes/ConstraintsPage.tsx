// Constraints view page

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ConstraintInfo } from '@shared/types';

export default function ConstraintsPage() {
  const { profileId, schemaName, tableName } = useParams<{
    profileId: string;
    schemaName: string;
    tableName: string;
  }>();
  const [constraints, setConstraints] = useState<ConstraintInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConstraints = async () => {
      if (!profileId || !schemaName || !tableName) return;

      setLoading(true);
      setError(null);

      try {
        const result = await window.orbitalDb.constraints.list(
          profileId,
          schemaName,
          tableName
        );
        setConstraints(result);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadConstraints();
  }, [profileId, schemaName, tableName]);

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold mb-4">
        Constraints: {schemaName}.{tableName}
      </h1>

      <div className="card">
        {loading && <div className="text-gray-500">Loading constraints...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {!loading && !error && constraints.length === 0 && (
          <div className="text-gray-500">No constraints found</div>
        )}
        {constraints.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Columns</th>
              </tr>
            </thead>
            <tbody>
              {constraints.map((constraint, idx) => (
                <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{constraint.constraintName}</td>
                  <td className="py-2">{constraint.constraintType}</td>
                  <td className="py-2">{constraint.columnNames.join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
