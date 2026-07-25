# Gnovium V1 — Local Electron App Complete Feature & Architecture Specification

This document defines the **full local Electron desktop application** for Gnovium V1, built as a **local-first, offline-capable** knowledge operating system with seamless global authentication via `gnovium.com`.

### Cloud Boundary
- **Cloud-only modules** (NOT in this spec): Auth (8 endpoints), Jobs (4 endpoints), Files presign
- **Optional cloud features**: Personal sync (12 endpoints) — marked with `[requires cloud account]`
- **Cloud dependency**: Authentication via `gnovium.com` — marked with `[cloud dependency]`
- **All other functionality**: Fully local, offline-capable

---

## 1. Core Philosophy & User Experience

- **Local-First by Default**: All data stored in SQLite (`local.db`). Full offline operation.
- **Global Auth**: Uses cloud (`gnovium.com`) for identity. Local app verifies JWT with shared secret. `[cloud dependency]`
- **Zero Migration**: Same data model/API as cloud. Personal cloud sync across devices (optional). `[cloud dependency — sync only]`
- **Bundled AI**: Qwen2.5-3B-Instruct (Q4_K_M GGUF) + BGE-M3 embedding model.
- **Modern, Notion-like UI** with block editor, graph, versioning, AI sidebar.

### Single-User Architecture
- **Offline-first**: All data local by default. Cloud is optional, for personal backup and multi-device sync.
- **Single-user**: No workspace members, invites, roles, permissions, shared workspaces, or team features.
- **Personal cloud sync** (optional): The cloud stores one user's workspace and syncs it across that user's devices. No other user ever accesses the workspace. `[requires cloud account]`
- **No real-time editing, presence indicators, or multi-user conflict resolution.** In local-only mode, no sync occurs. When cloud sync is enabled, conflict resolution is between local and cloud versions of the same user's data.

---

## 2. Authentication Flow — Centralized Architecture

The local Electron app has **no local login or register pages**. Authentication is handled exclusively through `gnovium.com/auth` (cloud web).

### Auth Flow

1. **App Launch** → Flask backend starts → main process loads tokens from `<userData>/auth.json` (encrypted via `safeStorage`) → validates with cloud via `GET /auth/me`.
2. **No Session / Expired** → Main process opens a `BrowserWindow` to `gnovium.com/auth?source=desktop`.
3. **User Signs In or Signs Up** on the cloud web unified auth page (email/password, or Google OAuth).
4. **Cloud web** authenticates against cloud API, creates/verifies session in cloud PostgreSQL `sessions` table.
5. **Cloud web generates one-time code** via `POST /auth/exchange-code` (5-minute expiry, single use).
6. **Cloud web redirects** to `gnovium-auth://callback?code=xxx` (custom protocol).
7. **Electron protocol handler** catches the code, sends it to the main process via IPC.
8. **Main process exchanges code** for tokens via `POST /auth/exchange` on local Flask.
9. **Local Flask forwards code** to cloud backend for validation.
10. **Cloud backend validates code** (5-min expiry, single use), returns tokens + user data.
11. **Main process stores tokens** encrypted in `<userData>/auth.json` via `safeStorage`.
12. **Tokens NEVER leave main process** — renderer gets tokens via IPC only.
13. **No localStorage token storage** — all token operations go through IPC to main process.
14. **Google OAuth flow**: Handled entirely by `gnovium.com`. If no account exists, auto-creates from Google profile (name, email, avatar, google_id). `[cloud-only endpoint]`
15. **Profile** shown in sidebar with avatar, name, email. Avatar auto-generated via DiceBear identicon on registration; updatable via `PATCH /auth/me` `[cloud-only]` when online.

### Token Storage

- **Encrypted file**: `<userData>/auth.json` (OS-level encryption via `safeStorage`)
  - macOS: Keychain
  - Windows: DPAPI
  - Linux: libsecret
- **In-memory cache** in `AuthService` (main process only)
- **Renderer never holds raw tokens** — asks main process via IPC

### Session Management

- **30-minute inactivity timeout** (renderer-side)
- **Automatic token refresh** before expiry (main process timer)
- **On startup**: load from encrypted file, validate with cloud, refresh if needed

