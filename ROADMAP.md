# Orbital DB - Product Roadmap

## Current Status: v0.1.0 - Core Features Complete ✅

All core functionality is implemented and tested:
- DuckDB integration with connection management
- Profile management with JSON persistence
- Schema browsing and table viewing
- Query execution with result display
- Concurrent connection safety (serialized access)
- Dark mode support
- CI/CD pipeline with automated builds

## Phase 1 - File Picker & Enhanced SQL Support ✅ COMPLETE

### File Picker Integration ✅

**Goal**: Make it easy for users to select database files and attach data files for querying.

**Features**:
- Electron dialog integration for browsing to `.duckdb` files
- "Browse" button in profile creation/editing forms
- File path validation and user-friendly error messages
- Support for both absolute and relative paths

**Tasks**:
- [x] Add Electron dialog integration (IPC handler for `dialog.showOpenDialog`)
- [x] Create `selectDatabaseFile` IPC handler in main process
- [x] Update ProfileForm with file picker button for dbPath field
- [x] Add file validation (check if file exists, readable permissions)
- [x] Update preload API to expose file picker functions

**Implementation Notes**:
- Implemented in `src/main/ipcHandlers.ts` (lines 162-255)
- Exposed via `window.orbitalDb.files.selectDatabase()` in preload API
- Integrated with Browse button in ProfileForm.tsx (lines 19-29, 92-100)
- Includes CSV export file picker in QueryEditor.tsx

### Attached Files Support ✅

**Goal**: Enable users to attach CSV, Parquet, and JSON files that appear as queryable tables.

**Schema Enhancement**:
```typescript
interface AttachedFile {
  id: string;
  alias: string;      // e.g., "sales_data" - used as table name in SQL
  path: string;       // Local file path or URL
  type: 'parquet' | 'csv' | 'json' | 'auto';
}

interface DuckDBProfile {
  // ... existing fields ...
  attachedFiles?: AttachedFile[];
}
```

**User Experience**:
1. In profile view, user sees "Attached Files" section
2. Click "Attach File" → file picker dialog
3. User provides alias (e.g., "sales_data")
4. File appears in schema browser as a queryable table
5. Can query directly: `SELECT * FROM sales_data`

**Tasks**:
- [x] Update DuckDBProfile type with attachedFiles field
- [x] Add "Attached Files" section to ProfileForm component
- [x] Create AttachedFileList component for viewing/managing files
- [x] Implement add/remove file functionality in UI
- [x] Update DuckDBService.openConnection to create views for attached files
  ```sql
  CREATE VIEW {alias} AS SELECT * FROM read_parquet('{path}');
  CREATE VIEW {alias} AS SELECT * FROM read_csv('{path}');
  CREATE VIEW {alias} AS SELECT * FROM read_json('{path}');
  ```
- [x] Update schema introspection to include attached file views
- [x] Add visual indicators in schema tree (📎 icon for attached files)
- [x] Persist attachedFiles array in profiles.json

**Implementation Notes**:
- Implemented in `src/renderer/components/AttachedFileList.tsx`
- File picker integration via `window.orbitalDb.files.selectDataFiles()` (lines 19-48)
- Auto-detection of file type from extension
- Alias validation and duplicate checking
- Views created in DuckDBService.openConnection (lines 142-167)

### Full SQL Support Verification ✅

**Goal**: Ensure all SQL statement types work correctly and provide appropriate feedback.

**SQL Statement Support Matrix**:

| Category | Statements | Status | Needs |
|----------|-----------|--------|-------|
| **DQL** | SELECT, WITH | ✅ Working | Nothing - fully functional |
| **DDL** | CREATE, ALTER, DROP, TRUNCATE | ✅ Working | Nothing - fully functional |
| **DML** | INSERT, UPDATE, DELETE, MERGE | ✅ Working | Nothing - fully functional |
| **TCL** | BEGIN, COMMIT, ROLLBACK, SAVEPOINT | ✅ Working | Nothing - fully functional |

**Persistence Behavior**:
- **File-based databases** (`.duckdb`): All changes persist to disk automatically
- **In-memory databases** (`:memory:`): All changes lost when connection closes
- **Read-only mode**: Prevents DDL/DML operations

