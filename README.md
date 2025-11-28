# Orbital DB

A modern desktop client for DuckDB databases, built with Electron, React, and TypeScript.

![DuckDB](https://img.shields.io/badge/DuckDB-FFF000?style=for-the-badge&logo=duckdb&logoColor=black)
![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## Features

✨ **Multiple Database Profiles** - Manage multiple DuckDB database connections
🔍 **Schema Explorer** - Browse database schemas, tables, and columns
📝 **Query Editor** - Write and execute custom SQL queries with syntax highlighting, per-query timeouts, and a manual cancel button
📊 **Data Grid Viewer** - View query results in an interactive table with automatic row limiting for large datasets
🔗 **Constraints Viewer** - Inspect table constraints and relationships
⚙️ **Settings Management** - Customize application preferences
🌙 **Dark Mode Support** - Built-in light and dark themes

## Download & Installation

### Installing Pre-built Binaries

Download the latest release for your platform from the [Releases page](https://github.com/audit-brands/orbital-db/releases):

#### macOS
1. Download `Orbital.DB-X.X.X-arm64.dmg`
2. Open the DMG file
3. Drag Orbital DB to Applications

**Security Note**: Since the app is not signed with an Apple Developer certificate, you'll see a security warning:
- **First time**: Right-click the app → Select "Open" → Click "Open" in the dialog
- **Alternative**: System Settings → Privacy & Security → Click "Open Anyway"

#### Windows
1. Download `Orbital.DB.Setup.X.X.X.exe`
2. Run the installer

**Security Note**: Windows SmartScreen will show a warning because the app is not code-signed:
- Click "More info" → Click "Run anyway"

#### Linux

**Debian/Ubuntu** (DEB package):
```bash
sudo dpkg -i orbital-db_X.X.X_amd64.deb
sudo apt-get install -f  # Install dependencies if needed
```

**Universal** (AppImage):
```bash
chmod +x Orbital.DB-X.X.X.AppImage
./Orbital.DB-X.X.X.AppImage
```

### Why the Security Warnings?

These builds are **not code-signed**. Code signing certificates cost $99-300/year per platform. The app is safe to use - the warnings are simply because we haven't purchased signing certificates yet. All code is open source and built via GitHub Actions, which you can verify in the repository.

## Development Setup

### Prerequisites

- **Node.js** 20.0.0 or higher
- **npm** or **yarn**

### Clone the Repository

\`\`\`bash
git clone https://github.com/yourusername/orbital_db.git
cd orbital_db
\`\`\`

### Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Build DuckDB Native Module

The DuckDB native module needs to be rebuilt for Electron:

\`\`\`bash
npm run postinstall
\`\`\`

This will automatically run \`electron-rebuild\` to compile the \`@duckdb/node-api\` module for your Electron version.

## Development

### Run in Development Mode

\`\`\`bash
npm run dev
\`\`\`

This will start the Electron app with hot-reload enabled for both the main and renderer processes.

### Type Checking

\`\`\`bash
# Check all TypeScript files
npm run typecheck

# Check main process only
npm run typecheck:main

# Check renderer process only
npm run typecheck:renderer
\`\`\`

### Linting & Formatting

\`\`\`bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
\`\`\`

### Environment Configuration

You can fine-tune resource safeguards for development by adding a `.env` file in the project root:

| Variable | Default | Description |
| --- | --- | --- |
| `DEFAULT_RESULT_LIMIT` | `1000` | Maximum number of rows returned to the renderer for a query (CSV exports continue to stream the full dataset). |
| `DEFAULT_QUERY_TIMEOUT_MS` | `60000` | Automatic query timeout in milliseconds before DuckDB interrupts execution; set to `0` to disable globally. |

In addition, the Query Editor exposes per-query timeout overrides and a **Cancel Query** button for manual interruption.

## Building for Production

### Build the Application

\`\`\`bash
npm run build
\`\`\`

This compiles the TypeScript code and bundles the renderer with Vite.

### Package the Application

\`\`\`bash
# Package for current platform
npm run package

# Package for macOS
npm run package:mac

# Package for Windows
npm run package:win

# Package for Linux
npm run package:linux
\`\`\`

The packaged application will be in the \`release/\` directory.

## Architecture

Orbital DB follows a strict process separation model:

### Main Process (\`src/main/\`)
- **main.ts** - Application lifecycle and window management
- **DuckDBService.ts** - DuckDB database integration layer
- **ProfileStore.ts** - Profile persistence (JSON file storage)
- **ipcHandlers.ts** - IPC communication handlers

### Preload Script (\`src/preload/\`)
- **preload.ts** - Secure bridge between main and renderer processes
- Exposes \`window.orbitalDb\` API to the renderer

### Renderer Process (\`src/renderer/\`)
- **React 18** with hooks
- **Redux Toolkit** for state management
- **React Router** for navigation
- **TailwindCSS** for styling

### Shared (\`src/shared/\`)
- **types.ts** - TypeScript interfaces shared across processes
- **constants.ts** - IPC channel names and constants

## Usage

### Creating a Database Profile

1. Click **Profiles** in the sidebar
2. Click **Create New Profile**
3. Enter:
   - **Name**: A friendly name for your database
   - **Database Path**: Path to your DuckDB file or \`:memory:\` for in-memory database
   - **Read Only**: Check if you want read-only access
4. Click **Create Profile**

### Browsing Schemas

1. From the Profiles page, click **Schema** on a profile
2. Browse schemas and tables in the tree view
3. Click a table to view its data

### Running Queries

1. From the Profiles page, click **Query** on a profile
2. Enter your SQL query in the editor
3. (Optional) Adjust the **Timeout (ms)** control to increase/decrease how long the query is allowed to run (set to `0` to disable the timeout for a single query)
4. Press **Cmd/Ctrl+Enter** or click **Run Query**
5. If you need to stop a running query, click **Cancel Query**; the editor will display “Query cancelled by user” when the interrupt succeeds
6. View results in the data grid below (large result sets automatically show only the first 1,000 rows and display a truncation warning)

### Example Queries

\`\`\`sql
-- Create a table
CREATE TABLE users (id INTEGER, name VARCHAR, age INTEGER);

-- Insert data
INSERT INTO users VALUES (1, 'Alice', 30), (2, 'Bob', 25);

-- Query data
SELECT * FROM users WHERE age > 25;

-- Use DuckDB's built-in functions
SELECT * FROM read_csv_auto('data.csv');

-- Query Parquet files
SELECT * FROM read_parquet('data.parquet');
\`\`\`

## Project Structure

\`\`\`
orbital_db/
├── src/
│   ├── main/               # Electron main process
│   │   ├── main.ts
│   │   ├── DuckDBService.ts
│   │   ├── ProfileStore.ts
│   │   └── ipcHandlers.ts
│   ├── preload/            # Preload script (IPC bridge)
│   │   └── preload.ts
│   ├── renderer/           # React frontend
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/     # Reusable components
│   │   ├── routes/         # Page components
│   │   ├── state/          # Redux store and slices
│   │   └── styles/         # Global styles
│   └── shared/             # Shared types and constants
├── public/                 # Static assets
├── out/                    # Build output
├── release/                # Packaged applications
├── package.json
├── tsconfig.json
├── electron.vite.config.ts
└── README.md
\`\`\`

## Technologies Used

### Core
- **Electron** 28.x - Desktop application framework
- **React** 18.x - UI framework
- **TypeScript** 5.x - Type-safe JavaScript
- **@duckdb/node-api** 1.4.x - Official DuckDB Node.js API

### Build Tools
- **Vite** - Fast build tool and dev server
- **electron-vite** - Vite for Electron
- **electron-builder** - Application packaging

### State Management & Routing
- **Redux Toolkit** - State management
- **React Router** 6.x - Client-side routing

### Styling
- **TailwindCSS** 3.x - Utility-first CSS framework
- **PostCSS** - CSS processing

### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **@typescript-eslint** - TypeScript linting

## Configuration

### Database Profiles

Profiles are stored in JSON format at:
- **macOS**: \`~/Library/Application Support/orbital-db/profiles.json\`
- **Windows**: \`%APPDATA%/orbital-db/profiles.json\`
- **Linux**: \`~/.config/orbital-db/profiles.json\`

### Settings

Application settings will be stored in \`settings.json\` in the same directory (coming soon).

## Troubleshooting

### DuckDB Module Not Found

If you see an error about missing DuckDB module:

\`\`\`bash
npm run postinstall
\`\`\`

### Permission Denied on Database File

Make sure you have read/write permissions on the database file. You can use the **Read Only** option when creating a profile if you only need read access.

### Native Module Build Errors

Make sure you have the required build tools:
- **macOS**: Xcode Command Line Tools
- **Windows**: Visual Studio Build Tools
- **Linux**: \`build-essential\`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with the official [@duckdb/node-api](https://www.npmjs.com/package/@duckdb/node-api)
- DuckDB logo and branding by [DuckDB Foundation](https://duckdb.org/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check the [DuckDB documentation](https://duckdb.org/docs/)
- Join the [DuckDB Discord](https://discord.duckdb.org/)

---

**Orbital DB** - A modern desktop client for DuckDB
Made with ❤️ and 🦆