### Profile Edit

- **Online only** — `PATCH /auth/me` via local Flask → cloud API
- **Profile image upload** to S3 with rollback on failure
- **Offline users** see "must be online to edit profile"

### IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| `auth:open-webview` | renderer → main | Opens cloud auth page in BrowserWindow |
| `auth:exchange-code` | renderer → main | Exchanges one-time code for tokens |
| `auth:get-profile` | renderer → main | Returns user profile from main process |
| `auth:get-tokens` | renderer → main | Returns access_token from main process (refresh_token never exposed to renderer) |
| `auth:logout` | renderer → main | Clears tokens and notifies server |
| `auth:update-profile` | renderer → main | Updates profile via cloud API |
| `auth:is-online` | renderer → main | Checks if local Flask is running |
| `auth:status-changed` | main → renderer | Auth state changed notification |
| `auth:code-received` | main → renderer | One-time code received from protocol handler |

### Endpoints Used

- Cloud (via local Flask proxy): `/auth/exchange`, `/auth/me` (GET + PATCH), `/auth/logout`
- Cloud (direct from cloud web): `/auth/exchange-code`, `/auth/check-email`, `/auth/google`
- Local API calls: All other endpoints with `Authorization: Bearer <token>` (tokens obtained via IPC from main process)

---

## 3. Complete Feature List

### Workspace & Editing
- Block-based editor (14 block types)
- Rich text, inline formatting, nesting
- Drag & drop reordering, batch reorder
- Block move between entities
- Threaded comments on entities & blocks
- Soft delete + restore
- Archive with `archived_at` timestamp

### Knowledge Management
- Custom entity types + properties
- Typed relations (`refers_to`, `depends_on`, `part_of`, `related_to`, `implements`, `extends`)
- AI-powered relation suggestions on save (pending — requires inference runtime)
- Tags with colors
- Automatic backlinks
- Custom properties (text, number, select, multi_select, date, checkbox, url, email, phone, rich_text)

### Visualization
- Interactive knowledge graph (nodes + edges, zoom, pan, filter, node selection)
- Graph queries, traversal (BFS depth ≤ 5), shortest paths

### Versioning (Git-Inspired)
- Page history (append-only in local mode)
- Workspace snapshots
- Branches + merge with local conflict resolution (between branches; personal sync versions optional)
- Visual diffs (block/entity/snapshot/branch level)

### AI Capabilities (Local Inference)
- Workspace-wide hybrid/semantic search
- Natural language Q&A grounded in workspace
- Summarization
- Related entity recommendations (via `/ai/suggest-relations`)
- AI relation extraction
- AI governance (health score, duplicates, orphans, stale content)

### Governance & Admin
- Dashboard overview + stats
- Activity log
- Health score & reports

### File Management
- Upload, download, metadata
- Link files to entities/blocks
- Local filesystem storage + hash-based deduplication

### Personal Cloud Sync (Optional — requires cloud account)
- **Personal cloud sync** — the cloud stores one user's workspace and syncs across their devices (not required for local-only use)
- Backup / Export / Import workspace as JSON
- Background jobs (local Electron worker processes — NOT the cloud `/jobs/*` API)

```
Laptop
   │
   ▼
Cloud Account (single user)
   │
   ├── Desktop
   └── Future Mobile App
```

### Other
- Notifications (local)
- Multi-branch context switching
- Search (keyword + semantic + hybrid)
- Dark/light mode, customizable themes
- Keyboard shortcuts

---

## 4. App Structure & File Organization