**Tasks**:
- [x] Test DDL statements (CREATE TABLE, CREATE VIEW, DROP, ALTER)
- [x] Test DML statements (INSERT, UPDATE, DELETE)
- [x] Test TCL statements (BEGIN TRANSACTION, COMMIT, ROLLBACK)
- [x] Add affected row count display for non-SELECT queries
- [x] Improve query result handling for statements that don't return rows
- [x] Add persistence indicator in TopBar (💾 for file, 🧠 for memory)
- [ ] Add transaction mode indicator (show when in active transaction)
- [x] Create SQL examples documentation for common operations
- [x] Add statement type detection for better result formatting

**Implementation Notes**:
- Statement type detection in `DuckDBService.detectStatementType()` (lines 408-436)
- Affected row count displayed for DML operations in QueryResult
- Persistence indicator (💾/🧠) added to TopBar.tsx (lines 51-59)
- Comprehensive SQL examples in `SQL_EXAMPLES.md`
- UI displays appropriate success banners for each statement type (QueryEditor.tsx)
- Read-only enforcement uses backend classification (QueryEditor.tsx lines 62-66)

**Example SQL Workflows**:
```sql
-- DDL: Create persistent table
CREATE TABLE customers (id INTEGER, name VARCHAR, email VARCHAR);

-- DML: Insert data
INSERT INTO customers VALUES (1, 'Alice', 'alice@example.com');

-- DQL: Query data
SELECT * FROM customers;

-- Query attached Parquet file
SELECT * FROM sales_data;  -- where sales_data is attached file

-- TCL: Use transactions
BEGIN TRANSACTION;
UPDATE customers SET email = 'new@example.com' WHERE id = 1;
COMMIT;
```

---

## Phase 1.5 - Security Hardening ✅ COMPLETE

### SQL Injection Prevention ✅

**Goal**: Eliminate SQL injection vulnerabilities in metadata queries and user input.

**Security Issues Fixed**:
- SQL injection in backend metadata queries (`listTables`, `getColumns`, `listConstraints`)
- SQL injection in frontend TablePage route parameter handling
- All user-supplied identifiers now properly escaped

**Tasks**:
- [x] Add `escapeSqlString()` helper function for WHERE clause values
- [x] Update `listTables()` to escape schema names (DuckDBService.ts:308)
- [x] Update `getColumns()` to escape schema and table names (DuckDBService.ts:329-330)
- [x] Update `listConstraints()` to escape schema and table names (DuckDBService.ts:353-354)
- [x] Add `escapeSqlIdentifier()` to frontend for quoted identifiers (TablePage.tsx:10-16)
- [x] Escape route parameters in TablePage before SQL construction (TablePage.tsx:46-48)

**Implementation Notes**:
- `escapeSqlString()` doubles single quotes (SQL standard) for use in WHERE clauses
- `escapeSqlIdentifier()` doubles double quotes for use in quoted identifiers
- All user input from renderer is sanitized before SQL construction
- Codex-reviewed and approved

### File Write Security Audit ✅

**Goal**: Ensure no arbitrary file write primitives are exposed to renderer.

**Status**: Already secure
- `window.orbitalDb.files.writeFile` API does not exist
- All file operations require user dialog interaction
- No arbitrary file write paths exposed

### Read-Only Mode Enforcement ✅

**Goal**: Ensure read-only profiles cannot execute mutations at database level.

**Status**: Already enforced
- Backend sets `PRAGMA read_only=1;` when opening read-only connections (DuckDBService.ts:65-67)
- Frontend blocks mutating statements (DML, DDL, TCL) for read-only profiles (QueryEditor.tsx:67-87)
- Defense-in-depth: both UI and database level protection

### Content Security Policy ✅

**Goal**: Add restrictive CSP to prevent XSS and remote script loading.

**Status**: Already implemented
- Comprehensive CSP in renderer HTML (src/renderer/index.html:6-9)
- Blocks remote scripts, inline scripts, and unauthorized origins
- Allows HMR websockets for development (`ws://localhost:5173`)

