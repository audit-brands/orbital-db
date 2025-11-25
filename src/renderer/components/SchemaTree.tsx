// Schema tree component

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import { loadTables } from '../state/slices/schemaSlice';
import type { SchemaInfo } from '@shared/types';

interface SchemaTreeProps {
  profileId: string;
  schemas: SchemaInfo[];
}

export default function SchemaTree({ profileId, schemas }: SchemaTreeProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const tables = useAppSelector((state) => state.schema.tables);
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  const toggleSchema = async (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
      // Load tables if not already loaded
      if (!tables[schemaName]) {
        dispatch(loadTables({ profileId, schemaName }));
      }
    }
    setExpandedSchemas(newExpanded);
  };

  const handleTableClick = (schemaName: string, tableName: string) => {
    navigate(`/db/${profileId}/table/${schemaName}/${tableName}`);
  };

  return (
    <div className="space-y-1">
      {schemas.map((schema) => (
        <div key={schema.schemaName}>
          <button
            onClick={() => toggleSchema(schema.schemaName)}
            className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-left"
          >
            <span className="text-gray-500">
              {expandedSchemas.has(schema.schemaName) ? '▼' : '▶'}
            </span>
            <span className="font-medium">📁 {schema.schemaName}</span>
          </button>
          {expandedSchemas.has(schema.schemaName) && tables[schema.schemaName] && (
            <div className="ml-6 space-y-1">
              {tables[schema.schemaName].map((table) => (
                <button
                  key={table.tableName}
                  onClick={() => handleTableClick(schema.schemaName, table.tableName)}
                  className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-left text-sm"
                >
                  <span>{table.tableType === 'VIEW' ? '👁️' : '📊'}</span>
                  <span>{table.tableName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