```
gnovium-electron/
├── src/
│   ├── main/                          # Electron Main Process
│   │   ├── index.ts                   # Entry point
│   │   ├── window-manager.ts          # Window creation, state persistence
│   │   ├── protocol-handler.ts        # gnovium-auth://callback
│   │   ├── auth-service.ts            # Token storage / refresh
│   │   ├── ipc-handlers.ts            # All IPC channels
│   │   ├── local-server.ts            # Spawn Flask backend
│   │   ├── menu.ts                    # Native menus
│   │   ├── auto-updater.ts            # electron-updater
│   │   ├── crash-reporter.ts          # Error reporting
│   │   ├── tray.ts                    # System tray
│   │   └── power-monitor.ts           # Suspend/resume
│   │
│   ├── renderer/                      # React + Vite
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── router.tsx                 # React Router v7
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                    # shadcn/ui (Button, Modal, etc.)
│   │   │   ├── editor/
│   │   │   │   ├── BlockEditor.tsx
│   │   │   │   ├── Block.tsx
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   └── plugins/
│   │   │   ├── graph/
│   │   │   │   ├── KnowledgeGraph.tsx
│   │   │   │   └── GraphControls.tsx
│   │   │   ├── sidebar/
│   │   │   ├── modals/
│   │   │   └── common/
│   │   │
│   │   ├── pages/
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── WorkspacePicker.tsx
│   │   │   ├── workspace/
│   │   │   │   ├── WorkspaceLayout.tsx
│   │   │   │   ├── EntityPage.tsx
│   │   │   │   └── Dashboard.tsx
│   │   │   ├── GraphView.tsx
│   │   │   ├── SearchPage.tsx
│   │   │   ├── AIAssistant.tsx
│   │   │   ├── BranchesPage.tsx
│   │   │   ├── VersionHistory.tsx
│   │   │   ├── DiffViewer.tsx
│   │   │   ├── SnapshotsPage.tsx
│   │   │   ├── ActivityLog.tsx
│   │   │   ├── NotificationsCenter.tsx
│   │   │   ├── FileManager.tsx
│   │   │   ├── GovernancePage.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── BackupRestore.tsx
│   │   │   ├── SyncStatus.tsx
│   │   │   ├── ShortcutsReference.tsx
│   │   │   ├── AboutDiagnostics.tsx
│   │   │   └── ErrorRecovery.tsx
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts                 # Axios instance + interceptors
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   │
│   │   ├── hooks/
│   │   ├── store/                     # Zustand / Jotai
│   │   ├── styles/
│   │   │   ├── globals.css
│   │   │   └── themes/
│   │   │
│   │   └── assets/
│   │
│   ├── preload/                       # Context Bridge
│   │   └── index.ts
│   │
│   ├── workers/                       # Background utility processes
│   │   ├── sync-worker.ts `[cloud dependency — only active when sync enabled]`
│   │   ├── embedding-worker.ts
│   │   ├── graph-worker.ts
│   │   ├── backup-worker.ts
│   │   ├── cleanup-worker.ts
│   │   └── notification-worker.ts
│   │
│   └── public/
│
├── electron.vite.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 5. Complete Page / Screen List

| # | Screen | Description |
|---|--------|-------------|
| 1 | Splash Screen | Logo + loading state during startup |
| 2 | Auth / Login | No local login page — Electron opens `gnovium.com/auth?source=desktop` in a BrowserWindow. After successful auth, receives a one-time code via custom protocol (`gnovium-auth://`). `[cloud dependency]` |
| 3 | Workspace Picker | Select or create a workspace |
| 4 | Dashboard | Overview stats, recent activity |
| 5 | Entity Editor | Main block editor page |
| 6 | Full Graph View | Interactive knowledge graph |
| 7 | Global Search | Hybrid/semantic search across workspace |
| 8 | AI Assistant Chat | Conversational AI sidebar |
| 9 | Branches Manager | Git-inspired branch CRUD + switch |
| 10 | Version History | Entity/workspace version timeline |
| 11 | Diff Viewer | Visual diff at block/entity/snapshot level |
| 12 | Snapshots Manager | Workspace snapshot CRUD |
| 13 | Activity Log | Audit trail |
| 14 | Notifications Center | Toast + persisted notifications |
| 15 | File Manager | Browse, upload, delete files |
| 16 | Settings (multi-tab) | 10 categories of preferences |
| 17 | Backup & Restore | Export/import workspaces |
| 18 | Sync Status | Personal sync progress across devices `[requires cloud account]` |
| 19 | Governance Dashboard | Health, duplicates, orphans, stale |
| 20 | Keyboard Shortcuts | Reference sheet |
| 21 | About / Diagnostics | App version, logs, export |
| 22 | Error / Recovery | Graceful error screens |