**Implementation Summary**:
All Phase 1 security hardening complete. No critical or medium severity security issues remain from Codex security audit.

---

## Phase 2: Query Experience Improvements

### Query History & Saved SQL ✅ COMPLETE

**Goal**: Help users reuse and organize their SQL queries.

**Features**:
- Persist last N queries per profile (stored in profiles.json) ✅
- Query history panel with tabbed UI ✅
- Quick re-run and copy buttons for historical queries ✅
- Saved SQL with friendly names and descriptions ✅
- Search/filter through query history ✅

**Tasks**:
- [x] Add query history storage (limit to last 50 queries per profile)
- [x] Create QueryHistory component with list view
- [x] Add timestamp and execution time to history entries
- [x] Implement "Run Again" action
- [x] Add tab-based UI for Results/History/Saved
- [x] Add "Copy" button for quick query reuse
- [x] Improve SQL statement type classification (SHOW, DESCRIBE, etc. as DQL)
- [x] Create SavedSnippets feature for frequently used queries
- [x] Add snippet management UI (save, edit, delete)
- [x] Implement search/filter functionality for history (SQL text, status, statement type)

**Implementation Notes**:
- Query history persisted in profiles.json with 50-query limit per profile
- Three-tab UI in QueryEditor.tsx: Results, History, and Saved SQL
- Copy-to-clipboard with 2-second visual feedback
- Statement type badges (DQL, DML, DDL, TCL) with color coding
- History auto-refreshes after query execution
- Saved SQL with name, description, timestamps (max 100 per profile)
- Backend validation: field length limits, type checking, count enforcement
- Search filters: case-insensitive text search, status filter (success/failed), statement type filter
- Full implementation in QueryHistory.tsx, SavedSnippets.tsx, SaveSnippetDialog.tsx, and QueryEditor.tsx

### Monaco Editor Integration ✅ COMPLETE

**Goal**: Replace textarea with professional SQL editor while maintaining simplicity.

**Design Principles**:
- Keep it minimal and approachable (not a full IDE)
- Clean interface that respects both light and dark themes
- Preserve the simple, focused editing experience
- Easy revert path if it feels too heavy

**Features**:
- Syntax highlighting for SQL ✅
- Autocomplete using DuckDB's native `sql_auto_complete` function ✅
- Multi-cursor editing ✅
- Find/replace functionality ✅
- Bracket matching and code folding ✅

**Tasks**:
- [x] Install `@monaco-editor/react` package
- [x] Replace textarea in QueryEditor with Monaco
- [x] Configure minimal SQL language support (no unnecessary UI chrome)
- [x] Implement autocomplete provider using DuckDB's `sql_auto_complete()`
- [x] Add DuckDB-specific SQL functions to autocomplete
- [x] Configure keybindings (keep Cmd/Ctrl+Enter for execution)
- [x] Test in both light and dark themes
- [x] Disable IDE-like features (minimap disabled, optional line numbers, etc.)

**Implementation Notes**:
- Implemented in `src/renderer/components/SqlEditor.tsx`
- Monaco Editor configured with minimal, clean setup (no minimap, focused interface)
- Autocomplete uses DuckDB's native `sql_auto_complete()` function via IPC
- Supports both light (`vs`) and dark (`vs-dark`) themes
- Cmd/Ctrl+Enter keybinding preserved for query execution
- Fixed Windows build issues with proper path handling in `vite-plugin-monaco-editor`

### Streaming & Virtualized Results ✅ COMPLETE

**Goal**: Handle large result sets efficiently without freezing the UI.

**Features**:
- Virtualized scrolling for DataGrid (only render visible rows) ✅
- Row limiting at query level (DEFAULT_RESULT_LIMIT = 1000) ✅
- Memory-efficient CSV export via DuckDB's COPY TO ✅
- Smooth 60fps scrolling with large datasets ✅

**Tasks**:
- [x] Install `@tanstack/react-virtual` library
- [x] Create VirtualizedDataGrid component with row virtualization
- [x] Replace DataGrid with VirtualizedDataGrid in QueryEditor and TablePage
- [x] Configure virtualizer with appropriate overscan and row height estimation
- [x] Maintain existing features (row numbering, NULL display, column headers)

