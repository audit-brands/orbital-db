# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DuckDB Glass is an Electron-based desktop client for DuckDB databases. It follows a strict process separation model with main process (Node.js + DuckDB), preload script (IPC bridge), and renderer process (React UI).

## Development Commands

### Running the Application

```bash
npm run dev              # Start development server with hot-reload
npm run build            # Build all TypeScript and bundle renderer
npm run preview          # Preview production build
```

### Type Checking

```bash
npm run typecheck        # Check all TypeScript files
npm run typecheck:main   # Check main process only
npm run typecheck:renderer  # Check renderer process only
```

### Code Quality

```bash
npm run lint             # Run ESLint on TypeScript files
npm run format           # Format code with Prettier
```

### Native Module Setup

```bash
npm run postinstall      # Rebuild @duckdb/node-api for Electron
```

This command runs automatically after `npm install` and is critical for DuckDB native module compatibility.

### Packaging

```bash
npm run package          # Package for current platform
npm run package:mac      # Package for macOS (dmg, zip)
npm run package:win      # Package for Windows (nsis, portable)
npm run package:linux    # Package for Linux (AppImage, deb)
```

## Architecture

### Process Separation Model

The application strictly enforces Electron's process isolation:

**Main Process** (`src/main/`):
- Owns DuckDB instances and connections via `DuckDBService`
- Manages profile persistence via `ProfileStore` (JSON file in app userData)
- Exposes IPC handlers for all database operations
- Never directly manipulates UI

**Preload Script** (`src/preload/preload.ts`):
- Security boundary between main and renderer
- Exposes typed `window.duckdbGlass` API via `contextBridge`
- All renderer-to-main communication must go through this API

**Renderer Process** (`src/renderer/`):
- React 18 with Redux Toolkit for state management
- React Router for navigation
- TailwindCSS for styling
- No direct access to Node.js or Electron APIs

### Critical Architecture Rules

1. **DuckDB Integration**: The `@duckdb/node-api` module is a native addon that only runs in the main process. It cannot be used in the renderer.

2. **IPC Channel Naming**: All IPC channels follow the pattern `duckdbGlass:category:action` and are defined in `src/shared/constants.ts`.

3. **Type Safety**: Shared types in `src/shared/types.ts` ensure type consistency across process boundaries.

4. **Connection Management**:
   - Connections are stored in a Map keyed by profile ID
   - Must call `openConnection()` before running queries
   - Use `closeConnection()` to clean up resources
   - `closeAllConnections()` runs on app quit

## DuckDB Service API

The `DuckDBService` class (`src/main/DuckDBService.ts`) provides:

- `openConnection(profile)` - Initialize DuckDB instance for a profile
- `closeConnection(profileId)` - Close and cleanup connection
- `runQuery(profileId, sql)` - Execute SQL and return typed results
- `listSchemas(profileId)` - Introspect schemas via information_schema
- `listTables(profileId, schemaName)` - List tables in a schema
- `getColumns(profileId, schemaName, tableName)` - Get column metadata
- `listConstraints(profileId, schemaName, tableName)` - Get constraints (may fail gracefully on older DuckDB versions)

### DuckDB API Usage Pattern

The service uses the official `@duckdb/node-api` package:

```typescript
// Correct pattern used in this codebase
const instance = await DuckDBInstance.create(dbPath);
const connection = await instance.connect();
const reader = await connection.runAndReadAll(sql);
const columnNames = reader.columnNames();
const columnTypes = reader.columnTypes();
const rows = reader.getRows();
```

**Important**: Always use `closeSync()` for cleanup, not async `close()`.

## Profile Management

Profiles are stored at:
- macOS: `~/Library/Application Support/duckdb-glass/profiles.json`
- Windows: `%APPDATA%/duckdb-glass/profiles.json`
- Linux: `~/.config/duckdb-glass/profiles.json`

The `ProfileStore` class handles CRUD operations and atomically writes to disk.

## State Management

Redux Toolkit slices in `src/renderer/state/slices/`:
- `profilesSlice` - Profile list, loading states, errors
- `schemaSlice` - Schema browser state (schemas, tables, columns)
- `uiSlice` - UI state (theme, active selections, toasts)

Each slice uses RTK Query or async thunks to call `window.duckdbGlass` API.

## Common Development Patterns

### Adding a New IPC Handler

1. Define channel in `src/shared/constants.ts`
2. Add handler in `src/main/ipcHandlers.ts`
3. Add method to DuckDBService if needed
4. Update preload API in `src/preload/preload.ts`
5. Update type definitions in `src/preload/index.d.ts`
6. Use from renderer via `window.duckdbGlass`

### Adding a New UI Route

1. Create page component in `src/renderer/routes/`
2. Add route to `src/renderer/App.tsx`
3. Update sidebar navigation in `src/renderer/components/Sidebar.tsx`

### Modifying Query Execution

All query execution flows through `DuckDBService.runQuery()`. This ensures:
- Consistent error handling
- Performance timing
- Proper connection validation
- Type-safe result transformation

## Build Configuration

- `electron.vite.config.ts` - Main, preload, and renderer build config
- `@duckdb/node-api` is externalized in main process build
- Path aliases: `@main`, `@preload`, `@renderer`, `@shared`
- Native modules are excluded from ASAR via `asarUnpack` in package.json

## Known Constraints

1. **SQL Injection**: Current implementation uses string interpolation for schema/table names. This is acceptable for trusted local usage but should use parameterized queries for production.

2. **Constraint Introspection**: DuckDB's `information_schema.table_constraints` support varies by version. The implementation includes graceful fallback.

3. **Connection Pooling**: Each profile has one connection. No connection pooling is implemented.

4. **Query Parameters**: UI for parameterized queries is not yet implemented, though the types support it.

## Testing Workflow

1. Start dev server: `npm run dev`
2. Create an in-memory profile (`:memory:`) or file-based profile
3. Test schema introspection, query execution, and data grid
4. Verify error handling by running invalid SQL
5. Test connection open/close lifecycle

## Git Commit Conventions

When creating commit messages:

1. **Use descriptive, multi-line commit messages** with clear explanation of changes
2. **Include "🤖 Generated with [Claude Code](https://claude.com/claude-code)" footer** on its own line
3. **DO NOT include Co-Authored-By lines** - these are not used in this repository
4. **Follow conventional commit style** when appropriate (feat:, fix:, docs:, etc.)

Example commit message format:
```
Brief summary of changes

More detailed explanation of what changed and why.
Can span multiple paragraphs.

- Key change 1
- Key change 2
- Key change 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Troubleshooting

**Native module errors**: Run `npm run postinstall` to rebuild for Electron

**Type errors**: Run `npm run typecheck` to identify issues in specific processes

**IPC errors**: Check that channels match between constants, handlers, and preload

**DuckDB connection errors**: Verify profile path exists and has proper permissions