---

## 6. Tech Stack

| Layer | Technology |
|-------|-----------|
| Build Tool | Vite (`electron-vite`) |
| Frontend | React 19 + TypeScript 5 |
| Routing | React Router v7 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Icons | lucide-react |
| Animations | framer-motion |
| State Management | Zustand (preferred) or Jotai |
| Data Fetching | TanStack Query |
| Editor | Tiptap (ProseMirror) or BlockNote |
| Graph Visualization | React Flow |
| Main Process | Electron 32+ |
| IPC | Secure context bridge (preload) |
| Backend | Flask 3.0.3 (Python) via `localhost:5001` |
| Database | SQLite + sqlite-vec (vector search) |
| AI Runtime | llama.cpp (Qwen2.5-3B + BGE-M3) |

---

## 7. Tech Stack Comparison (All Apps)

| Layer | **docs** | **cloud-web** | **landing** | **local-app (Electron)** | **backend** |
|---|---|---|---|---|---|
| **Language** | TypeScript 5 | TypeScript 5 | TypeScript 5 | TypeScript 5 + Python | Python 3 |
| **Framework** | Next.js 16.2.9 | Next.js 16.2.9 | Next.js 16.2.9 | Electron 32 + Vite | Flask 3.0.3 |
| **UI** | React 19.2.4 | React 19.2.4 | React 19.2.4 | React 19.2.4 | — |
| **Styling** | Tailwind v4 | Tailwind v4 | Tailwind v4 | Tailwind v4 | — |
| **Components** | — | — | — | shadcn/ui | — |
| **Animation** | framer-motion 12 | framer-motion 12 | framer-motion 12 | framer-motion 12 | — |
| **Icons** | lucide-react | lucide-react | lucide-react | lucide-react | — |
| **Routing** | Next.js App Router | Next.js App Router | Next.js App Router | React Router v7 | Flask blueprints |
| **Data Fetching** | Build-time | — | — | TanStack Query | — |
| **State** | — | — | — | Zustand / Jotai | — |
| **Editor** | — | — | — | Tiptap / BlockNote | — |
| **Graph** | — | — | — | React Flow | — |
| **Auth** | — | JWT | — | JWT (safeStorage) | Flask-JWT-Extended |
| **DB/ORM** | — | — | — | SQLite + sqlite-vec | SQLAlchemy 2.0 |
| **AI** | — | — | — | Qwen2.5-3B + BGE-M3 | — |
| **Build** | Static export | Server build | Server build | electron-vite | pip / setuptools |
| **Testing** | ESLint | ESLint | ESLint | ESLint + Vitest | pytest |
| **Shared** | `@gnovium/shared` | `@gnovium/shared` | `@gnovium/shared` | `@gnovium/shared` | — |

---

## 8. Key Pages & Functionalities

### 8.1 Onboarding / Auth Screen
- Splash with logo
- No local login or register pages — authentication is handled exclusively through `gnovium.com/auth` (cloud web)
- "Sign in with Gnovium" button → opens `gnovium.com/auth?source=desktop` in a BrowserWindow
- After successful auth, cloud web redirects to `gnovium-auth://callback?code=xxx` (custom protocol)
- Electron protocol handler catches the one-time code, exchanges it for tokens via main process
- Profile display after login (tokens never leave main process — renderer gets profile via IPC)

### 8.2 Main Workspace Layout
- **Left Sidebar**: Workspaces list, Entity tree, Quick search
- **Main Area**: Block editor or Graph view (toggleable)
- **Right Sidebar**: Properties, Backlinks, Comments, AI Assistant, Graph mini-map
- **Top Bar**: Title, version/branch indicator, AI toggle, user avatar

### 8.3 Entity Page (Block Editor)
- Canvas with draggable blocks
- Slash commands (`/todo`, `/image`, etc.)
- Inline @mentions, page links
- Real-time AI suggestions (relation extraction)

### 8.4 Graph View
- Full-screen interactive graph
- Node click → open entity
- Relation filtering
- Layout algorithms (force-directed)