**Implementation Notes**:
- Implemented in `src/renderer/components/VirtualizedDataGrid.tsx`
- Uses @tanstack/react-virtual with 35px estimated row height and 10 row overscan
- Only renders ~20-30 visible rows at a time instead of all 1,000
- Significantly reduced DOM nodes and memory footprint
- Existing row limiting (1,000 rows) combined with virtualization provides optimal performance
- CSV export already streams via DuckDB's native COPY TO command
- No need for streaming at query level - DuckDB handles 1B rows efficiently with LIMIT clause
- Prepares codebase for 1 Billion Row Challenge testing

---

## Phase 3: Performance Monitoring & Insights

### Slow Query Insights

**Goal**: Help users understand query performance and optimize their SQL.

**Features**:
- Record execution time and row count for all queries
- Visual indicators for slow queries (> 5s)
- Toast notifications for long-running queries
- Query execution statistics dashboard
- Performance history chart

**Tasks**:
- [ ] Add query execution metrics to result metadata
- [ ] Create performance tracking service
- [ ] Implement toast notification system
- [ ] Add slow query warning threshold in Settings
- [ ] Create performance insights page with charts
- [ ] Show query plan (EXPLAIN) option in QueryEditor

### Enhanced Cancellation UX

**Goal**: Make query cancellation more visible and reliable.

**Features**:
- Progress indicator during query execution
- Prominent Cancel button (already implemented)
- Timeout override UI for specific queries
- Notification when query is cancelled or times out
- Support for cancelling multiple concurrent queries

**Tasks**:
- [ ] Add progress bar during query execution
- [ ] Improve cancel button visibility and feedback
- [ ] Add per-query timeout override field
- [ ] Create unified notification/toast system
- [ ] Surface timeout events from worker thread
- [ ] Add query queue visualization for concurrent queries

---

## Phase 4: Data Import/Export Enhancements ✅ COMPLETE

### Export Functionality ✅ COMPLETE

**Goal**: Enable users to export query results in multiple formats.

**Features**:
- Export to CSV ✅ (implemented in QueryEditor with file picker)
- Export to JSON (future enhancement)
- Export to Parquet (future enhancement)
- Copy to clipboard (formatted for Excel, Markdown, etc.) (future enhancement)
- Export with optional row limit ✅ (uses current result limit)

**Tasks**:
- [x] Add "Export CSV" button to query results (QueryEditor.tsx)
- [x] Implement CSV export in DuckDBService using COPY TO
- [x] Add file picker for export destination
- [x] Show success/error feedback with toast notifications
- [ ] Create ExportDialog component with format selection (future)
- [ ] Implement JSON export in DuckDBService (future)
- [ ] Implement Parquet export in DuckDBService (future)
- [ ] Add clipboard copy functionality (future)
- [ ] Show export progress for large datasets (future)
- [ ] Add export format preference in Settings (future)

**Implementation Notes**:
- CSV export implemented using DuckDB's native `COPY TO` command
- File picker integration via `window.orbitalDb.files.selectExportFile()`
- Exports use current query results with applied row limit
- Tested with spatial queries - CSV export working correctly

### Import Wizard Improvements

**Goal**: Make data import more flexible and user-friendly.

**Features**:
- Batch import multiple files at once
- File format auto-detection
- Schema inference and preview
- Custom delimiter/encoding options for CSV
- Import validation and error reporting

**Tasks**:
- [ ] Support multiple file selection in import dialog
- [ ] Add file format detection based on content
- [ ] Implement schema preview before import
- [ ] Add CSV options (delimiter, header, encoding)
- [ ] Create validation step with error highlighting
- [ ] Show import progress with row count updates

---

## Phase 5: Advanced Features

### MotherDuck Cloud Integration

**Goal**: Connect to MotherDuck cloud databases for collaborative analytics.

**Schema Enhancement**:
```typescript
interface DuckDBProfile {
  connectionType: 'file' | 'memory' | 'motherduck';

  // For MotherDuck
  motherDuckToken?: string;
  motherDuckDatabase?: string;
}
```

