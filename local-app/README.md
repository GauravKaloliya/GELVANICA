# Gnovium Electron

Desktop shell for the Gnovium knowledge operating system. Wraps the Flask API backend in a native macOS/Linux application with a rich vanilla JS SPA renderer.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron Main Process                      │
│  main/index.ts                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ FlaskManager │  │ CrashReporter│  │ ErrorBoundary        │ │
│  │ (Python      │  │ (JSON files  │  │ (IPC proxy to main)  │ │
│  │  subprocess) │  │  in userData │  │                      │ │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘ │
│         │                                                      │
│    port 5001    ┌──────────────────────────────────────────┐   │
│         │       │         Preload (contextBridge)          │   │
│         ▼       │  electron.getApiPort()                   │   │
│  ┌──────────┐   │  electron.getAuthData()                  │   │
│  │ Flask API │   │  electron.isAuthenticated()             │   │
│  │ (backend) │   │  electron.logout()                      │   │
│  └──────────┘   │  electron.selectAvatarFile()             │   │
│                 │  electron.reauthenticate()               │   │
│                 │  electron.getAppVersion()                │   │
│                 │  electronErrorReporter.reportError()      │   │
│                 └──────────────┬───────────────────────────┘   │
│                                │                                │
└────────────────────────────────│────────────────────────────────┘
                                 │ contextBridge
┌────────────────────────────────│────────────────────────────────┐
│                    Renderer Process                             │
│                                                                │
│  loading.html ─── preload/loading.ts ──── progress/complete     │
│       │                            └─── error display           │
│       ▼                                                        │
│  index.html ──── app.js ──── router ──── pages/*.js             │
│                                    └─── components/*.js         │
│                    │                                            │
│              store/state.js                                     │
│              store/pages.js                                     │
│                    │                                            │
│               lib/api.js ──── HTTP ──── Flask (port 5001)       │
│               lib/helpers.js                                    │
│               styles.css                                        │
│               error-handler.js                                  │
└────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
electron/
├── main/
│   └── index.ts              # Main process entry
├── preload/
│   ├── index.ts              # Preload bridge (main API)
│   └── loading.ts            # Loading screen preload
├── src/
│   ├── flask-manager.ts      # Python subprocess lifecycle
│   ├── error-boundary.ts     # Renderer error IPC proxy
│   ├── crash-reporter.ts     # Local crash report writer
│   └── types/
│       └── tree-kill.d.ts    # TypeScript declaration for tree-kill
├── renderer/
│   ├── index.html            # Main app HTML (landing + SPA shell)
│   ├── loading.html          # Loading screen HTML
│   ├── styles.css            # Full CSS (6 themes, all components)
│   ├── gnovium-logo.jpeg     # App logo
│   ├── logo/
│   │   └── founder.jpeg      # Founder photo for profile panel
│   └── js/
│       ├── app.js            # SPA entry point
│       ├── error-handler.js  # Global error handler
│       ├── router/
│       │   └── index.js      # Client-side router
│       ├── store/
│       │   ├── state.js      # Central state (observer pattern)
│       │   └── pages.js      # Pages CRUD store
│       ├── lib/
│       │   ├── api.js        # API client (auto-discovers Flask port)
│       │   └── helpers.js    # DOM utilities, formatting, themes
│       ├── pages/            # 10 page modules
│       │   ├── home.js *     # Dashboard — stats, recent pages, quick-create
│       │   ├── editor.js *   # Block editor — 22 block types, comments
│       │   ├── graph.js *    # Knowledge graph — canvas rendering
│       │   ├── search.js     # Full-text search — results with highlighting
│       │   ├── tags.js       # Tag CRUD — color picker, merge
│       │   ├── entities.js   # Entity browser — filter, sort, search
│       │   ├── health.js     # Health scoring — duplicates, orphans, stale
│       │   ├── settings.js   # App settings — 6 themes, autosave, backup
│       │   ├── trash.js      # Trash — undo toast, restore, permanent delete
│       │   └── shortcuts.js  # Keyboard shortcuts reference
│       └── components/       # 8 shared components
│           ├── sidebar.js *  # Search, page tree, favorites, drag reorder
│           ├── topbar.js *   # Breadcrumbs, autosave, cloud indicator, AI
│           ├── blockEditor.js # Block editor engine (all 22 block types)
│           ├── tabBar.js     # Tab management
│           ├── rightPanel.js # Backlinks, relations, neighbor graph, tags
│           ├── backlinks.js  # Backlink data queries (used by rightPanel)
│           ├── entityDrawer.js # Property editor, relation viewer
│           └── profilePanel.js # Profile view/edit, cloud sync, clear data
├── package.json              # Dependencies & scripts
├── electron-builder.yml      # Build configuration (macOS/Linux/Windows)
├── vite.config.ts            # Vite config (renderer bundling)
├── tsconfig.json             # Base TypeScript config
├── tsconfig.main.json        # Main process TypeScript
├── tsconfig.preload.json     # Preload TypeScript
└── tsconfig.renderer.json    # Renderer TypeScript
```

_* Heavy-weight modules (home, editor, graph, sidebar, topbar) are lazy-loaded by the router with skeleton UI._

## Main Process

### BrowserWindow Setup (`main/index.ts`)

- Creates a frameless `BrowserWindow` with custom titlebar (drag region)
- Loads `loading.html` first during Flask backend startup
- Switches to `index.html` once `/health` returns 200
- Configures session partition, CSP headers, webPreferences (contextIsolation, nodeIntegration: false)

### FlaskManager (`src/flask-manager.ts`)

The FlaskManager is the core bridge between Electron and the Python backend:

| Method | Description |
|---|---|
| `start()` | Spawns `python3 run.py` (or `python`), waits for health check |
| `stop()` | Kills the subprocess tree (via `tree-kill`), timeout 5s |
| `restart()` | Stop + start cycle |
| `getApiPort()` | Returns the Flask port (default 5001) |

| `healthCheck()` | Polls `http://localhost:5001/health` |
Key behaviors:
- Auto-detects `python3` vs `python` on the system PATH
- Startup timeout: 30 seconds (emits error if Flask doesn't respond)
- Health polling interval: 500ms during startup, 10s after successful connection
- Emits events: `process-started`, `healthy`, `unhealthy`, `process-exited`
- Stores PID and kills process tree on exit

### Deep Linking (`main/index.ts`)

- Registers `gnovium://` protocol handler on macOS
- Parses deep link URLs (`gnovium://page/<id>`, `gnovium://search?q=...`)
- Navigates the renderer accordingly
- On Windows/Linux, handles second-instance IPC for protocol forwarding

### Auto-updater (`main/index.ts`)

- Configured for future GitHub Releases integration
- Checks on app start and periodically
- Downloads updates in background, prompts user to install

### IPC Handlers (`main/index.ts`)

IPC channels handled by the main process:

| Channel Name | Direction | Handler in Code | Purpose |
|---|---|---|---|
| `getApiPort` | Renderer → Main | `ipcMain.handle` | Get Flask backend port |
| `getAppVersion` | Renderer → Main | `ipcMain.handle` | Get app version |
| `isLocalMode` | Renderer → Main | `ipcMain.handle` | Whether running in local mode |
| `isFlaskReady` | Renderer → Main | `ipcMain.handle` | Whether Flask is healthy |
| `getAuthData` | Renderer → Main | `ipcMain.handle` | Retrieve stored auth tokens + user |
| `isAuthenticated` | Renderer → Main | `ipcMain.handle` | Check if auth data exists |
| `logout` | Renderer → Main | `ipcMain.handle` | Clear stored auth |
| `getProfileData` | Renderer → Main | `ipcMain.handle` | Get local profile overrides |
| `saveProfile` | Renderer → Main | `ipcMain.handle` | Persist profile name/avatar |
| `selectAvatarFile` | Renderer → Main | `ipcMain.handle` | Open file dialog for avatar image |
| `copyToAvatarDir` | Renderer → Main | `ipcMain.handle` | Copy selected file to avatars dir |
| `reauthenticate` | Renderer → Main | `ipcMain.handle` | Open auth window for re-auth |
| `getCloudApiUrl` | Renderer → Main | `ipcMain.handle` | Get cloud API base URL |
| `selectImageFile` | Renderer → Main | `ipcMain.handle` | Open file dialog for any image |
| `copyFileToDir` | Renderer → Main | `ipcMain.handle` | Copy file to a userData subdirectory |
| `renderer-error` | Renderer → Main | `ipcMain.on` | Log renderer errors |
| `renderer-unhandled-rejection` | Renderer → Main | `ipcMain.on` | Log unhandled promise rejections |
| `loading-progress` | Main → Renderer | `webContents.send` | Update loading screen progress |
| `loading-complete` | Main → Renderer | `webContents.send` | Signal loading complete |
| `loading-error` | Main → Renderer | `webContents.send` | Signal loading error |

## Preload Bridge

### `preload/index.ts`

Exposes two objects via `contextBridge.exposeInMainWorld`:

**`window.electron`** — Main API surface:
| Method | Returns | Description |
|--------|---------|-------------|
| `getApiPort()` | `Promise<number>` | Get Flask backend port |
| `getAppVersion()` | `Promise<string>` | Get app version string |
| `isLocalMode()` | `Promise<boolean>` | Whether running in local mode |
| `isFlaskReady()` | `Promise<boolean>` | Whether Flask backend is healthy |
| `getAuthData()` | `Promise<ElectronAuthData \| null>` | Get stored auth tokens + user |
| `isAuthenticated()` | `Promise<boolean>` | Whether auth data exists |
| `logout()` | `Promise<void>` | Clear stored auth |
| `getProfileData()` | `Promise<ProfileData \| null>` | Get local profile overrides |
| `saveProfile(data)` | `Promise<ProfileData>` | Save profile name/avatar path |
| `selectAvatarFile()` | `Promise<string \| null>` | Open file dialog for avatar image |
| `copyToAvatarDir(sourcePath)` | `Promise<string>` | Copy file to userData/avatars/ |
| `reauthenticate()` | `Promise<ElectronAuthData \| null>` | Open auth window for re-auth |
| `getCloudApiUrl()` | `Promise<string>` | Get cloud API base URL |
| `selectImageFile()` | `Promise<string \| null>` | Open file dialog for any image |
| `copyFileToDir(sourcePath, dirName)` | `Promise<string>` | Copy file to a userData subdirectory |

**`window.electronErrorReporter`** — Error reporting:
- `reportError(error: { message, stack?, source?, lineno?, colno? })` → `void`
- `reportUnhandledRejection(error: { message, stack? })` → `void`

### `preload/loading.ts`

Used exclusively for the loading screen page. Exposes via `contextBridge.exposeInMainWorld`:

**`window.electronLoading`**:
- `onProgress(callback: (percent: number, status: string) => void)` — Listen for progress updates from FlaskManager startup
- `onComplete(callback: () => void)` — Listen for completion signal
- `onError(callback: (message: string) => void)` — Listen for startup errors

## Renderer SPA

### Entry Point (`app.js`)

Initialization sequence:
1. Create central store (`state.js`)
2. Create pages store (`pages.js`)
3. Initialize router (`router/index.js`)
4. Mount sidebar, topbar, tabBar components
5. Set up keyboard shortcuts (global)
6. Set up autosave interval
7. Set up drag-drop file handling
8. Start connection status polling
9. Handle window resize for responsive layout

### Router (`router/index.js`)

| Feature | Implementation |
|---------|---------------|
| Route mapping | Hash-based (`#home`, `#editor`, `#graph`, `#search`, `#tags`, `#entities`, `#health`, `#settings`, `#trash`, `#shortcuts`) |
| Lazy loading | Heavy pages load on first navigation, cached thereafter |
| Skeleton UI | Shows skeleton placeholders during page load |
| Reveal animation | Content fades in with staggered transitions |
| Breadcrumb update | Syncs breadcrumb trail in topbar |
| Nav active state | Highlights current page in sidebar |
| Cleanup | Calls `page.unmount()` on navigation away |

### State Management

**`store/state.js` — Central State (Observer Pattern)**:

| State | Type | Description |
|---|---|---|
| `pages` | Array | All loaded pages |
| `currentPage` | Object | Currently active page |
| `tags` | Array | All tags |
| `entities` | Array | All entities |
| `theme` | String | Current theme name |
| `searchQuery` | String | Current search query |
| `searchResults` | Array | Current search results |
| `entityFilter` | Object | Entity browser filter state |
| `settings` | Object | App settings |
| `autosaveEnabled` | Boolean | Whether autosave is on |
| `autosaveInterval` | Number | Autosave interval in ms |
| `backupEnabled` | Boolean | Whether backup is on |

Actions: `addTag`, `updateTag`, `deleteTag`, `addEntity`, `updateEntity`, `subscribe`, `notify`

**`store/pages.js` — Pages CRUD**:

| Method | Description |
|---|---|
| `loadPages()` | Fetch all pages from API |
| `createPage(page)` | Create new page via API |
| `findPage(id)` | Find page by ID (cached or fetch) |
| `updatePage(id, data)` | Update page via API |
| `deletePage(id)` | Soft-delete (archive) page |
| `getDescendants(id)` | Get all child pages |
| `archivePage(id)` | Move page to trash |
| `restorePage(id)` | Restore from trash |
| `getTrash()` | List trashed pages |
| `permanentDelete(id)` | Permanently delete |

### API Client (`lib/api.js`)

Auto-discovers Flask port via `window.electron.getApiPort()`, then wraps `fetch` with:

- JSON serialization (Content-Type: application/json)
- Error handling (non-2xx → thrown with status + body)
- Base URL prefixing
- Exported function groups (mapped to backend endpoints):

| Category | Functions |
|----------|-----------|
| Workspaces | `listWorkspaces`, `createWorkspace`, `getWorkspace`, `getWorkspaceStats`, `updateWorkspace`, `deleteWorkspace` |
| Entities | `listEntities`, `createEntity`, `getEntity`, `getEntityChildren`, `createEntityChild`, `updateEntity`, `deleteEntity`, `archiveEntity`, `restoreEntity`, `getTrashedEntities`, `duplicateEntity`, `getEntityVersions` |
| Entity Types | `listEntityTypes`, `createEntityType` |
| Entity Properties | `listEntityProperties`, `createEntityProperty` |
| Blocks | `listBlocks`, `getEntityBlocks`, `createBlock`, `getBlock`, `updateBlock`, `moveBlock`, `reorderBlocks`, `deleteBlock`, `saveAllBlocks` |
| Tags | `listTags`, `createTag`, `getTag`, `updateTag`, `deleteTag`, `tagEntity`, `untagEntity` |
| Relations | `listRelations`, `createRelation`, `getRelation`, `deleteRelation`, `getEntityRelations`, `getEntityBacklinks`, `getNeighbors`, `findRelationPath` |
| Graph | `getGraph`, `materializeGraph`, `queryGraph`, `traverseGraph`, `findPaths` |
| Search | `search` |
| AI | `aiQuery` |
| Health | `getHealthScore`, `recalculateHealth`, `getDuplicates`, `getOrphans`, `getStale` |
| Activity | `getActivity` |
| Dashboard | `getDashboardOverview` |
| Branches | `listBranches`, `createBranch`, `getBranch`, `deleteBranch`, `mergeBranch`, `mergeBranches` |
| Backup | `exportBackup`, `exportBackupToDisk`, `importBackup` |
| Comments | `listComments`, `createComment`, `getComment`, `updateComment`, `deleteComment` |
| Notifications | `listNotifications`, `createNotification` |
| Data | `clearAllData`, `healthCheck`, `makeId`, `nowISO` |

### Helper Utilities (`lib/helpers.js`)

| Function | Purpose |
|---|---|
| `$id(id)` | `document.getElementById` shorthand |
| `$el(selector)` | `document.querySelector` shorthand |
| `$all(selector)` | `document.querySelectorAll` shorthand |
| `delegate(parent, selector, event, handler)` | Event delegation |
| `escHtml(str)` | Escape HTML entities |
| `formatDate(date)` | Format date for display |
| `applyTheme(theme)` | Apply theme CSS class to `<html>` |
| `getSnippet(text, query)` | Get text snippet around match |
| `highlightText(text, query)` | Highlight matches in text (wraps in `<mark>`) |
| `makeInitialsAvatar(name)` | Generate initials avatar SVG |

### Themes

6 themes managed via CSS custom properties on `<html>` class:

| Theme | Class | Description |
|---|---|---|
| Light | (default) | Clean white background, dark text |
| Dark | `.dark` | Dark background, light text |
| Sepia | `.sepia` | Warm paper-toned background |
| High Contrast | `.high-contrast` | Maximum contrast, accessibility |
| Ocean | `.ocean` | Blue-tinted dark theme |
| Midnight | `.midnight` | Deep dark purple-gray theme |

### 10 Page Modules

| Page | Route | Key Features |
|---|---|---|
| **Home** | `#home` | Dashboard — total pages, tags, entities, blocks, health score; recent pages list; quick-create page button |
| **Editor** | `#editor?id=<id>` | Full block editor — 22 block types (h1-h6, text, quote, divider, checkbox, toggle, code, callout, image, file, table, columns), inline formatting, slash commands, drag-drop reorder, block comments, autosave |
| **Graph** | `#graph` | Interactive knowledge graph — canvas rendering, zoom/pan, node selection, materialize, traverse, pathfinding; entity type filtering |
| **Search** | `#search?q=<query>` | Full-text search across pages and tags — result cards with highlighted matches, snippet preview, mode selector (keyword/full-text/hybrid/semantic) |
| **Tags** | `#tags` | Tag management — create/edit/delete, color picker, usage count, merge duplicates |
| **Entities** | `#entities` | Entity browser — grid/list view, filter by type, sort by name/created/updated, search |
| **Health** | `#health` | Health scoring — overall score, duplicate count, orphan count, stale count, recalculate button |
| **Settings** | `#settings` | App settings — theme selector (6), autosave toggle + interval, backup toggle, encryption toggle, export all (JSON/CSV), import, clear all data |
| **Trash** | `#trash` | Deleted pages — undo toast on delete, restore from trash, permanent delete |
| **Shortcuts** | `#shortcuts` | Keyboard shortcuts reference table |

### 8 Components

| Component | Location | Key Features |
|---|---|---|
| **Sidebar** | Left | Search bar, page tree (nested hierarchy), favorites, drag-and-drop reorder, context menus (new page, rename, delete, archive), collapsible sections, resize handle |
| **Topbar** | Top | Breadcrumb trail, autosave indicator (saved/saving/unsaved), cloud connection status, AI assistant panel toggle, profile button |
| **BlockEditor** | Editor | 22 block types (h1-h6, text, divider, quote, checkbox, toggle, code block, callout, image, file, table, columns), slash command menu, inline toolbar (bold, italic, code, link), drag handle for reorder, block-level comments, drag-drop image/file import, autosave |
| **TabBar** | Below topbar | Tab management — open tabs per page, close tab, active tab indicator |
| **RightPanel** | Right | Backlinks (incoming references with snippet), outgoing links, relation viewer, neighbor graph preview, tag assignment |
| **Backlinks** | (module) | Backlink query logic — searches page content for `[[id]]` / `[[title]]` references, returns linking pages with snippets |
| **EntityDrawer** | Modal/Slide-out | Entity property editor (key-value pairs with type: text, number, date, URL, select), relation viewer (add/remove relations), entity type icon |
| **ProfilePanel** | Slide-out | View/edit profile (avatar, name, email), cloud sync status, sync now button, clear local data button |

### Error Handling

**`error-handler.js`**: Global window error handler — captures `window.onerror` and `window.onunhandledrejection`, formats error info, sends to `electronErrorReporter.reportError()` / `reportUnhandledRejection()`.

**`error-boundary.ts`**: Main process listener for renderer errors. Logs to console and could be extended to show in-app error boundary UI.

### Crash Reporter (`src/crash-reporter.ts`)

Listens for Node.js `uncaughtException` and `unhandledRejection` in the main process. Writes crash reports as JSON files to `userData/crashes/`:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "type": "uncaughtException",
  "message": "Error message",
  "stack": "...",
  "version": "0.1.0"
}
```

## Build Pipeline

### Development

```
npm run dev
```

1. `tsc -p tsconfig.main.json` — Compile main process (TypeScript → `dist/main/`)
2. `tsc -p tsconfig.preload.json` — Compile preload (TypeScript → `dist/preload/`)
3. `vite` — Start Vite dev server on port 5173 (HMR for renderer)
4. `electron .` — Launch Electron, loading from Vite dev server

### Production Build

```
npm run build
```

1. `vite build` — Bundle renderer (Vite, output to `dist/renderer/`)
2. Copy `loading.html` and logo to `dist/renderer/`
3. `tsc -p tsconfig.main.json` — Compile main process
4. `tsc -p tsconfig.preload.json` — Compile preload

### Packaging

```
npm run package
```

Runs `npm run build` then `electron-builder` with `electron-builder.yml`:

| Platform | Target | Arch |
|----------|--------|------|
| macOS | DMG | Universal (x64 + arm64) |
| macOS | ZIP | arm64 |
| Linux | AppImage | x64 |
| Linux | DEB | x64 |
| Windows | NSIS installer | x64 |

Flask backend is bundled as `extraResources` from `../backend/dist/flask_app` (expects PyInstaller output).

### Type Checking

```
npm run typecheck
```

Runs `tsc --noEmit` for all three TypeScript configs:
- `tsconfig.main.json` — Main process
- `tsconfig.preload.json` — Preload bridges
- `tsconfig.renderer.json` — Renderer (type stubs for Electron APIs)

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron 34 |
| UI renderer | Vanilla JavaScript (no framework) |
| CSS | Custom properties (6 themes), CSS Grid, Flexbox |
| Bundler | Vite 6 |
| Backend process | Python Flask (spawned as subprocess) |
| IPC | contextBridge (secure) |
| Packaging | electron-builder 26 |
| Build | TypeScript 5.7 (main + preload) |
| Process management | tree-kill |

## Window Management

- Frameless window with custom drag region
- Default size: 1200×800 (minimum: 900×600)
- Window state persisted between sessions (position, size, maximized)
- Tray icon with context menu (show, hide, quit)
- Single-instance lock (prevents multiple app windows)
- Global shortcuts registered via `globalShortcut` module
- Auto-hide menu bar (Alt to reveal)

## Security

- `contextIsolation: true` — Renderer cannot access Node.js APIs directly
- `nodeIntegration: false` — No `require()` in renderer
- CSP headers set in HTML meta tags:
  - `default-src 'self'`
  - `img-src 'self' data: https: file:`
  - `script-src 'self' 'unsafe-inline'`
  - `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
  - `connect-src 'self' file: http://localhost:* https://api.gnovium.com`
- Auth tokens stored in OS keychain via `safeStorage`
- All file dialogs go through main process (not available in renderer)
- Cloud API requests proxied through main process (not directly from renderer)
- Deep link URLs validated against allowed patterns

## Loading Sequence

```
1. User launches app
2. Main process starts
3. loading.html displayed immediately
4. FlaskManager.start() called:
   a. Detect python3/python on PATH
   b. Spawn `python3 run.py` (or `python run.py`)
    c. Poll http://localhost:5001/health every 500ms
   d. Send progress updates via IPC to loading screen
5. Health check succeeds → send loading-complete
6. Main window loads index.html
7. app.js initializes:
   a. Create stores
   b. Init router
   c. Mount components
   d. First page rendered
8. App is ready
```

If Flask fails to start within 30 seconds, the loading screen shows an error message with a retry prompt.

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | Build main + preload, start Vite, launch Electron | Development with HMR |
| `start` | `electron .` | Run pre-built app |
| `build` | Build renderer + main + preload | Production build |
| `typecheck` | TypeScript check all configs | Type validation |
| `package` | Build + package for distribution | Creates DMG/AppImage/NSIS |
| `clean` | Remove `dist/` and `out/` directories | Reset build artifacts |