### 8.5 Search & AI
- Global search bar (hybrid + semantic)
- AI chat sidebar with workspace context

### 8.6 Versioning UI
- History timeline
- Snapshot list
- Branch switcher + merge UI with diff viewer

### 8.7 Governance Dashboard
- Health score card
- Duplicates / Orphans / Stale lists

### 8.8 Settings
- Sync status (requires cloud account)
- AI model settings
- Theme, shortcuts
- Backup controls

---

## 9. Electron Main Process Architecture

**Responsibilities**:
- Single instance lock (prevent multiple app instances)
- Deep link registration (`gnovium://`)
- Crash recovery & error reporting
- Auto updater (`electron-updater`)
- Window creation, management & persistence (position, size, state)
- App lifecycle management (ready, quit, activate)
- Tray icon support (optional, with quick actions)
- Power events handling (suspend, resume)
- OS integration (native menus, file associations, protocol handler)
- Spawn and manage local Flask backend
- Global keyboard shortcuts
- Logging & diagnostics

---

## 10. Preload API (Secure Context Bridge)

```ts
// Exposed as window.gnovium
interface GnoviumAPI {
  auth: {
    openWebview: () => Promise<void>;
    exchangeCode: (code: string) => Promise<{ tokens: Tokens; user: User }>;
    getProfile: () => Promise<User>;
    getTokens: () => Promise<{ access_token: string }>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<User>) => Promise<User>;
    isOnline: () => Promise<boolean>;
    onStatusChanged: (callback: (status: AuthStatus) => void) => void;
    onCodeReceived: (callback: (code: string) => void) => void;
  };
  filesystem: {
    readFile: (path: string) => Promise<Buffer>;
    writeFile: (path: string, data: Buffer) => Promise<void>;
    listDir: (path: string) => Promise<FileInfo[]>;
  };
  dialog: {
    showOpenDialog: (options: OpenDialogOptions) => Promise<string[]>;
    showSaveDialog: (options: SaveDialogOptions) => Promise<string>;
  };
  clipboard: {
    writeText: (text: string) => void;
    readText: () => string;
  };
  notifications: {
    show: (title: string, body: string, action?: string) => void;
  };
  ipc: {
    send: (channel: string, ...args: any[]) => void;
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, listener: (...args: any[]) => void) => void;
  };
  sync: { // Only active when cloud sync is enabled
    getStatus: () => Promise<SyncStatus>;
    triggerSync: () => Promise<void>;
  };
  settings: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    getAll: () => Promise<Record<string, any>>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    setTitle: (title: string) => void;
  };
  version: {
    app: string;
    electron: string;
    chrome: string;
  };
}
```

---

## 11. IPC Design

**Namespaces** (70+ channels):
- `auth:*` — open-webview, exchange-code, get-profile, get-tokens, logout, update-profile, is-online, status-changed, code-received
- `window:*` — minimize, maximize, close, set-title
- `dialog:*` — open-file, save-file
- `filesystem:*` — read, write, list, delete
- `backup:*` — export, import, list
- `settings:*` — get, set, get-all, reset
- `notifications:*` — show, dismiss, list
- `graph:*` — query, materialize, traverse, paths
- `search:*` — keyword, semantic, hybrid
- `ai:*` — query, suggest-relations, summarize
- `sync:*` — status, trigger `[requires cloud account]`
- `editor:*` — block-create, block-update, block-move, reorder
- `versioning:*` — history, snapshot, branch, diff, merge, resolve-conflict
- `governance:*` — health, duplicates, orphans, stale

All IPC goes through the preload bridge with allowlist validation.

---

## 12. State / Data Flow Architecture

**Main Data Flow**:
```
React UI
   ↓ (TanStack Query)
API Layer (Axios)
   ↓ (only when needed)
IPC Bridge (preload)
   ↓
Local Flask API
   ↓
SQLite + sqlite-vec
```

**AI Flow**:
```
AI Sidebar / Query
   ↓
TanStack Query → /ai/query
   ↓
Agent Runtime (Supervisor + Tools)
   ↓
Local LLM (Qwen2.5-3B) + Embeddings (BGE-M3)
   ↓
Response Streaming
```

---