**Features**:
- Connect to MotherDuck cloud databases
- Secure token storage using Electron safeStorage
- Cloud status indicator in TopBar
- Share databases across team members
- Mix local and cloud data sources

**Tasks**:
- [ ] Add MotherDuck connection type to ProfileForm
- [ ] Implement secure token storage (not in plain JSON)
- [ ] Update DuckDBService to handle `md:` connection strings
- [ ] Add connection validation for MotherDuck
- [ ] Create cloud status indicator in UI
- [ ] Handle authentication errors gracefully
- [ ] Add MotherDuck documentation and examples

### Remote File Support ✅ COMPLETE

**Goal**: Query data from HTTP and S3 URLs without downloading.

**Status**: Fully implemented - users can now attach and query remote files via HTTP/HTTPS/S3 URLs.

**Implementation Summary**:

**UI Features** (AttachedFileList.tsx):
- Input mode toggle: "Local File" vs "Remote URL" ✅
- URL validation for HTTP, HTTPS, and S3 protocols ✅
- Auto-detection of file type from URL extension ✅
- Alias suggestion from URL pathname ✅
- Visual "🌐 Remote" badge for remote files ✅
- File picker for local files or manual URL entry ✅

**Backend Support** (DuckDBService.ts):
- DuckDB's native read functions (`read_csv`, `read_parquet`, `read_json`) natively support URLs ✅
- S3 authentication via httpfs extension with encrypted credentials ✅
- Graceful error handling for unavailable remote files (non-fatal warnings) ✅
- CREATE VIEW pattern works identically for local and remote files ✅

**S3 Authentication** (configureS3Secrets):
- Three authentication providers: 'config' (manual), 'credential_chain' (auto), 'env' (environment) ✅
- Encrypted credential storage using OS-level safeStorage (Keychain/DPAPI/libsecret) ✅
- Support for custom S3 endpoints (e.g., MinIO, Wasabi) ✅
- Region, session token, URL style, and SSL configuration ✅

**Example Usage**:
```typescript
// Attach remote Parquet file from HTTP
{
  alias: "sales_data",
  path: "https://example.com/data/sales.parquet",
  type: "parquet"
}

// Attach CSV from S3 (requires S3 config)
{
  alias: "customer_data",
  path: "s3://my-bucket/customers.csv",
  type: "csv"
}

// Query the remote files
SELECT * FROM sales_data JOIN customer_data ON sales_data.customer_id = customer_data.id
```

**Tasks**:
- [x] Add URL support to AttachedFile type
- [x] Implement HTTP/HTTPS/S3 URL validation
- [x] Add S3 credentials to profile settings
- [x] Test DuckDB's native HTTP/S3 support
- [x] Add connection status for remote files
- [x] Handle network errors gracefully
- [x] Create input mode toggle UI (Local File vs Remote URL)
- [x] Implement auto-detection of file type from URL
- [x] Add visual indicators for remote files
- [x] Implement OS-level credential encryption for S3

**Security**:
- S3 credentials encrypted using Electron safeStorage API
- UI warns users when encryption unavailable (e.g., Linux without libsecret)
- Manual S3 credentials disabled when encryption unavailable
- Lock icon only displayed when encryption confirmed available

**Known Limitations**:
- Remote file errors logged as warnings, don't fail connection open
- No caching strategy (DuckDB handles HTTP caching internally)
- No progress indicators for remote data access (future enhancement)

### Extension Management ✅ COMPLETE

**Goal**: Make it easy to install and use DuckDB extensions.

**Backend Status**: ✅ Already implemented
- Extensions stored in profile.extensions array (DuckDBProfile type)
- Auto-loaded on connection open (DuckDBService.ts:72-76)
- Users can query extension status with `SELECT * FROM duckdb_extensions()`

**Features**:
- UI for browsing available extensions ✅
- One-click extension installation ✅
- Extension status indicators (installed/loaded/auto-load) ✅
- Auto-load extensions on connection ✅
- Search/filter extensions by name or description ✅
- Statistics dashboard showing extension counts ✅

