// Main App component with routing

import { Routes, Route } from 'react-router-dom';
import RootLayout from './routes/RootLayout';
import DashboardPage from './routes/DashboardPage';
import ProfilesPage from './routes/ProfilesPage';
import SchemaPage from './routes/SchemaPage';
import TablePage from './routes/TablePage';
import ConstraintsPage from './routes/ConstraintsPage';
import QueryPage from './routes/QueryPage';
import SettingsPage from './routes/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="db/:profileId/schema" element={<SchemaPage />} />
        <Route path="db/:profileId/query" element={<QueryPage />} />
        <Route path="db/:profileId/table/:schemaName/:tableName" element={<TablePage />} />
        <Route
          path="db/:profileId/constraints/:schemaName/:tableName"
          element={<ConstraintsPage />}
        />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