## 13. Application Startup Sequence

**Boot Process**:
1. Launch
2. Single instance check
3. Load `settings.json`
4. Start local Flask backend (`localhost:5001`)
5. Health check Flask
6. Load AI models (warmup)
7. Initialize SQLite + run migrations
8. Restore last window state
9. Load encrypted tokens from `<userData>/auth.json`, validate with cloud, refresh if needed
10. Load last workspace
11. Render main UI → Ready

**Graceful Shutdown**:
1. Save unsaved changes
2. Flush queues & caches
3. Stop background workers
4. Stop Flask backend
5. Close windows
6. Exit

---

## 14. Local File System Layout

```
~/Library/Application Support/Gnovium (macOS)
%APPDATA%\Gnovium (Windows)
~/.config/Gnovium (Linux)

├── local.db                  # SQLite database
├── auth.json                 # Encrypted auth tokens (safeStorage — macOS Keychain, Windows DPAPI, Linux libsecret)
├── models/                   # Bundled AI models (GGUF)
├── uploads/                  # User uploaded files
├── backups/                  # Workspace JSON backups
├── logs/                     # Application logs
├── cache/                    # Embeddings cache, thumbnails
├── temp/                     # Temporary files
└── settings.json             # User preferences
```

---

## 15. Configuration Management

- `.env` (development only)
- `settings.json` (user preferences, persisted)
- Feature flags
- AI model config (paths, quantization, GPU settings)
- Runtime paths (data dir, models dir)
- Ports & timeouts
- Logging level

---

## 16. AI Runtime Management

- Model loading on app start (Qwen2.5-3B + BGE-M3)
- Warmup sequence
- Memory usage monitoring & limits
- GPU detection (CUDA / Metal / DirectML) with CPU fallback
- Inference queue with priority
- Embedding cache (sqlite-vec)
- Cancellation support
- Streaming responses
- Separate inference & embedding workers

---

## 17. Background Services

| Worker | Purpose |
|--------|---------|
| Sync Worker | Personal cloud sync (same user across devices) `[optional — requires cloud account]` |
| Embedding Worker | Generate/update embeddings in background |
| Graph Materializer | Build graph indices |
| Backup Worker | Scheduled auto-backup |
| Cleanup Worker | Orphans, old logs, temp files |
| Notification Worker | Process & deliver notifications |

All managed via Electron's utility processes or child processes with restart logic.

---

## 18. Error Handling Strategy

- Graceful offline mode
- Database corruption recovery
- Model load failure fallback
- JWT expiry → re-auth flow
- Sync conflict resolution UI (only when cloud sync enabled)
- Filesystem permission errors
- Backup/restore failure handling
- Global error boundary + crash reporting

---

## 19. Local Settings Categories

| Category | Options |
|----------|---------|
| General | Language, auto-save interval, startup behavior |
| Editor | Default block type, auto-close brackets, spellcheck |
| Appearance | Theme, font size, density, sidebar width |
| AI | Model path, GPU layers, confidence thresholds, auto-suggest |
| Performance | Max cache size, batch sizes, worker count |
| Backups | Backup interval, max backups, export path |
| Privacy | Telemetry, crash reports, analytics |
| Sync | Auto-sync, conflict strategy, server URL (requires cloud account) |
| Keyboard Shortcuts | Custom keybindings |
| Advanced | Debug mode, log level, experimental features |

---

## 20. Search UI Features

- Search modes: keyword, full_text (FTS5), semantic, hybrid (default)
- Recent searches
- Advanced filters (type, date, tags, relations — pending: search endpoint not yet implemented)
- Search suggestions / autocomplete
- Keyboard navigation
- Search history
- Result highlighting (pending: search endpoint not yet implemented)

---

## 21. Graph UI Features

- Multiple layout algorithms (force-directed, hierarchical, radial)
- Node clustering / grouping
- Pinning nodes
- Export as image / PDF
- Focus / isolate mode
- Multi-selection tools
- Edge labels & types
- Legend & filters

---

## 22. Notifications System

- Toast notifications
- Notification center
- Read/unread management
- Persistence across sessions
- Action buttons (e.g., "Open Entity")