**Tasks**:
- [x] Store loaded extensions in profile settings (backend complete)
- [x] Auto-load extensions on connection open (backend complete)
- [x] Create Extensions management UI page (ExtensionsPage.tsx)
- [x] List available DuckDB extensions via `duckdb_extensions()` query
- [x] Add "Install" button for each extension (runs `INSTALL {ext}`)
- [x] Add "Load" button for installed extensions (runs `LOAD {ext}`)
- [x] Add auto-load toggle for each extension (adds/removes from profile.extensions)
- [x] Show extension status indicators (Loaded/Installed/Auto-load badges)
- [x] Handle DuckDB LIST type parsing for aliases field
- [x] Add proper connection management (acquireConnection/releaseConnection)
- [x] Implement toast notifications for user feedback

**Implementation Notes**:
- Created ExtensionsPage.tsx with full extension management UI
- Added route `/db/:profileId/extensions` to App.tsx
- Added Extensions navigation button (🔌) to DatabaseOverview.tsx
- Properly handles DuckDB LIST type with `{items: [...]}` structure
- Uses same connection pattern as SchemaPage (await acquireConnection().unwrap())
- Displays statistics: Total Extensions, Installed, Loaded, Auto-load counts
- Tested with spatial extension - install, load, and query execution working
- Status badges: Loaded (green), Installed (blue), Auto-load (purple)

---

## Phase 6: User Experience Polish

### Settings Page Enhancement

**Goal**: Give users control over application behavior.

**Features**:
- Theme selection (light/dark/auto)
- Default row limit configuration
- Auto-open last used profile on startup
- Default query timeout settings
- Editor preferences (font size, theme, key bindings)
- Performance tuning (memory limit, thread count)

**Tasks**:
- [ ] Create Settings store in Redux
- [ ] Implement theme auto-detection based on system
- [ ] Add settings persistence to app config file
- [ ] Create SettingsPage with organized sections
- [ ] Add default values for all configurable options
- [ ] Apply settings to DuckDBService on connection
- [ ] Add settings import/export for backup

### Keyboard Shortcuts

**Goal**: Enable power users to work efficiently.

**Shortcuts to Implement**:
- `Cmd/Ctrl+K` - Quick command palette
- `Cmd/Ctrl+N` - New profile
- `Cmd/Ctrl+T` - New query tab
- `Cmd/Ctrl+W` - Close current tab
- `Cmd/Ctrl+1-9` - Switch between profiles
- `Cmd/Ctrl+B` - Toggle schema browser
- `Cmd/Ctrl+/` - Toggle comment in SQL editor
- `F5` - Refresh schema tree

**Tasks**:
- [ ] Create keyboard shortcut service
- [ ] Implement command palette component
- [ ] Add shortcut hints to UI (tooltips, help page)
- [ ] Make shortcuts configurable in Settings
- [ ] Add keyboard shortcut documentation

### Notifications & Feedback

**Goal**: Provide clear, non-intrusive feedback for all operations.

**Features**:
- Toast notification system for success/error messages
- Progress indicators for long-running operations
- Confirmation dialogs for destructive actions
- Undo/redo support for profile changes
- Status bar with connection and operation info

**Tasks**:
- [ ] Implement toast notification system
- [ ] Create NotificationService in Redux
- [ ] Add progress indicators to async operations
- [ ] Implement confirmation dialogs for delete operations
- [ ] Add undo stack for profile CRUD
- [ ] Create status bar component

---

## Phase 7: Testing & Quality

### Automated Testing Suite

**Goal**: Ensure reliability and prevent regressions.

**Test Coverage**:
- Unit tests for DuckDBService
- Unit tests for Redux slices
- Integration tests for IPC handlers
- E2E tests for critical user flows
- Performance benchmarks

**Tasks**:
- [ ] Set up Jest for unit testing
- [ ] Write tests for DuckDBService methods
- [ ] Write tests for Redux slice reducers
- [ ] Set up Playwright for E2E testing
- [ ] Create E2E test scenarios (create profile, run query, etc.)
- [ ] Add CI job for running tests
- [ ] Set up code coverage reporting
- [ ] Create performance regression tests

