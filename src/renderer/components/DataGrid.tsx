// Data grid component for displaying query results

import type { QueryResult } from '@shared/types';

interface DataGridProps {
  result: QueryResult;
}

export default function DataGrid({ result }: DataGridProps) {
  if (result.rowCount === 0) {
    return <div className="text-gray-500 text-center py-8">No data</div>;
  }

  return (
    <div className="overflow-auto max-h-[600px] border border-gray-200 dark:border-gray-700 rounded">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-600">
              #
            </th>
            {result.columns.map((col, idx) => (
              <th
                key={idx}
                className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-600 whitespace-nowrap"
              >
                <div>{col.name}</div>
                <div className="text-gray-400 font-normal">{col.dataType}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-3 py-2 text-xs text-gray-400 border-r border-gray-200 dark:border-gray-700">
                {rowIdx + 1}
              </td>
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 max-w-xs truncate"
                  title={String(cell)}
                >
                  {cell === null ? (
                    <span className="text-gray-400 italic">NULL</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