---

## 23. File Viewer & Preview

- Image viewer (zoom, pan, rotate)
- PDF viewer (embedded)
- Markdown preview
- Code syntax-highlighted preview
- Embedded file linking in blocks

---

## 24. Export Formats

| Format | Includes |
|--------|----------|
| JSON | Full workspace, all entities, blocks, relations |
| Markdown | Entities as .md files with frontmatter + assets |
| ZIP | Archive of markdown + images |
| HTML | Single-file self-contained export |
| PDF | Current entity/block rendered to PDF |

---

## 25. Performance Features

- Virtual scrolling in lists/editors
- Lazy loading of blocks/graph nodes
- Graph virtualization (viewport culling)
- Image & embedding caching
- Query result caching (TanStack Query)
- Pagination where applicable

---

## 26. Electron Packaging & Distribution

| Platform | Format |
|----------|--------|
| Windows | `.exe` installer + portable |
| macOS | `.dmg` + `.app` (Apple Silicon + Intel) |
| Linux | `.AppImage`, `.deb`, `.rpm` |

- Auto-updater via GitHub releases (`electron-updater`)
- Code signing (Windows + macOS)
- Installer branding
- Portable / single executable option

---

## 27. Security Architecture

- Content Security Policy (CSP)
- IPC allowlist (only predefined channels)
- Protocol handler validation
- Path traversal protection
- Secure file access sandbox
- Model integrity verification (hash check)
- Optional backup encryption (AES-256)
- Sandboxed renderer
- Context Isolation enforced
- Node Integration disabled
- `safeStorage` for auth tokens (encrypted `auth.json`, never in renderer)
- Rate limiting on local Flask API
- Input sanitization

---

## 28. Dependency Diagram (High-Level)

```
Electron Main Process
├── Flask Backend (Python)
│   └── SQLAlchemy + SQLite
├── React 19 Renderer
│   ├── Vite
│   ├── TanStack Query
│   ├── Zustand / Jotai
│   ├── shadcn/ui + Tailwind v4
│   ├── React Router v7
│   ├── Tiptap / BlockNote (Editor)
│   └── React Flow (Graph)
├── Local AI Runtime
│   ├── Qwen2.5-3B-Instruct (GGUF)
│   ├── BGE-M3 Embeddings
│   └── llama.cpp / custom inference engine
├── sqlite-vec (vector search)
└── OS Integration (Tray, Deep Links, Auto-updater)
```

---

## 29. Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB (CPU fallback) | 8 GB+ |
| Disk | ~3.5 GB (models ~2.6 GB + data) | 10 GB+ |
| GPU | CPU-only | CUDA (NVIDIA), Metal (Apple), DirectML (Windows) |
| Model Sizes | Qwen2.5-3B Q4_K_M ≈ 2.0 GB, BGE-M3 ≈ 0.6–1.2 GB |

---

## 30. Implementation Priority (MVP → Full)

### Phase 1 — Core
- Auth flow + secure token storage
- Workspace + Entity CRUD
- Block editor (basic blocks)
- Local Flask backend integration

### Phase 2 — Intelligence
- Graph view
- Relations + AI suggestions
- Search + Semantic

### Phase 3 — Versions
- Versioning (branches, snapshots, diffs)
- Full governance
- Sync engine (optional — requires cloud account)

### Phase 4 — Polish
- Themes, shortcuts, performance tuning
- File viewer, export formats
- Packaging & distribution

---

## 31. Logging & Diagnostics

- Application logs (structured, rotation)
- AI inference logs
- Sync operation logs (when cloud sync active)
- IPC call logs
- Crash dumps (Electron crash reporter)
- Diagnostics export (for support)

All logs stored in `logs/` folder with automatic rotation.

---

## 32. Security & Best Practices

- Use `safeStorage` for auth tokens (encrypted `auth.json` in `<userData>`, renderer never holds raw tokens)
- CSP enabled
- Sandboxed renderer
- Context Isolation + Node Integration disabled
- Flask runs on `localhost:5001` with JWT validation
- Rate limiting + input sanitization
- Auto-backup on close
- Secure IPC only through preload context bridge