### Documentation & Onboarding

**Goal**: Help new users get started quickly.

**Documentation Needs**:
- Getting started guide with screenshots
- Video tutorials for common workflows
- SQL examples and best practices
- DuckDB-specific features guide
- Troubleshooting FAQ
- API documentation for developers

**Tasks**:
- [ ] Update README with screenshots and GIFs
- [ ] Create user guide with step-by-step tutorials
- [ ] Record demo videos for key features
- [ ] Write DuckDB tips and tricks guide
- [ ] Create troubleshooting FAQ page
- [ ] Add in-app help and tooltips
- [ ] Create developer documentation for contributors

---

## Release Planning

### v0.2.0 - File Management & SQL Completeness
**Target**: Q1 2025
- File picker integration
- Attached files support
- Full SQL verification (DDL/DML/TCL)
- Query history
- Monaco editor integration

### v0.3.0 - Performance & UX
**Target**: Q2 2025
- Virtualized result grids
- Streaming query execution
- Export enhancements (JSON, Parquet)
- Settings page
- Keyboard shortcuts

### v0.4.0 - Advanced Features
**Target**: Q3 2025
- MotherDuck integration
- Remote file support
- Extension management
- Automated testing suite

### v1.0.0 - Production Ready
**Target**: Q4 2025
- Complete test coverage
- Full documentation
- Performance optimizations
- Security audit
- Accessibility compliance

---

## Technical Debt & Maintenance

### Current Technical Debt

**Console Warnings** (Priority: Low - Non-blocking)

1. **Redux Selector Warning in TopBar.tsx**
   - **Issue**: `useSelector` returns a fresh object `{ activeProfile, status, error }` on every render, causing unnecessary re-renders
   - **Root Cause**: Inline object creation in selector breaks referential equality
   - **Fix**:
     - [ ] Create memoized selector using `createSelector` from Reselect
     - [ ] Update TopBar.tsx to use memoized selector
   - **Files**: `src/renderer/components/TopBar.tsx`
   - **Priority**: Low (performance optimization)

2. **React Router Future Flags**
   - **Issue**: Warnings about upcoming React Router v7 behavior changes
   - **Details**:
     - `v7_startTransition`: Will wrap state updates in React 18's startTransition
     - `v7_relativeSplatPath`: Changes relative path resolution in splat routes
   - **Options**:
     - [ ] Option A: Add future flags now to test v7 behavior early (recommended)
     - [ ] Option B: Add backlog ticket to address before React Router v7 upgrade
   - **Files**: `src/renderer/main.tsx` or router setup location
   - **Priority**: Low (informational warning, no current impact)

3. **React DevTools Reminder**
   - **Issue**: Console message about React DevTools not being installed
   - **Resolution**: Not a code issue - install browser extension locally if enhanced debugging is desired
   - **Priority**: Informational only (no action needed)

### Ongoing Maintenance Tasks
- [ ] Keep @duckdb/node-api updated with latest releases
- [ ] Monitor Electron security advisories
- [ ] Update dependencies regularly (npm audit)
- [ ] Review and improve error messages based on user feedback
- [ ] Performance monitoring and optimization
- [ ] Code cleanup and refactoring as needed

---

## Community & Contribution

### Open Source Readiness
- [ ] Add CONTRIBUTING.md guidelines
- [ ] Create issue templates for bugs and features
- [ ] Set up PR template with checklist
- [ ] Add CODE_OF_CONDUCT.md
- [ ] Create developer setup guide
- [ ] Add architecture decision records (ADR)

### Community Features
- [ ] User feedback mechanism
- [ ] Feature request voting system
- [ ] Community SQL snippet sharing
- [ ] Plugin/extension system for community add-ons

---

**Last Updated**: 2025-11-29
**Current Version**: v0.1.0
**Next Milestone**: v0.3.0 - Performance & UX

**Recent Completions**:
- Phase 2: Query Experience Improvements ✅
- Phase 4: Data Import/Export (CSV Export) ✅
- Phase 5: Advanced Features (Extension Management + Remote File Support) ✅
