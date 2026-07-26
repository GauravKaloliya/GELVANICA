# Gnovium V1 — Complete System Specification (Local Electron App + Backend)

> **Merged document** combining the Electron app specification, backend API reference, and local storage architecture.
> **Version:** 1.0.0
> **Last updated:** 2026-07-25

---

## 1. Core Philosophy & Architecture

- **Local-First by Default**: All data stored in SQLite (`local.db`). Full offline operation.
- **Global Auth**: Uses cloud (`gnovium.com`) for identity. Local app verifies JWT with shared secret. `[cloud dependency]`
- **Zero Migration**: Same data model/API as cloud. Personal cloud sync across devices (optional). `[cloud dependency -- sync only]`
- **Bundled AI**: Qwen2.5-3B-Instruct (Q4_K_M GGUF) + BGE-M3 embedding model.
- **Modern, Notion-like UI** with block editor, graph, versioning, AI sidebar.

### Backend Architecture

```
+------------------------------------------------------------+
|                    Flask Application                       |
|  +---------+ +------------+ +--------------------------+   |
|  |  Core   | | Middleware  | |     API v1 Blueprints   |   |
|  | Config  | | - Security | |  (28 sub-blueprints)    |   |
|  | Errors  | | - Request  | |                          |   |
|  | Logging | |   Context  | |  /auth, /workspaces,     |   |
|  | Metrics | +------------+ |  /admin, /docs           |   |
|  +---------+                +----------+---------------+   |
|       |                                |                    |
|       v                                v                    |
|  +----------------------------------------------------+   |
|  |                   Services                         |   |
|  |  27 service classes + 3 processing modules         |   |
|  +-----------------------+--------------------------+   |
|                          |                              |
|                          v                              |
|  +----------------------------------------------------+ |
|  |              Repositories (DAO Layer)               | |
|  |  BaseCRUDRepository, DomainRepository,             | |
|  |  LocalRepository, Mixins                           | |
|  +-----------------------+--------------------------+   |
|                          |                              |
|                          v                              |
|  +----------------------------------------------------+ |
|  |               SQLAlchemy Models                     | |
|  |  Domain (29 tables)  |  Local (29 tables)          | |
|  +----------------------------------------------------+ |
|              |                    |                      |
|              v                    v                      |
|        PostgreSQL              SQLite                    |
+------------------------------------------------------------+
```

### Deployment Modes

| Mode | Database | Auth | File Storage | GNOVIUM_MODE |
|------|----------|------|-------------|--------------|
| Local | SQLite via SQLITE_SCHEMA.sql | Local JWT (LOCAL_AUTH_ENABLED=true) | Local filesystem via LocalProvider | local |
| Cloud | PostgreSQL via POSTGRESQL_SCHEMA.sql | Full auth (Google OAuth, password, JWT) | AWS S3 via S3Provider | cloud |

### Cloud Boundary
- **Cloud-only modules** (NOT in Electron app spec): Auth (8 endpoints), Jobs (4 endpoints), Files presign
- **Optional cloud features**: Personal sync (12 endpoints) -- marked with `[requires cloud account]`
- **Cloud dependency**: Authentication via gnovium.com -- marked with `[cloud dependency]`
- **All other functionality**: Fully local, offline-capable

### Conditional Model Loading
- cloud mode -> imports from app.models.domain (all 29 tables)
- local mode -> imports from app.models.local (25 tables + 4 cloud-only stubs)
- Cloud-only models get _CloudOnlyStub metaclass that raises NotImplementedError on .query
- Stub classes: BranchMerge, Comment, CommentReaction, FileVariant, GovernanceReport, Invite, Job, MergeConflict, WorkspaceMember

---

## 2. Authentication Flow -- Centralized Architecture

The local Electron app has **no local authentication whatsoever** -- no login page, no register page, no password forms. Authentication is handled exclusively through gnovium.com/auth (cloud web) via a webview BrowserWindow.

### Auth Flow

1. **App Launch** -> Flask backend starts -> main process loads tokens from <userData>/auth.json (encrypted via safeStorage) -> validates with cloud via GET /auth/me.
2. **No Session / Expired** -> Main process opens a BrowserWindow to gnovium.com/auth?source=desktop.
3. **User Signs In or Signs Up** on the cloud web unified auth page (email/password, or Google OAuth).
4. **Cloud web** authenticates against cloud API, creates/verifies session in cloud PostgreSQL sessions table.
5. **Cloud web generates one-time code** via POST /auth/exchange-code (5-minute expiry, single use).
6. **Cloud web redirects** to gnovium-auth://callback?code=xxx (custom protocol).
7. **Electron protocol handler** catches the code, sends it to the main process via IPC.
8. **Main process exchanges code** for tokens via POST /auth/exchange on local Flask.
9. **Local Flask forwards code** to cloud backend for validation.
10. **Cloud backend validates code** (5-min expiry, single use), returns tokens + user data.
11. **Main process stores tokens** encrypted in <userData>/auth.json via safeStorage.
12. **Tokens NEVER leave main process** -- renderer gets tokens via IPC only.
13. **No localStorage token storage** -- all token operations go through IPC to main process.
14. **Google OAuth flow**: Handled entirely by gnovium.com. If no account exists, auto-creates from Google profile. [cloud-only endpoint]
15. **Profile** shown in sidebar with avatar, name, email. Avatar auto-generated via DiceBear identicon; updatable via PATCH /auth/me [cloud-only] when online.

### JWT Token System

| Token | Duration | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 30 min (configurable) | Authorization: Bearer <token> | API auth |
| Refresh Token | 30 days (configurable) | refresh_jti in DB | Token refresh |

### Token Storage
- **Encrypted file**: <userData>/auth.json (OS-level encryption via safeStorage)
  - macOS: Keychain
  - Windows: DPAPI
  - Linux: libsecret
- **In-memory cache** in AuthService (main process only)
- **Renderer never holds raw tokens** -- asks main process via IPC

### Session Management
- **30-minute inactivity timeout** (renderer-side)
- **Automatic token refresh** before expiry (main process timer)
- **On startup**: load from encrypted file, validate with cloud, refresh if needed
- Token storage: sessions table with jti, refresh_jti, revoked_at
- Refresh: Issues new access token, revokes old refresh token
- Logout: Revokes current session (revoked_at = now())
- Cleanup: _cleanup_expired_sessions (scheduled task)

### Endpoint Security Decorators

| Decorator | Source | Behavior |
|-----------|--------|----------|
| @secured | app/services/security.py | Wraps @jwt_required(), handles JWT errors |
| @cloud_only | app/api/v1/helpers.py | Returns 400 cloud_only in local mode |
| @require_local_auth | app/api/v1/auth/routes.py | Returns 400 if LOCAL_AUTH_ENABLED=False |
| @require_admin | app/api/v1/admin/routes.py | Checks admin/owner role |
| check_workspace_access(ws_id) | app/api/v1/helpers.py | Validates user owns workspace (local) or is member (cloud) |
| transactional | app/services/decorators.py | Wraps function in DB transaction |
| feature_flag(flag) | app/services/decorators.py | Returns 501 if feature flag disabled |

### JWT Callbacks
| Callback | Handler |
|----------|---------|
| token_in_blocklist_loader | Checks SessionRepository.find_by_any_jti(jti) and revoked_at |
| user_lookup_loader | Loads user via UserRepository().get(identity) |
| expired_token_loader | Returns 401 token_expired |
| invalid_token_loader | Returns 401 invalid_token |
| unauthorized_loader | Returns 401 unauthorized |
| revoked_token_loader | Returns 401 token_revoked |

### Profile Edit
- **Online only** -- PATCH /auth/me via local Flask -> cloud API
- **Profile image upload** to S3 with rollback on failure
- **Offline users** see "must be online to edit profile"

### IPC Channels

| Channel | Direction | Description |
|---------|-----------|-------------|
| auth:open-webview | renderer -> main | Opens cloud auth page in BrowserWindow |
| auth:exchange-code | renderer -> main | Exchanges one-time code for tokens |
| auth:get-profile | renderer -> main | Returns user profile from main process |
| auth:get-tokens | renderer -> main | Returns access_token from main process |
| auth:logout | renderer -> main | Clears tokens and notifies server |
| auth:update-profile | renderer -> main | Updates profile via cloud API |
| auth:is-online | renderer -> main | Checks if local Flask is running |
| auth:status-changed | main -> renderer | Auth state changed notification |
| auth:code-received | main -> renderer | One-time code received from protocol handler |

### Endpoints Used
- Cloud (via local Flask proxy): /auth/exchange, /auth/me (GET + PATCH), /auth/logout
- Cloud (direct from cloud web): /auth/exchange-code, /auth/check-email, /auth/google
- Local API calls: All other endpoints with Authorization: Bearer <token>

---

## 3. Single-User Architecture

- **Offline-first**: All data local by default. Cloud is optional, for personal backup and multi-device sync.
- **Single-user**: No workspace members, invites, roles, permissions, shared workspaces, or team features.
- **Personal cloud sync** (optional): The cloud stores one user's workspace and syncs it across that user's devices. [requires cloud account]
- **No real-time editing, presence indicators, or multi-user conflict resolution.**

```
Laptop
   |
   v
Cloud Account (single user)
   |
   +-- Desktop
   +-- Future Mobile App
```

---

## 4. App Structure & File Organization

### Backend File Structure

| Path | Purpose |
|------|---------|
| run.py | Local mode entry point (Flask dev server, port 5000) |
| wsgi.py | Cloud/WSGI entry point |
| worker.py | Background worker entry point |
| scheduler.py | Background scheduler entry point |
| app/__init__.py | Flask app factory: extensions, routes, error handlers, schema init |
| app/extensions.py | Flask extensions: db, jwt, cors, limiter, cache, redis |
| app/core/config.py | Config classes: Config, LocalConfig, CloudConfig, TestingConfig |
| app/core/constants.py | Allowed extensions/MIME types, rate limits, thresholds |
| app/core/errors.py | 20+ error code constants + 14 ApiError subclasses |
| app/core/response.py | Response helpers: ok, ok_list, error, error_response |
| app/core/sanitization.py | sanitize_html, sanitize_text, sanitize_filename, sanitize_url |
| app/core/validation.py | load_schema with sanitization |
| app/core/serialization.py | to_json, model_to_dict |
| app/core/logging.py | structlog configuration with sensitive data redaction |
| app/core/security_logger.py | SecurityLogger: auth failure, rate limit, CSRF, suspicious req |
| app/core/circuit_breaker.py | CircuitBreaker with HALF_OPEN/CLOSED/OPEN states |
| app/core/schema_setup.py | execute_pg_schema, execute_sqlite_schema |
| app/middleware/security.py | Security middleware: CSP, HSTS, XSS, CORS hardening |
| app/middleware/request_context.py | Request ID, timing, metrics recording |
| app/monitoring.py | MetricsCollector: Prometheus export, request tracking |
| SQLITE_SCHEMA.sql | Complete SQLite schema (29 tables, FTS5, triggers, seed data) |
| POSTGRESQL_SCHEMA.sql | Complete PostgreSQL schema (29 tables, extensions, triggers) |

### Electron App File Structure

```
gnovium-electron/
+-- src/
|   +-- main/                     # Electron Main Process
|   |   +-- index.ts             # Entry point
|   |   +-- window-manager.ts    # Window creation, state persistence
|   |   +-- protocol-handler.ts  # gnovium-auth://callback
|   |   +-- auth-service.ts      # Token storage / refresh
|   |   +-- ipc-handlers.ts      # All IPC channels
|   |   +-- local-server.ts      # Spawn Flask backend
|   |   +-- menu.ts              # Native menus
|   |   +-- auto-updater.ts      # electron-updater
|   |   +-- crash-reporter.ts    # Error reporting
|   |   +-- tray.ts              # System tray
|   |   +-- power-monitor.ts     # Suspend/resume
|   |
|   +-- renderer/                # React + Vite
|   |   +-- index.html
|   |   +-- main.tsx
|   |   +-- App.tsx
|   |   +-- router.tsx           # React Router v7
|   |   |
|   |   +-- components/
|   |   |   +-- ui/              # shadcn/ui
|   |   |   +-- editor/
|   |   |   +-- graph/
|   |   |   +-- sidebar/
|   |   |   +-- modals/
|   |   |   +-- common/
|   |   |
|   |   +-- pages/
|   |   |   +-- SplashScreen.tsx
|   |   |   +-- WorkspacePicker.tsx
|   |   |   +-- workspace/
|   |   |   |   +-- WorkspaceLayout.tsx
|   |   |   |   +-- EntityPage.tsx
|   |   |   |   +-- Dashboard.tsx
|   |   |   +-- GraphView.tsx
|   |   |   +-- SearchPage.tsx
|   |   |   +-- AIAssistant.tsx
|   |   |   +-- BranchesPage.tsx
|   |   |   +-- VersionHistory.tsx
|   |   |   +-- DiffViewer.tsx
|   |   |   +-- SnapshotsPage.tsx
|   |   |   +-- ActivityLog.tsx
|   |   |   +-- NotificationsCenter.tsx
|   |   |   +-- FileManager.tsx
|   |   |   +-- GovernancePage.tsx
|   |   |   +-- Settings.tsx
|   |   |   +-- BackupRestore.tsx
|   |   |   +-- SyncStatus.tsx
|   |   |   +-- ShortcutsReference.tsx
|   |   |   +-- AboutDiagnostics.tsx
|   |   |   +-- ErrorRecovery.tsx
|   |   |
|   |   +-- lib/
|   |   |   +-- api.ts            # Axios instance + interceptors
|   |   |   +-- auth.ts
|   |   |   +-- utils.ts
|   |   |
|   |   +-- hooks/
|   |   +-- store/                # Zustand / Jotai
|   |   +-- styles/
|   |   +-- assets/
|   |
|   +-- preload/                  # Context Bridge
|   |   +-- index.ts
|   |
|   +-- workers/                  # Background utility processes
|   |   +-- sync-worker.ts        # [optional -- requires cloud account]
|   |   +-- embedding-worker.ts
|   |   +-- graph-worker.ts
|   |   +-- backup-worker.ts
|   |   +-- cleanup-worker.ts
|   |   +-- notification-worker.ts
|   |
|   +-- public/
|
+-- electron.vite.config.ts
+-- package.json
+-- tsconfig.json
+-- tailwind.config.ts
```

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Build Tool | Vite (electron-vite) |
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
| Backend | Flask 3.0.3 (Python) via localhost:5001 |
| Database | SQLite + sqlite-vec (vector search) |
| AI Runtime | llama.cpp (Qwen2.5-3B + BGE-M3) |

### Full Stack Comparison

| Layer | docs | cloud-web | landing | local-app (Electron) | backend |
|-------|------|----------|---------|----------------------|---------|
| Language | TypeScript 5 | TypeScript 5 | TypeScript 5 | TypeScript 5 + Python | Python 3 |
| Framework | Next.js 16.2.9 | Next.js 16.2.9 | Next.js 16.2.9 | Electron 32 + Vite | Flask 3.0.3 |
| UI | React 19.2.4 | React 19.2.4 | React 19.2.4 | React 19.2.4 | -- |
| Styling | Tailwind v4 | Tailwind v4 | Tailwind v4 | Tailwind v4 | -- |
| Components | -- | -- | -- | shadcn/ui | -- |
| Animation | framer-motion 12 | framer-motion 12 | framer-motion 12 | framer-motion 12 | -- |
| Icons | lucide-react | lucide-react | lucide-react | lucide-react | -- |
| Routing | Next.js App Router | Next.js App Router | Next.js App Router | React Router v7 | Flask blueprints |
| Data Fetching | Build-time | -- | -- | TanStack Query | -- |
| State | -- | -- | -- | Zustand / Jotai | -- |
| Editor | -- | -- | -- | Tiptap / BlockNote | -- |
| Graph | -- | -- | -- | React Flow | -- |
| Auth | -- | JWT | -- | JWT (safeStorage) | Flask-JWT-Extended |
| DB/ORM | -- | -- | -- | SQLite + sqlite-vec | SQLAlchemy 2.0 |
| AI | -- | -- | -- | Qwen2.5-3B + BGE-M3 | -- |
| Build | Static export | Server build | Server build | electron-vite | pip / setuptools |
| Testing | ESLint | ESLint | ESLint | ESLint + Vitest | pytest |
| Shared | @gnovium/shared | @gnovium/shared | @gnovium/shared | @gnovium/shared | -- |

---

## 6. Complete Feature List

### Workspace & Editing
- Block-based editor (14 block types)
- Rich text, inline formatting, nesting
- Drag & drop reordering, batch reorder
- Block move between entities
- Threaded comments on entities & blocks
- Soft delete + restore
- Archive with archived_at timestamp

### Knowledge Management
- Custom entity types + properties
- Typed relations (refers_to, depends_on, part_of, related_to, implements, extends)
- AI-powered relation suggestions on save
- Tags with colors
- Automatic backlinks
- Custom properties (text, number, select, multi_select, date, checkbox, url, email, phone, rich_text)

### Visualization
- Interactive knowledge graph (nodes + edges, zoom, pan, filter, node selection)
- Graph queries, traversal (BFS depth <= 5), shortest paths

### Versioning (Git-Inspired)
- Page history (append-only in local mode)
- Workspace snapshots
- Branches + merge with local conflict resolution
- Visual diffs (block/entity/snapshot/branch level)

### AI Capabilities (Local Inference)
- Workspace-wide hybrid/semantic search
- Natural language Q&A grounded in workspace
- Summarization
- Related entity recommendations
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

### Personal Cloud Sync (Optional)
- Personal cloud sync -- cloud stores one user's workspace and syncs across devices
- Backup / Export / Import workspace as JSON
- Background jobs (local Electron worker processes)

### Other
- Notifications (local)
- Multi-branch context switching
- Search (keyword + semantic + hybrid)
- Dark/light mode, customizable themes
- Keyboard shortcuts

---

## 7. Complete Page / Screen List

| # | Screen | Description |
|---|--------|-------------|
| 1 | Splash Screen | Logo + loading state during startup |
| 2 | Auth / Login | No local login -- Electron opens gnovium.com/auth in BrowserWindow. Receives one-time code via gnovium-auth:// custom protocol. [cloud dependency] |
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
| 18 | Sync Status | Personal sync progress across devices [requires cloud account] |
| 19 | Governance Dashboard | Health, duplicates, orphans, stale |
| 20 | Keyboard Shortcuts | Reference sheet |
| 21 | About / Diagnostics | App version, logs, export |
| 22 | Error / Recovery | Graceful error screens |

### Key Page Functionalities

#### 7.1 Onboarding / Auth Screen
- Splash with logo, no local login/register
- "Sign in with Gnovium" button -> opens gnovium.com/auth in BrowserWindow
- After auth, cloud web redirects to gnovium-auth://callback?code=xxx
- Electron protocol handler catches code, exchanges for tokens via main process

#### 7.2 Main Workspace Layout
- **Left Sidebar**: Workspaces list, Entity tree, Quick search
- **Main Area**: Block editor or Graph view (toggleable)
- **Right Sidebar**: Properties, Backlinks, Comments, AI Assistant, Graph mini-map
- **Top Bar**: Title, version/branch indicator, AI toggle, user avatar

#### 7.3 Entity Page (Block Editor)
- Canvas with draggable blocks, slash commands (/todo, /image, etc.)
- Inline @mentions, page links, real-time AI suggestions

#### 7.4-7.8 Other Views
- **Graph View**: Full-screen interactive, node click -> open entity, relation filtering, force-directed layout
- **Search & AI**: Global search bar (hybrid + semantic), AI chat sidebar with workspace context
- **Versioning UI**: History timeline, snapshot list, branch switcher + merge UI with diff viewer
- **Governance Dashboard**: Health score card, duplicates/orphans/stale lists
- **Settings**: Sync status, AI models, theme, shortcuts, backup controls

---

## 8. Electron Main Process Architecture

**Responsibilities:**
- Single instance lock (prevent multiple app instances)
- Deep link registration (gnovium://)
- Crash recovery & error reporting
- Auto updater (electron-updater)
- Window creation, management & persistence (position, size, state)
- App lifecycle management (ready, quit, activate)
- Tray icon support (optional, with quick actions)
- Power events handling (suspend, resume)
- OS integration (native menus, file associations, protocol handler)
- Spawn and manage local Flask backend
- Global keyboard shortcuts
- Logging & diagnostics

### Dependency Diagram (High-Level)

```
Electron Main Process
+-- Flask Backend (Python)
|   +-- SQLAlchemy + SQLite
+-- React 19 Renderer
|   +-- Vite
|   +-- TanStack Query
|   +-- Zustand / Jotai
|   +-- shadcn/ui + Tailwind v4
|   +-- React Router v7
|   +-- Tiptap / BlockNote (Editor)
|   +-- React Flow (Graph)
+-- Local AI Runtime
|   +-- Qwen2.5-3B-Instruct (GGUF)
|   +-- BGE-M3 Embeddings
|   +-- llama.cpp / custom inference engine
+-- sqlite-vec (vector search)
+-- OS Integration (Tray, Deep Links, Auto-updater)
```

---

## 9. Preload API (Secure Context Bridge)

Exposed as window.gnovium:

```ts
interface GnoviumAPI {
  auth: {
    openWebview: () => Promise<void>;
    exchangeCode: (code: string) => Promise<{tokens: Tokens; user: User}>;
    getProfile: () => Promise<User>;
    getTokens: () => Promise<{access_token: string}>;
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
  clipboard: { writeText, readText };
  notifications: { show: (title, body, action?) => void };
  ipc: {
    send: (channel: string, ...args) => void;
    invoke: (channel: string, ...args) => Promise<any>;
    on: (channel: string, listener) => void;
  };
  sync: { getStatus, triggerSync };
  settings: { get, set, getAll };
  window: { minimize, maximize, close, setTitle };
  version: { app, electron, chrome };
}
```

---

## 10. IPC Design

**Namespaces** (70+ channels):
- auth:* -- open-webview, exchange-code, get-profile, get-tokens, logout, update-profile, is-online, status-changed, code-received
- window:* -- minimize, maximize, close, set-title
- dialog:* -- open-file, save-file
- filesystem:* -- read, write, list, delete
- backup:* -- export, import, list, rotate-key, change-password
- settings:* -- get, set, get-all, reset
- notifications:* -- show, dismiss, list
- graph:* -- query, materialize, traverse, paths
- search:* -- keyword, semantic, hybrid
- ai:* -- query, suggest-relations, summarize
- sync:* -- status, trigger [requires cloud account]
- editor:* -- block-create, block-update, block-move, reorder
- versioning:* -- history, snapshot, branch, diff, merge, resolve-conflict
- governance:* -- health, duplicates, orphans, stale

All IPC goes through the preload bridge with allowlist validation.

### File Operations IPC Channels

| Channel | Method | Description |
|---------|--------|-------------|
| file:list | GET | List files with optional filters |
| file:get | GET | Get file metadata |
| file:upload | POST | Upload a file via multipart form data |
| file:download | GET | Download file content (base64 or save to disk) |
| file:delete | DELETE | Soft-delete a file |
| file:link | POST | Link a file to an entity |
| file:unlink | DELETE | Unlink a file from an entity |
| file:cleanup-orphans | POST | Remove unlinked file records |

### Backup Operations IPC Channels

| Channel | Description |
|---------|-------------|
| backup:export | Export workspace as JSON |
| backup:import | Import workspace from JSON |
| backup:list | List available backup files |
| backup:auto-backup | Trigger automatic backup |
| backup:export-to-disk | Export JSON to specified path |
| backup:start-timer | Start periodic auto-backup timer |
| backup:stop-timer | Stop auto-backup timer |
| backup:export-encrypted | Export encrypted (AES-256-GCM) |
| backup:import-encrypted | Import encrypted backup |
| backup:change-password | Re-encrypt backup with new password |
| backup:export-markdown | Export as Markdown |
| backup:export-zip | Export as ZIP |
| backup:export-html | Export entity as HTML |
| backup:export-pdf | Export entity as PDF |
| backup:export-zip-encrypted | Export as encrypted .gnv archive |
| backup:import-zip | Import from encrypted .gnv |
| backup:delete | Delete backup by ID |
| backup:rotate-key | Rotate backup encryption key |

### Filesystem Operations IPC Channels

| Channel | Description |
|---------|-------------|
| filesystem:read-file | Read file from disk (returns base64) |
| filesystem:write-file | Write base64 data to disk |
| filesystem:list-dir | List directory contents |
| filesystem:delete-file | Delete file from disk |

---

## 11. State / Data Flow Architecture

**Main Data Flow:**
```
React UI
   | (TanStack Query)
API Layer (Axios)
   | (only when needed)
IPC Bridge (preload)
   |
Local Flask API
   |
SQLite + sqlite-vec
```

**AI Flow:**
```
AI Sidebar / Query
   |
TanStack Query -> /ai/query
   |
Agent Runtime (Supervisor + Tools)
   |
Local LLM (Qwen2.5-3B) + Embeddings (BGE-M3)
   |
Response Streaming
```

---

## 12. Application Startup Sequence

**Boot Process:**
1. Launch
2. Single instance check
3. Load settings.json
4. Start local Flask backend (localhost:5001)
5. Health check Flask
6. Load AI models (warmup)
7. Initialize SQLite + run migrations
8. Restore last window state
9. Load encrypted tokens from <userData>/auth.json, validate with cloud, refresh if needed
10. Load last workspace
11. Render main UI -> Ready

**Graceful Shutdown:**
1. Save unsaved changes
2. Flush queues & caches
3. Stop background workers
4. Stop Flask backend
5. Close windows
6. Exit

---

## 13. Local File System Layout

### Allowed Directories

The Electron app grants file system access to exactly four directories:

| Directory | Electron Path | Purpose |
|-----------|---------------|---------|
| userData | app.getPath('userData') | Settings, database, encryption keys, cache |
| documents | app.getPath('documents') | User document storage for exports |
| downloads | app.getPath('downloads') | Download destination for exported files |
| temp | app.getPath('temp') | Temporary file staging |

Any path operation outside these four directories is rejected.

### userData Contents

```
~/Library/Application Support/Gnovium (macOS)
%APPDATA%\Gnovium (Windows)
~/.config/Gnovium (Linux)

{userData}/
+-- settings.json          -- Application configuration
+-- local.db               -- SQLite database
+-- auth.json              -- Auth tokens (encrypted with safeStorage)
+-- backup-keys.json       -- Backup encryption keys (encrypted with safeStorage)
+-- backup-keys.json.old   -- Previous backup key (during rotation)
+-- models/                -- Bundled AI models (GGUF)
+-- uploads/               -- User uploaded files
+-- backups/               -- Workspace JSON backups
+-- logs/
|   +-- gnovium-{timestamp}.log  -- App logs (rotated, max 10MB each, 10 files max)
+-- cache/                 -- Embeddings cache, thumbnails
+-- temp/                  -- Temporary files
```

---

## 14. Configuration Management

- .env (development only)
- settings.json (user preferences, persisted)
- Feature flags
- AI model config (paths, quantization, GPU settings)
- Runtime paths (data dir, models dir)
- Ports & timeouts
- Logging level

### Local Settings Categories

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

## 15. Full API Endpoints Reference

> **URL Prefix:** All endpoints under /api/v1/... (exceptions: /health, /metrics at root; /admin/... under /api/v1/admin; /docs under /api/v1/docs)
> **Response Format:** {"data": ...} on success, {"error": {"code": ..., "message": ...}} on error
> **Pagination:** ?page=1&per_page=30 (max per_page: 100)
> **Rate limit shorthand:** STANDARD = 120/min, STRICT = 30/min, DESTRUCTIVE = 10/min, LENIENT = 300/min, AUTH_WRITE = 5/min, FILE_UPLOAD = 10/min, FILE_DOWNLOAD = 60/min, PASSWORD_RESET = 3/min
> **Total Endpoints:** 221

### 15.1 Auth
**Prefix:** /auth | **Permission:** Varies

| Method | Path | Rate | Auth | Notes |
|--------|------|------|------|-------|
| GET | /auth/check-email | STRICT | Public | {available: bool} |
| POST | /auth/refresh | STANDARD | Public | Proxies to cloud |
| POST | /auth/logout | STANDARD | Public | Proxies to cloud |
| GET | /auth/me | STANDARD | JWT | User profile |
| PATCH | /auth/me | STRICT | JWT | Update name/avatar |
| POST | /auth/avatar | STRICT | JWT | Upload profile avatar |
| POST | /auth/exchange | DESTRUCTIVE | Public | Code-for-tokens |

### 15.2 Workspaces
**Prefix:** /workspaces

| Method | Path | Rate | Permission | Notes |
|--------|------|------|------------|-------|
| GET | /workspaces/ | STANDARD | Authenticated | List |
| POST | /workspaces/ | STRICT | Authenticated | Create |
| GET | /workspaces/<ws> | STANDARD | check_workspace_access | -- |
| PATCH | /workspaces/<ws> | STRICT | Admin/owner | Partial update |
| DELETE | /workspaces/<ws> | DESTRUCTIVE | Admin/owner | Delete |
| POST | /workspaces/<ws>/restore | STRICT | Owner | Restore |
| GET | /workspaces/<ws>/stats | STANDARD | check_workspace_access | Counts |

### 15.3 Entities
**Prefix:** /workspaces/<ws>/entities | **Permission:** check_workspace_access

| Method | Path | Rate | Notes |
|--------|------|------|-------|
| GET | /workspaces/<ws>/entities/ | STANDARD | Paginated list with filters |
| POST | /workspaces/<ws>/entities/ | STRICT | Create + properties, event, search |
| GET | /workspaces/<ws>/entities/<eid> | STANDARD | Get |
| PATCH | /workspaces/<ws>/entities/<eid> | STRICT | Update |
| DELETE | /workspaces/<ws>/entities/<eid> | STRICT | Soft-delete cascade |
| DELETE | /workspaces/<ws>/entities/<eid>/permanent | DESTRUCTIVE | Hard delete |
| POST | /workspaces/<ws>/entities/<eid>/restore | STRICT | Cascade-restore |
| POST | /workspaces/<ws>/entities/<eid>/archive | STRICT | Toggle archive |
| POST | /workspaces/<ws>/entities/<eid>/duplicate | STRICT | Deep copy |
| GET | /workspaces/<ws>/entities/<eid>/children | STANDARD | List children |
| POST | /workspaces/<ws>/entities/<eid>/children | STRICT | Create child |
| GET | /workspaces/<ws>/entities/<eid>/versions | STANDARD | List versions |
| GET/POST | /workspaces/<ws>/entities/properties | -- | Alias (no admin gate) |

### 15.4 Entity Types
**Prefix:** /workspaces/<ws>/entities/types

| Method | Rate | Notes |
|--------|------|-------|
| POST | STRICT | Create |
| GET | STANDARD | List |
| GET <type_id> | STANDARD | Get |
| PATCH <type_id> | STRICT | Update |
| DELETE <type_id> | STRICT | Delete |

### 15.5 Blocks
**Prefix:** /workspaces/<ws>/blocks

| Method | Path | Rate | Notes |
|--------|------|------|-------|
| GET | /workspaces/<ws>/blocks/ | STANDARD | List (?entity_id=) |
| POST | /workspaces/<ws>/blocks/ | STRICT | Create (sanitized, auto-position) |
| GET | /workspaces/<ws>/blocks/<bid> | STANDARD | Get |
| PATCH | /workspaces/<ws>/blocks/<bid> | STRICT | Update (circular ref check) |
| POST | /workspaces/<ws>/blocks/<bid>/move | STRICT | Move (circular ref check) |
| DELETE | /workspaces/<ws>/blocks/<bid> | STRICT | Soft-delete |
| POST | /workspaces/<ws>/blocks/reorder | STRICT | Batch reorder |
| POST | /workspaces/<ws>/blocks/<bid>/restore | STRICT | Restore |

**Block Types (21):** text, heading, bulleted_list, numbered_list, to-do, toggle, code, quote, callout, divider, image, video, file, bookmark, equation, table_of_contents, column_list, column, breadcrumb, heading1-3

### 15.6 Branches
**Prefix:** /workspaces/<ws>/branches

| Method | Path | Rate | Notes |
|--------|------|------|-------|
| GET | /workspaces/<ws>/branches | STANDARD | List |
| POST | /workspaces/<ws>/branches | STRICT | Create |
| GET | /workspaces/<ws>/branches/<bid> | STANDARD | Get |
| PATCH | /workspaces/<ws>/branches/<bid> | STRICT | Update |
| DELETE | /workspaces/<ws>/branches/<bid> | DESTRUCTIVE | Delete |
| POST | /workspaces/<ws>/branches/<bid>/merge | DESTRUCTIVE | Cloud-only |
| POST | /workspaces/<ws>/branches/merge | DESTRUCTIVE | Merge by IDs |
| GET | /workspaces/<ws>/branches/merge-conflicts | STANDARD | Cloud-only |
| PATCH | /workspaces/<ws>/branches/merge-conflicts/<cid>/resolve | STRICT | Cloud-only |

### 15.7 Versions / Changesets / Snapshots
**Prefix:** /workspaces/<ws>/versions

**Changesets:** GET, POST, GET <cs_id>, DELETE <cs_id>
**Snapshots:** GET, POST, GET <snap_id>, DELETE <snap_id>, POST entity/<eid>/snapshot
**Entity/Block Versions:** GET entities/<eid>, GET blocks/<bid>, GET compare, POST <vid>/restore

### 15.8 Diffs
**Prefix:** /workspaces/<ws>/diffs
| GET /diffs/compare | STANDARD | Compare versions/snapshots/branches |
| POST /diffs/blocks | STRICT | Compare two blocks/versions |

### 15.9 Relations
**Prefix:** /workspaces/<ws>/relations

| Method | Path | Rate | Notes |
|--------|------|------|-------|
| GET | /workspaces/<ws>/relations/ | STANDARD | Filter by entity/target/type |
| POST | /workspaces/<ws>/relations/ | STRICT | Create (validates self-ref) |
| GET | /workspaces/<ws>/relations/<rid> | STANDARD | Get |
| PATCH | /workspaces/<ws>/relations/<rid> | STRICT | Update |
| DELETE | /workspaces/<ws>/relations/<rid> | STRICT | Soft-delete |
| POST | /workspaces/<ws>/relations/<rid>/restore | STRICT | Restore |
| GET | /workspaces/<ws>/relations/entity/<eid> | STANDARD | Outgoing |
| GET | /workspaces/<ws>/relations/backlinks/<eid> | STANDARD | Incoming |
| GET | /workspaces/<ws>/relations/neighbors/<eid> | STANDARD | All neighbors |
| GET | /workspaces/<ws>/relations/path | STANDARD | Shortest path |
| POST | /workspaces/<ws>/relations/batch | STRICT | Batch create |

### 15.10 Tags
**Prefix:** /workspaces/<ws>/tags
| GET /tags/ | STANDARD | List |
| POST /tags/ | STRICT | Create |
| GET /tags/<tid> | STANDARD | Get |
| PATCH /tags/<tid> | STRICT | Update |
| DELETE /tags/<tid> | STRICT | Delete |
| POST /tags/<tid>/entities/<eid> | STRICT | Tag entity |
| DELETE /tags/<tid>/entities/<eid> | STRICT | Untag entity |

### 15.11 Properties
**Prefix:** /workspaces/<ws>/properties
| GET /properties/ | STANDARD | List |
| POST /properties/ | STRICT | Create (admin) |
| GET /properties/<pid> | STANDARD | Get |
| PATCH /properties/<pid> | STRICT | Update (admin) |
| DELETE /properties/<pid> | STRICT | Delete (admin) |
**Types (12):** text, number, date, select, multi_select, checkbox, url, email, phone, rich_text, boolean, entity_ref

### 15.12 Files
**Prefix:** /workspaces/<ws>/files
| GET /files | STANDARD | List |
| POST /files/upload | FILE_UPLOAD | Upload with validation |
| POST /files | STRICT | Create metadata |
| GET /files/<fid> | STANDARD | Get metadata |
| GET /files/<fid>/download | FILE_DOWNLOAD | Download |
| GET /files/<fid>/thumbnail|preview|optimized | STANDARD | Variants |
| DELETE /files/<fid> | STRICT | Soft-delete |
| POST /files/<fid>/entities/<eid> | STRICT | Link to entity |
| DELETE /files/<fid>/entities/<eid> | STRICT | Unlink |
| POST /files/presign* | STRICT/FILE_UPLOAD | Cloud presign |
| POST /files/cleanup-* | STRICT | Orphan/quarantine/deleted cleanup |
| GET /files/storage-info | STANDARD | Usage stats |

### 15.13 Search
**Prefix:** /workspaces/<ws>/search
| GET /search | STANDARD | Full-text search (?q=) |
| POST /search/rebuild-index | STRICT | Rebuild search index |
| GET /search/suggest | STANDARD | Search suggestions |
**Architecture:** Local = FTS5, Cloud = PostgreSQL tsvector with GIN index

### 15.14 Graph
**Prefix:** /workspaces/<ws>/graph
| GET /graph/ | STANDARD | Query with depth/filters |
| POST /graph/materialize | STRICT | Build graph snapshot |
| POST /graph/query | STRICT | Filtered query |
| POST /graph/traverse | STRICT | BFS traversal (max depth 5) |
| POST /graph/paths | STRICT | Shortest path |
| GET /graph/search | STANDARD | Search graph entities |

### 15.15 Backups & Export
**Prefix:** /workspaces/<ws>/backups
| GET /backups | STANDARD | List |
| POST /backups/export | STRICT | JSON export |
| POST /backups/create | DESTRUCTIVE | Encrypted .gnv |
| POST /backups/<filename>/restore | DESTRUCTIVE | Restore |
| POST /backups/import | DESTRUCTIVE | Import JSON |
| POST /backups/export-markdown | STRICT | Markdown export |
| POST /backups/export-zip | STRICT | ZIP export |
| POST /backups/export-html | STRICT | HTML export |
| POST /backups/export-pdf | STRICT | PDF export |
| POST /backups/export-zip-encrypted | STRICT | Encrypted .gnv |
| POST /backups/import-zip | DESTRUCTIVE | Import encrypted .gnv |
| GET /backups/download-zip/<filename> | STRICT | Download ZIP |
**Formats:** JSON, Markdown+YAML, HTML, PDF, ZIP, Encrypted .gnv (AES+HMAC)

### 15.16 Sync
**Prefix:** /workspaces/<ws>/sync
| GET /sync | STANDARD | List operations |
| POST /sync | STRICT | Create operation |
| POST /sync/<op>/ack | STRICT | Acknowledge |
| POST /sync/diff | STRICT | Diff local vs remote |
| POST /sync/apply-diff | STRICT | Apply diff |
| POST /sync/sync-from-export | STRICT | Import from export |
| POST /sync/push | STRICT | Push to cloud |
| POST /sync/pull | STANDARD | Pull from cloud |
| POST /sync/full-sync | STRICT | Bidirectional sync |
| GET /sync/status | STANDARD | Sync status |
| GET /sync/changes | STANDARD | Local diff |
| POST /sync/conflicts/<cid>/resolve | STRICT | Resolve conflict |

### 15.17 Activity
**Prefix:** /workspaces/<ws>/activity
| GET /activity | STANDARD | Filter by entity/action/user/date |
| GET /activity/events | STANDARD | Filter by entity/changeset |

### 15.18 Notifications
**Prefix:** /workspaces/<ws>/notifications
| GET /notifications | STANDARD | List (unread_only?) |
| POST /notifications | STRICT | Create |
| POST /notifications/<nid>/read | STRICT | Mark read |
| POST /notifications/<nid>/dismiss | STRICT | Dismiss |
| POST /notifications/read-all | STRICT | Mark all read |
| GET /notifications/unread-count | LENIENT | Unread count |
**Types (15):** mention, comment, update, entity_update, invite, relation_created, backup_complete, sync_conflict, system, share, version_created, export_complete, import_complete, governance_report_ready, system_alert

### 15.19 Settings
**Prefix:** /workspaces/<ws>/settings
| GET /settings/<category> | STANDARD | Get category |
| PUT /settings/<category> | STRICT | Update category |
| PATCH /settings | STRICT | Multi-category |
| GET /settings | STANDARD | All |
| POST /settings/reset | STRICT | Reset |
**Categories (10):** general, editor, appearance, ai, performance, backups, privacy, sync, keyboard_shortcuts, advanced

### 15.20 Dashboard
**Prefix:** /workspaces/<ws>/dashboard
| GET /dashboard/overview | LENIENT | Counts + recent (TTL 60s cache) |
| GET /dashboard/storage | STANDARD | Storage stats |

### 15.21 AI (All 501 Not Implemented)
**Prefix:** /workspaces/<ws>/ai
| POST /ai/query, /ai/suggest-relations, /ai/summarize, /ai/chat, /ai/complete, /ai/embed, /ai/semantic-search | STRICT | All return 501 |

### 15.22 Docs
**Prefix:** /docs
| GET /docs/ | STANDARD | API documentation JSON (208+ endpoints) |

### 15.23 Root Endpoints
| GET /metrics | Public | Prometheus metrics |
| GET /health | Public | Health check (DB, Redis, pool) |

---

## 16. Request/Response Format

### Success Responses
```json
// Single item: {"data": {...}}
// List: {"data": [...], "meta": {"page": 1, "per_page": 30, "total": 100, "pages": 4}}
// No content: {"data": null}
```

### Error Responses
```json
{"error": {"code": "validation_error", "message": "...", "details": {...}, "request_id": "abc"}}
```

### Pagination
- Query params: ?page=1&per_page=30 (default 30, max 100)

### Input Sanitization
All JSON body strings recursively sanitized: control characters stripped, HTML dangerous tags removed, URLs restricted to http/https, filename path traversal rejected.

---

## 17. Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | bad_request | Generic bad request |
| 400 | cloud_only | Endpoint only available in cloud mode |
| 400 | auth_disabled | Local auth is disabled |
| 400 | invalid_email | Email validation failed |
| 400 | invalid_file_type | File type not allowed |
| 400 | code_already_used | Auth code already consumed |
| 400 | code_expired | Auth code has expired |
| 400 | decryption_failed | Decryption of backup failed |
| 400 | quota_exceeded | Storage quota exceeded |
| 401 | unauthorized | Authentication required |
| 401 | token_expired | JWT token has expired |
| 401 | invalid_token | Token is invalid |
| 401 | token_revoked | Token has been revoked |
| 401 | account_locked | Account locked (brute force) |
| 401 | invalid_credentials | Email/password mismatch |
| 403 | forbidden | Insufficient permissions |
| 404 | not_found | Resource not found |
| 409 | conflict | Resource already exists |
| 413 | payload_too_large | Request body exceeds limit (100MB max) |
| 415 | unsupported_media_type | Unsupported content type |
| 422 | validation_error | Schema validation failed |
| 429 | rate_limit_exceeded | Rate limit hit |
| 500 | internal_error | Unexpected server error |
| 501 | not_implemented | Feature not yet implemented |
| 502 | bad_gateway | Upstream service error |
| 503 | service_degraded | Dependency unavailable |

### Custom Exception Classes
ApiError (400+), NotFoundError (404), ForbiddenError (403), ConflictError (409), UnauthorizedError (401), ValidationError (422), RateLimitError (429), NotImplementedError (501), BadGatewayError (502), PayloadTooLargeError (413), InternalError (500), ServiceDegradedError (503), AccountLockedError (401), WrongTokenError (401)

---

## 18. Rate Limiting

| Constant | Value | Endpoints |
|----------|-------|-----------|
| RATE_LIMIT_STRICT | 30/min | Writes, mutations |
| RATE_LIMIT_STANDARD | 120/min | General reads |
| RATE_LIMIT_LENIENT | 300/min | Dashboard, unread count |
| RATE_LIMIT_DESTRUCTIVE | 10/min | Deletes, permanent deletes |
| RATE_LIMIT_AUTH_WRITE | 5/min | Register, login |
| RATE_LIMIT_FILE_UPLOAD | 10/min | File uploads |
| RATE_LIMIT_FILE_DOWNLOAD | 60/min | File downloads |
| RATE_LIMIT_PASSWORD_RESET | 3/min | Forgot/reset password |
| RATELIMIT_DEFAULT (local) | 1200/min | Flask default (local) |
| RATELIMIT_DEFAULT (cloud) | 600/min | Flask default (cloud) |

**Storage:** Local mode uses memory://, cloud mode uses Redis.

---

## 19. Data Models -- SQLite (Local)

**29 local tables + 9 cloud-only stubs**

| # | Model | Table | Domain Differences |
|---|-------|-------|-------------------|
| 1 | User | users | No google_id, password_hash |
| 2 | Session | sessions | No deleted_by FK |
| 3 | AuthCode | auth_codes | Same structure |
| 4 | Workspace | workspaces | No cloud_workspace_id, JSON CHECK via json_valid() |
| 5 | EntityType | entity_types | Same structure |
| 6 | Entity | entities | No created_by FK |
| 7 | Block | blocks | Composite PK (id, branch_id, created_at), lft/rgt for nested sets |
| 8 | Property | properties | Table named properties (not entity_properties) |
| 9 | EntityPropertyValue | entity_property_values | Same structure |
| 10 | Relation | relations | No created_by FK |
| 11 | Tag | tags | Same structure |
| 12 | EntityTag | entity_tags | Same structure |
| 13 | Branch | branches | version has no server_default in local |
| 14 | Snapshot | snapshots | Same structure |
| 15 | Changeset | changesets | Same structure |
| 16 | EntityVersion | entity_versions | Same structure |
| 17 | BlockVersion | block_versions | Same structure |
| 18 | EntityBranchHead | entity_branch_heads | Uses block_id/block_created_at instead of version_id |
| 19 | EntityEvent | entity_events | Same structure |
| 20 | File | file_records | storage_provider defaults to 'local', no object_lock |
| 21 | EntityFile | entity_files | Same structure |
| 22 | Embedding | embeddings | embedding stored as TEXT (not VECTOR) |
| 23 | SearchDocument | search_documents | search_vector stored as TEXT (not TSVECTOR) |
| 24 | SyncOperation | sync_operations | No entity_id as FK |
| 25 | GraphMaterialization | graph_materializations | Same structure |
| 26 | Notification | notifications | Type CHECK limited to 6 types (not 15) |
| 27 | ActivityLog | activity_entries | Extra block_id column |
| 28 | AuthCode | auth_codes | Same structure |
| 29 | WorkspaceMember | workspace_members | Cloud-only stub in local mode |

**Cloud-only stubs:** BranchMerge, Comment, CommentReaction, FileVariant, GovernanceReport, Invite, Job, MergeConflict, WorkspaceMember

**Mixins:** UUIDPrimaryKeyMixin, TimestampMixin, CreatedOnlyMixin, SoftDeleteMixin

---

## 20. SQL Schema -- SQLite

**Source:** SQLITE_SCHEMA.sql (828 lines)

**Pragmas:** journal_mode=WAL, synchronous=NORMAL, recursive_triggers=OFF, foreign_keys=ON

### Table Details

#### 1. users
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| email | TEXT | NOT NULL, UNIQUE |
| name | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **Indexes:** idx_users_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 2. auth_codes
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| code | TEXT | NOT NULL, UNIQUE |
| user_id | VARCHAR(36) | NOT NULL, FK -> users(id) ON DELETE CASCADE |
| expires_at | DATETIME | NOT NULL |
| consumed_at | DATETIME | |
| redirect_uri | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** user_id -> users(id) ON DELETE CASCADE
- **Indexes:** idx_auth_codes_user_id ON (user_id), idx_auth_codes_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_auth_codes_code UNIQUE ON (code) WHERE consumed_at IS NULL

#### 3. sessions
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| user_id | VARCHAR(36) | NOT NULL, FK -> users(id) ON DELETE CASCADE |
| jti | TEXT | |
| refresh_jti | TEXT | NOT NULL, UNIQUE |
| user_agent | TEXT | |
| ip_address | TEXT | |
| revoked_at | DATETIME | |
| expires_at | DATETIME | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** user_id -> users(id) ON DELETE CASCADE
- **Indexes:** idx_sessions_user_active ON (user_id, expires_at) WHERE revoked_at IS NULL, idx_sessions_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 4. workspaces
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| owner_id | VARCHAR(36) | NOT NULL, FK -> users(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| icon | TEXT | |
| color | TEXT | |
| description | TEXT | |
| settings | JSON | DEFAULT '{}', CHECK json_valid(settings) |
| deployment_mode | TEXT | DEFAULT 'local', CHECK IN ('local','cloud') |
| sync_enabled | BOOLEAN | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** owner_id -> users(id) ON DELETE CASCADE
- **Constraints:** ck_workspace_settings CHECK json_valid(settings), ck_workspace_deployment_mode CHECK deployment_mode IN ('local','cloud')
- **Indexes:** uq_workspaces_owner_active UNIQUE ON (owner_id) WHERE is_deleted=0, idx_workspaces_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 5. entity_types
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| slug | TEXT | DEFAULT '', NOT NULL |
| icon | TEXT | |
| description | TEXT | |
| color | TEXT | |
| config | JSON | DEFAULT '{}', CHECK json_valid(config) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE
- **Constraints:** ck_entity_type_config CHECK json_valid(config)
- **Indexes:** idx_entity_types_workspace ON (workspace_id), uq_entity_types_workspace_name UNIQUE ON (workspace_id, name) WHERE is_deleted=0, idx_entity_types_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 6. entities
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| entity_type_id | VARCHAR(36) | NOT NULL, FK -> entity_types(id) ON DELETE RESTRICT |
| name | TEXT | |
| icon | TEXT | |
| color | TEXT | |
| cover_image | TEXT | |
| parent_id | VARCHAR(36) | FK -> entities(id) ON DELETE SET NULL |
| sort_order | INTEGER | DEFAULT 0 |
| summary | TEXT | |
| is_favorite | BOOLEAN | DEFAULT 0 |
| is_archived | BOOLEAN | DEFAULT 0, NOT NULL |
| archived_at | DATETIME | |
| block_count | INTEGER | DEFAULT 0 |
| created_by | VARCHAR(36) | |
| version | INTEGER | DEFAULT 1, NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, entity_type_id -> entity_types(id) ON DELETE RESTRICT, parent_id -> entities(id) ON DELETE SET NULL
- **Indexes:** idx_entities_workspace_active ON (workspace_id) WHERE is_deleted=0, idx_entities_type ON (entity_type_id) WHERE is_deleted=0, idx_entities_archived ON (archived_at) WHERE archived_at IS NOT NULL AND is_deleted=0, idx_entities_parent ON (parent_id) WHERE is_deleted=0, idx_entities_deleted_at ON (deleted_at) WHERE is_deleted=1, ix_entities_parent_id ON (parent_id)

#### 7. blocks (Composite PK)
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK (part 1), DEFAULT lower(hex(randomblob(16))), NOT NULL, UNIQUE |
| branch_id | VARCHAR(36) | PK (part 2), DEFAULT '00000000-0000-0000-0000-000000000003', NOT NULL, FK -> branches(id) ON DELETE CASCADE |
| created_at | DATETIME | PK (part 3), DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| parent_block_id | VARCHAR(36) | FK -> blocks(id) ON DELETE SET NULL |
| lft | INTEGER | DEFAULT 0, NOT NULL |
| rgt | INTEGER | DEFAULT 0, NOT NULL |
| type | TEXT | NOT NULL |
| content | JSON | DEFAULT '{}', NOT NULL, CHECK json_valid(content) |
| properties | JSON | DEFAULT '{}', CHECK json_valid(properties) |
| position | NUMERIC(20,10) | NOT NULL |
| indent | INTEGER | DEFAULT 0, NOT NULL |
| moved_at | DATETIME | |
| content_hash | TEXT | DEFAULT '', NOT NULL |
| version | INTEGER | DEFAULT 1, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id, branch_id, created_at) -- composite
- **FK:** entity_id -> entities(id) ON DELETE CASCADE, branch_id -> branches(id) ON DELETE CASCADE, parent_block_id -> blocks(id) ON DELETE SET NULL
- **Constraints:** ck_block_content CHECK json_valid(content), ck_block_properties CHECK json_valid(properties)
- **Indexes:** idx_blocks_parent_block ON (parent_block_id), idx_blocks_current ON (entity_id, branch_id, position) WHERE is_deleted=0, uq_blocks_entity_position UNIQUE ON (entity_id, branch_id, position) WHERE is_deleted=0, idx_blocks_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_blocks_entity_branch_active ON (entity_id, branch_id) WHERE is_deleted=0, idx_blocks_entity_active ON (entity_id) WHERE is_deleted=0

#### 8. search_documents
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| block_id | VARCHAR(36) | FK -> blocks(id) |
| title | TEXT | |
| content | TEXT | |
| content_hash | TEXT | DEFAULT '', NOT NULL |
| search_vector | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, entity_id -> entities(id) ON DELETE CASCADE, block_id -> blocks(id)
- **Indexes:** idx_search_documents_workspace ON (workspace_id) WHERE is_deleted=0, uq_search_documents_workspace_entity UNIQUE ON (workspace_id, entity_id) WHERE is_deleted=0, idx_search_documents_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 9. properties
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| entity_type_id | VARCHAR(36) | FK -> entity_types(id) ON DELETE RESTRICT |
| name | TEXT | NOT NULL |
| type | TEXT | NOT NULL, CHECK IN ('text','number','date','select','multi_select','checkbox','url','email','phone','rich_text','boolean','entity_ref') |
| description | TEXT | |
| default_value | JSON | |
| required | BOOLEAN | DEFAULT 0 |
| options | JSON | DEFAULT '{}', CHECK json_valid(options) |
| config | JSON | DEFAULT '{}', CHECK json_valid(config) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, entity_type_id -> entity_types(id) ON DELETE RESTRICT
- **Constraints:** ck_property_type CHECK type IN (12 types), ck_property_options CHECK json_valid(options), ck_property_config CHECK json_valid(config)
- **Indexes:** idx_properties_workspace ON (workspace_id) WHERE is_deleted=0, idx_properties_deleted_at ON (deleted_at) WHERE is_deleted=1, uq_properties_workspace_name_type UNIQUE ON (workspace_id, name, type) WHERE is_deleted=0

#### 10. entity_property_values
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| property_id | VARCHAR(36) | NOT NULL, FK -> properties(id) ON DELETE CASCADE |
| value | JSON | DEFAULT '{}', NOT NULL, CHECK json_valid(value) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** entity_id -> entities(id) ON DELETE CASCADE, property_id -> properties(id) ON DELETE CASCADE
- **Constraints:** ck_epv_value CHECK json_valid(value)
- **Indexes:** idx_entity_property_values_deleted_at ON (deleted_at) WHERE is_deleted=1, uq_entity_property_values_active UNIQUE ON (entity_id, property_id) WHERE is_deleted=0, idx_entity_property_values_entity ON (entity_id) WHERE is_deleted=0

#### 11. relations
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| source_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| target_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| type | TEXT | NOT NULL |
| label | TEXT | |
| properties | JSON | DEFAULT '{}', CHECK json_valid(properties) |
| generated_by | TEXT | DEFAULT 'manual', NOT NULL, CHECK IN ('manual','ai') |
| verified | BOOLEAN | DEFAULT 1, NOT NULL |
| confidence | FLOAT | |
| ai_model | TEXT | |
| created_by | VARCHAR(36) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, source_id -> entities(id) ON DELETE CASCADE, target_id -> entities(id) ON DELETE CASCADE
- **Constraints:** no_self_relation CHECK (source_id != target_id), ck_relation_generated_by CHECK generated_by IN ('manual','ai'), ck_relation_properties CHECK json_valid(properties)
- **Indexes:** idx_relations_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_relations_source_active ON (source_id) WHERE is_deleted=0, idx_relations_target_active ON (target_id) WHERE is_deleted=0, uq_relations_active UNIQUE ON (workspace_id, source_id, target_id, type) WHERE is_deleted=0, idx_relations_workspace ON (workspace_id)

#### 12. tags
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| name | TEXT | NOT NULL |
| color | TEXT | |
| entity_count | INTEGER | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE
- **Indexes:** idx_tags_deleted_at ON (deleted_at) WHERE is_deleted=1, uq_tags_workspace_name UNIQUE ON (workspace_id, name) WHERE is_deleted=0, idx_tags_workspace ON (workspace_id) WHERE is_deleted=0

#### 13. entity_tags
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| tag_id | VARCHAR(36) | NOT NULL, FK -> tags(id) ON DELETE CASCADE |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** entity_id -> entities(id) ON DELETE CASCADE, tag_id -> tags(id) ON DELETE CASCADE
- **Indexes:** uq_entity_tags_active UNIQUE ON (entity_id, tag_id) WHERE is_deleted=0, idx_entity_tags_tag ON (tag_id) WHERE is_deleted=0, idx_entity_tags_entity ON (entity_id) WHERE is_deleted=0, idx_entity_tags_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 14. branches
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| parent_branch_id | VARCHAR(36) | FK -> branches(id) ON DELETE SET NULL |
| name | TEXT | NOT NULL |
| description | TEXT | |
| created_by | VARCHAR(36) | FK -> users(id) ON DELETE SET NULL |
| is_default | BOOLEAN | DEFAULT 0 |
| is_locked | BOOLEAN | DEFAULT 0 |
| version | INTEGER | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, parent_branch_id -> branches(id) ON DELETE SET NULL, created_by -> users(id) ON DELETE SET NULL
- **Indexes:** idx_branches_default ON (workspace_id, is_default) WHERE is_deleted=0, idx_branches_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_branches_workspace ON (workspace_id) WHERE is_deleted=0, idx_branches_parent_branch ON (parent_branch_id)

#### 15. snapshots
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| branch_id | VARCHAR(36) | NOT NULL, FK -> branches(id) ON DELETE CASCADE |
| name | TEXT | |
| description | TEXT | |
| metadata | JSON | DEFAULT '{}' |
| created_by | VARCHAR(36) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** branch_id -> branches(id) ON DELETE CASCADE
- **Indexes:** idx_snapshots_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_snapshots_branch_id ON (branch_id)

#### 16. changesets
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| branch_id | VARCHAR(36) | NOT NULL, FK -> branches(id) ON DELETE CASCADE |
| snapshot_id | VARCHAR(36) | FK -> snapshots(id) ON DELETE SET NULL |
| message | TEXT | |
| created_by | VARCHAR(36) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** branch_id -> branches(id) ON DELETE CASCADE, snapshot_id -> snapshots(id) ON DELETE SET NULL
- **Indexes:** idx_changesets_snapshot ON (snapshot_id), idx_changesets_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_changesets_branch ON (branch_id)

#### 17. entity_versions
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE RESTRICT |
| branch_id | VARCHAR(36) | FK -> branches(id) ON DELETE SET NULL |
| changeset_id | VARCHAR(36) | FK -> changesets(id) ON DELETE SET NULL |
| snapshot_id | VARCHAR(36) | FK -> snapshots(id) ON DELETE SET NULL |
| version | INTEGER | |
| message | TEXT | |
| snapshot | JSON | NOT NULL, CHECK json_valid(snapshot) |
| content_hash | TEXT | NOT NULL |
| created_by | VARCHAR(36) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** entity_id -> entities(id) ON DELETE RESTRICT, branch_id -> branches(id) ON DELETE SET NULL, changeset_id -> changesets(id) ON DELETE SET NULL, snapshot_id -> snapshots(id) ON DELETE SET NULL
- **Constraints:** ck_entity_version_snapshot CHECK json_valid(snapshot)
- **Indexes:** idx_entity_versions_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_entity_versions_changeset ON (changeset_id), idx_entity_versions_entity ON (entity_id)

#### 18. block_versions
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| block_id | VARCHAR(36) | NOT NULL, FK -> blocks(id) ON DELETE CASCADE |
| changeset_id | VARCHAR(36) | FK -> changesets(id) ON DELETE SET NULL |
| snapshot | JSON | NOT NULL |
| content_hash | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** block_id -> blocks(id) ON DELETE CASCADE, changeset_id -> changesets(id) ON DELETE SET NULL
- **Indexes:** idx_block_versions_block ON (block_id), idx_block_versions_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_block_versions_changeset ON (changeset_id)

#### 19. entity_events
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE RESTRICT |
| user_id | VARCHAR(36) | FK -> users(id) ON DELETE SET NULL |
| event_type | TEXT | NOT NULL |
| payload | JSON | NOT NULL, CHECK json_valid(payload) |
| changeset_id | VARCHAR(36) | FK -> changesets(id) ON DELETE SET NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, entity_id -> entities(id) ON DELETE RESTRICT, user_id -> users(id) ON DELETE SET NULL, changeset_id -> changesets(id) ON DELETE SET NULL
- **Constraints:** ck_entity_event_payload CHECK json_valid(payload)
- **Indexes:** idx_entity_events_workspace_entity ON (workspace_id, entity_id), idx_entity_events_workspace_created ON (workspace_id, created_at), idx_entity_events_workspace_type ON (workspace_id, event_type), idx_entity_events_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 20. file_records
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| file_name | TEXT | NOT NULL |
| mime_type | TEXT | |
| file_size | INTEGER | DEFAULT 0, NOT NULL |
| content_hash | TEXT | DEFAULT '', NOT NULL |
| storage_provider | TEXT | DEFAULT 'local', NOT NULL |
| state | TEXT | DEFAULT 'READY', NOT NULL |
| object_key | TEXT | NOT NULL |
| uploaded_by | VARCHAR(36) | |
| uploaded_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| has_extracted_text | BOOLEAN | DEFAULT 0 |
| has_metadata | BOOLEAN | DEFAULT 0 |
| extracted_text | TEXT | |
| metadata_json | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE
- **Indexes:** idx_files_pending ON (state, uploaded_at) WHERE state='PENDING' AND is_deleted=0, idx_files_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_files_state ON (state) WHERE is_deleted=0, uq_files_hash_active UNIQUE ON (workspace_id, content_hash) WHERE is_deleted=0, idx_files_workspace ON (workspace_id) WHERE is_deleted=0

#### 21. entity_files
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| file_id | VARCHAR(36) | NOT NULL, FK -> file_records(id) ON DELETE CASCADE |
| block_id | VARCHAR(36) | FK -> blocks(id) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** entity_id -> entities(id) ON DELETE CASCADE, file_id -> file_records(id) ON DELETE CASCADE, block_id -> blocks(id)
- **Indexes:** uq_entity_files_active UNIQUE ON (entity_id, file_id) WHERE is_deleted=0, idx_entity_files_file ON (file_id) WHERE is_deleted=0, idx_entity_files_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_entity_files_entity ON (entity_id) WHERE is_deleted=0, idx_entity_files_block ON (block_id)

#### 22. entity_branch_heads
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| branch_id | VARCHAR(36) | NOT NULL, FK -> branches(id) ON DELETE CASCADE |
| entity_id | VARCHAR(36) | NOT NULL, FK -> entities(id) ON DELETE CASCADE |
| current_block_id | VARCHAR(36) | |
| current_block_created_at | DATETIME | |
| base_block_id | VARCHAR(36) | |
| base_block_created_at | DATETIME | |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** branch_id -> branches(id) ON DELETE CASCADE, entity_id -> entities(id) ON DELETE CASCADE
- **Constraints:** uq_entity_branch_heads UNIQUE (branch_id, entity_id)
- **Indexes:** idx_entity_branch_heads_branch ON (branch_id), idx_entity_branch_heads_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_entity_branch_heads_entity ON (entity_id)

#### 23. embeddings
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| entity_id | VARCHAR(36) | FK -> entities(id) ON DELETE CASCADE |
| block_id | VARCHAR(36) | FK -> blocks(id) |
| model | TEXT | NOT NULL |
| embedding | TEXT | (stored as TEXT not VECTOR in local mode) |
| content_hash | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, entity_id -> entities(id) ON DELETE CASCADE, block_id -> blocks(id)
- **Indexes:** idx_embeddings_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_embeddings_workspace_entity ON (workspace_id, entity_id), idx_embeddings_workspace ON (workspace_id) WHERE is_deleted=0, idx_embeddings_block ON (block_id), idx_embeddings_entity ON (entity_id) WHERE is_deleted=0

#### 24. graph_materializations
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| graph_snapshot | JSON | NOT NULL |
| generated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| version_hash | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, NOT NULL |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE
- **Indexes:** idx_graph_materializations_workspace ON (workspace_id), idx_graph_materializations_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 25. notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| user_id | VARCHAR(36) | NOT NULL, FK -> users(id) ON DELETE CASCADE |
| entity_id | VARCHAR(36) | FK -> entities(id) ON DELETE CASCADE |
| type | TEXT | NOT NULL, CHECK IN ('update','entity_update','relation_created','backup_complete','sync_conflict','system') |
| title | TEXT | NOT NULL |
| body | TEXT | |
| data | JSON | |
| is_read | BOOLEAN | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, user_id -> users(id) ON DELETE CASCADE, entity_id -> entities(id) ON DELETE CASCADE
- **Constraints:** ck_notification_type CHECK type IN (6 local types)
- **Indexes:** idx_notifications_workspace ON (workspace_id), idx_notifications_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_notifications_user_unread ON (user_id) WHERE is_read=0 AND is_deleted=0, idx_notifications_entity ON (entity_id) WHERE is_deleted=0

#### 26. activity_entries
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| user_id | VARCHAR(36) | FK -> users(id) ON DELETE SET NULL |
| entity_id | VARCHAR(36) | FK -> entities(id) ON DELETE RESTRICT |
| block_id | VARCHAR(36) | FK -> blocks(id) (extra column in local) |
| display_name | TEXT | |
| action | TEXT | NOT NULL |
| resource_type | TEXT | |
| resource_id | TEXT | |
| details | JSON | NOT NULL, CHECK json_valid(details) |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE, user_id -> users(id) ON DELETE SET NULL, entity_id -> entities(id) ON DELETE RESTRICT, block_id -> blocks(id)
- **Constraints:** ck_activity_details CHECK json_valid(details)
- **Indexes:** idx_activity_log_workspace ON (workspace_id, created_at), idx_activity_entries_deleted_at ON (deleted_at) WHERE is_deleted=1

#### 27. sync_operations
| Column | Type | Constraints |
|--------|------|-------------|
| id | VARCHAR(36) | PK, DEFAULT lower(hex(randomblob(16))), NOT NULL |
| workspace_id | VARCHAR(36) | NOT NULL, FK -> workspaces(id) ON DELETE CASCADE |
| operation_type | TEXT | NOT NULL |
| entity_type | TEXT | |
| entity_id | VARCHAR(36) | |
| payload | JSON | NOT NULL, CHECK json_valid(payload) |
| device_id | TEXT | |
| client_clock | INTEGER | |
| synced | BOOLEAN | DEFAULT 0 |
| retry_count | INTEGER | NOT NULL |
| error_message | TEXT | |
| synced_at | DATETIME | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| is_deleted | BOOLEAN | DEFAULT 0, NOT NULL |
| deleted_at | DATETIME | |
| deleted_by | VARCHAR(36) | |
- **PK:** (id)
- **FK:** workspace_id -> workspaces(id) ON DELETE CASCADE
- **Constraints:** ck_sync_payload CHECK json_valid(payload)
- **Indexes:** idx_sync_operations_deleted_at ON (deleted_at) WHERE is_deleted=1, idx_sync_operations_workspace_synced ON (workspace_id, synced) WHERE is_deleted=0

### FTS5 Virtual Tables
- blocks_fts(entity_id UNINDEXED, type UNINDEXED, content, text) -- content-synced with blocks table
- search_documents_fts(entity_id UNINDEXED, title, content) -- content-synced with search_documents table

### Triggers (7 total)
| Trigger | Timing | Action |
|---------|--------|--------|
| blocks_ai | AFTER INSERT ON blocks | INSERT INTO blocks_fts(rowid, entity_id, type, content) VALUES (NEW.rowid, NEW.entity_id, NEW.type, json_extract(NEW.content, '$.text')) |
| blocks_ad | AFTER DELETE ON blocks | INSERT INTO blocks_fts(blocks_fts, rowid, entity_id, type, content) VALUES ('delete', OLD.rowid, OLD.entity_id, OLD.type, json_extract(OLD.content, '$.text')) |
| blocks_au | AFTER UPDATE ON blocks WHEN NEW.is_deleted=1 AND OLD.is_deleted=0 | Remove from FTS index |
| blocks_au_content | AFTER UPDATE ON blocks WHEN NEW.is_deleted=0 | Re-index: delete old then insert new |
| search_documents_ai | AFTER INSERT ON search_documents | Insert into search_documents_fts |
| search_documents_ad | AFTER DELETE ON search_documents | Remove from search_documents_fts |
| search_documents_au | AFTER UPDATE ON search_documents WHEN NEW.is_deleted=1 AND OLD.is_deleted=0 | Remove from search_documents_fts |

### Seed Data
- User: local@gnovium.local (id: 'local')
- Workspace: "My Workspace" (id: 00000000-0000-0000-0000-000000000001)
- Entity Type: "Page" (id: 00000000-0000-0000-0000-000000000002)
- Branch: "main", is_default=1 (id: 00000000-0000-0000-0000-000000000003)

### PostgreSQL Schema Differences
- 36 Tables in POSTGRESQL_SCHEMA.sql (1182 lines)
- Extensions: uuid-ossp, vector (pgvector), pg_trgm, pgcrypto
- VECTOR(1024) on embeddings, TSVECTOR on search_documents with GIN index
- deleted_by FK columns, full updated_at triggers on 18 tables
- BRIN index on activity_entries.created_at
- Cloud-only tables: workspace_members, branch_merges, merge_conflicts, file_variants, invites, comments, comment_reactions, governance_reports, jobs

---

## 21. API Schemas

All schemas use marshmallow with unknown = EXCLUDE to reject extra fields.

### Auth Schemas
RegisterSchema (email, password 8-128 with regex, name?), LoginSchema (email, password), AuthorizeSchema (redirect_uri, state?, workspace_id?), ExchangeCodeSchema (code, redirect_uri?), ChangePasswordSchema (old_password, new_password), ForgotPasswordSchema (email), ResetPasswordSchema (token, new_password), GoogleLoginSchema (credential)

### Domain Input Schemas
WorkspaceCreateSchema, EntityTypeCreateSchema, PropertyCreateSchema (12 types), EntityCreateSchema (with properties validation), BlockCreateSchema (content validated by type), RelationCreateSchema (with generated_by and type constraints), BranchCreateSchema, MergeBranchSchema, SnapshotCreateSchema, ChangesetCreateSchema, SearchQuerySchema (with mode: keyword/full_text/hybrid/semantic), FileCreateSchema, NotificationCreateSchema, CommentCreateSchema, SyncOperationCreateSchema, TagCreateSchema, GovernanceReportCreateSchema, DiffQuerySchema

### Output Schemas (Serialization)
30+ output schemas: UserSchema, SessionSchema, WorkspaceSchema, EntitySchema (with properties, block_count), BlockSchema (with version, indent), RelationSchema, FileSchema (with content_hash, state), BranchSchema, SnapshotSchema, ChangesetSchema, EntityVersionSchema, NotificationSchema, CommentSchema, ActivityEntrySchema, SyncOperationSchema, JobSchema, EmbeddingSchema, SearchDocumentSchema, GraphMaterializationSchema, and more.

---

## 22. Service Layer

| Service | Lines | Key Methods |
|---------|-------|-------------|
| AuthService | 429 | register, login, google_login, refresh, logout, get_profile, update_profile, change_password, generate_auth_code, authorize, exchange_code |
| BackupService | 298 | create_backup, list_backups, restore_backup, serialize, import_workspace |
| BlockService | 243 | list_by_entity, create, update, move, reorder, delete, restore |
| CommentService | 148 | create, list_by_entity, update, delete, restore |
| DashboardService | 136 | overview (cached), storage (stats) |
| EntityService | 567 | create_type, create_property, create, update, soft_delete, restore, get_children, archive, duplicate, permanent_delete |
| ExportService | 537 | export_workspace, export_to_disk, export_markdown, export_zip, export_secure_zip, import_secure_zip, export_html, export_pdf |
| FileService | 1195 | upload, create_metadata, download_file, delete_file, link_entity, unlink_entity, get_storage_info, presign_upload, presign_multipart, confirm_upload, resolve_quarantine, cleanup_orphans |
| GraphService | 354 | materialize, query_graph, traverse_graph, get_related_entities, find_shortest_path, search |
| RelationService | 192 | create, list_by_workspace, outgoing, backlinks, update, delete, restore, bulk_create |
| SearchService | 239 | search (FTS5/tsvector), rebuild_index, update_entity_search_document |
| SyncService | 1012 | ingest, mark_synced, sync_from_export, diff_workspaces, apply_diff, push, pull, full_sync, status, diff |
| TagService | 176 | list_by_workspace, get_entity_tags, create, update, delete, restore, tag_entity, untag_entity |
| VersioningService | 609 | get_version, list_versions, create_changeset, create_snapshot, snapshot_entity, merge, resolve_conflict, compare_versions/branches/snapshots |
| ZipService | -- | create_encrypted_zip, extract_encrypted_zip, encrypt_bytes (AES-GCM), decrypt_bytes, compute_hmac |
| StorageProvider | 530 | Abstract: store, retrieve, delete, exists, size, presign_upload, presign_download. LocalProvider: path traversal protection, variants. S3Provider: boto3, SSE-AES256, presigned URLs, multipart, object lock |

### Other Services
ActivityService, JobService, NotificationService, GovernanceService, EmbeddingService, WorkspaceService, WorkspaceMemberService, Security (current_user_id, secured decorator)

### Processing Pipeline
ProcessingPipeline (pipeline.py) + process_local_upload() + JobRunner (job_runner.py) + process_next_job()

### AI Service Modules (app/ai/)
agents.py, context_builder.py, embedding_service.py, inference.py, memory.py, prompt_builder.py, retriever.py, safety.py, service.py, tool_runtime.py

### Events Service
EventService: create(), list_by_entity(), list_by_workspace()

---

## 23. Repository Layer

All repositories extend BaseCRUDRepository from app/repositories/base.py:
get(id), list(filters, page, per_page, sort, order), create(data), update(id, data), delete(id, soft=True), query(), paginate(), count()

**35 Repositories:** UserRepository, SessionRepository, AuthCodeRepository, WorkspaceRepository, WorkspaceMemberRepository, EntityRepository, EntityTypeRepository, BlockRepository, BlockVersionRepository, EntityVersionRepository, EntityPropertyValueRepository, PropertyRepository, RelationRepository, TagRepository, EntityTagRepository, EntityFileRepository, FileRepository, FileVariantRepository, BranchRepository, SnapshotRepository, ChangesetRepository, EntityBranchHeadRepository, BranchMergeRepository, MergeConflictRepository, EntityEventRepository, NotificationRepository, SearchDocumentRepository, EmbeddingRepository, GraphMaterializationRepository, ActivityLogRepository, SyncOperationRepository, JobRepository, InviteRepository, CommentRepository, GovernanceReportRepository

**Mixins** (app/repositories/mixins.py): Soft-delete filtering, workspace scoping, user ownership checks

---

## 24. Configuration Reference

### Config Hierarchy
Config (base) -> LocalConfig | CloudConfig | TestingConfig -> CloudTestingConfig

### Base Config Key Variables
| Variable | Type | Default |
|----------|------|---------|
| GNOVIUM_MODE | str | local |
| SECRET_KEY | str | (empty) |
| JWT_SECRET_KEY | str | (empty) |
| JWT_ACCESS_TOKEN_EXPIRES | timedelta | 30 min |
| JWT_REFRESH_TOKEN_EXPIRES | timedelta | 30 days |
| SQLALCHEMY_DATABASE_URI | str | computed |
| CORS_ORIGINS | list | localhost:3000 |
| MAX_CONTENT_LENGTH | int | 100MB |
| LOCAL_AUTH_ENABLED | bool | False |
| LOCAL_STORAGE_QUOTA | int | 1GB |
| MAX_FILE_SIZE | int | 100MB |
| CLAMAV_ENABLED | bool | False |
| IMAGE_PROCESSING_ENABLED | bool | True |
| TEMP_EXPIRATION_DAYS | int | 7 |
| QUARANTINE_EXPIRATION_DAYS | int | 30 |
| BACKUP_RETENTION_DAYS | int | 30 |
| AUTH_CODE_EXPIRY_MINUTES | int | 5 |

### LocalConfig Overrides
GNOVIUM_MODE=local, SQLALCHEMY_DATABASE_URI=sqlite:///local.db, LOCAL_AUTH_ENABLED=True, SECRET_KEY and JWT_SECRET_KEY (dev defaults), RATELIMIT_DEFAULT=1200/min, RATELIMIT_STORAGE_URI=memory://

### CloudConfig Overrides
GNOVIUM_MODE=cloud, CORS_ORIGINS=gnovium.com domains, RATELIMIT_DEFAULT=600/min, RATELIMIT_STORAGE_URI=Redis, PREFERRED_URL_SCHEME=https, SESSION_COOKIE_SECURE=True, CACHE_TYPE=RedisCache

### Environment Files
.env (base) -> .env.local | .env.cloud | .env.cloud.dev | .env.production | .env.example

---

## 25. Middleware & Security

### Request Context Middleware
- Generates unique request_id (uuid4) per request
- Records request timing via MetricsCollector
- Adds security headers (CSP, HSTS, XSS)
- Tracks active connections

### Security Headers
| Header | Value |
|--------|-------|
| Content-Security-Policy | default-src 'self' |
| X-Content-Type-Options | nosniff |
| X-Frame-Options | DENY |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| X-XSS-Protection | 1; mode=block |
| Referrer-Policy | strict-origin-when-cross-origin |

### Input Validation & Sanitization
- Global before_request strips control characters from all JSON strings
- Marshmallow schemas with unknown = EXCLUDE
- HTML stripped of dangerous tags: script, iframe, object, embed, form, style, link, meta, base, applet, frame, frameset, ilayer, layer, bgsound, audio, video, canvas, svg
- Event handlers (on*) removed, only http/https protocols allowed
- Filename path traversal detection, special chars replaced with _

### Circuit Breaker
States: CLOSED -> OPEN -> HALF_OPEN -> CLOSED. failure_threshold=5, recovery_timeout=60s. Thread-safe with threading.Lock(). Used for S3 operations.

### Security Logging
SecurityLogger: auth_failure (WARNING), rate_limit_hit (INFO), csrf_failure (WARNING), suspicious_request (ERROR), privilege_escalation (CRITICAL)

### Logging Configuration
Framework: structlog. Format: JSON (default) or console. Level: configurable (default INFO). Sensitive data redaction: password|secret|token|jwt|authorization|api_key|api_secret|access_key|private_key replaced with ***REDACTED***

---

## 26. Monitoring & Metrics

### MetricsCollector
| Metric | Type | Description |
|--------|------|-------------|
| gnovium_requests_total | Counter | Request count by method/path/status |
| gnovium_request_duration_seconds | Histogram | Request duration (buckets: 0.001-10s) |
| gnovium_errors_total | Counter | Error count by type |
| gnovium_active_connections | Gauge | Active connections |
| gnovium_uptime_seconds | Gauge | Application uptime |

**Duration percentiles:** P50, P95, P99, min, max, avg
**DB Pool Status:** size, checked_in, checked_out, overflow

**GET /metrics** -- Prometheus text format
**GET /health** -- Returns service status with dependency checks (database, redis, db_pool)

---

## 27. File Storage Architecture

### Providers
| Provider | Mode | Backend | Key Features |
|----------|------|---------|--------------|
| LocalProvider | Local | Filesystem | Path traversal protection, variant generation, orphan cleanup |
| S3Provider | Cloud | AWS S3 | Presigned URLs, multipart upload, object lock, lifecycle rules, versioning |

### Object Key Structure
v1/objects/{variant}/{prefix1}/{prefix2}/{content_hash}{ext}
v1/quarantine/{reason}/{content_hash}
- variant: original, thumbnail, preview, optimized
- prefix1/prefix2: First 2 chars of hash for sharding
- content_hash: SHA-256 hex digest

### File States
PENDING (upload in progress) -> READY (complete) -> QUARANTINED (malware) -> DELETED (soft-delete)

### File Validation Pipeline
1. Extension check (ALLOWED_EXTENSIONS)
2. MIME type check (ALLOWED_MIMETYPES)
3. Magic byte validation (_validate_magic_bytes)
4. Malware scan (_scan_file_for_malware() -> clamscan)
5. Content hash dedup (SHA-256)
6. Storage quota check
7. Post-upload: image variants (WebP), PDF text extraction, metadata extraction

### Image Processing
- Input threshold: IMAGE_PROCESSING_THRESHOLD = 10MB
- Variants: thumbnail (max 256px), preview (max 1024px), optimized
- Format: WebP, Library: PIL (Pillow)

---

## 28. Sync Mechanism

### Architecture
```
Local App (SQLite + Electron) <--HTTP--> Cloud API (PostgreSQL)
  SyncService: push/pull/full_sync <--> SyncService: ingest/ack/sync_from_export
```

### Operation Flow
1. Push: Local changes -> POST /sync/push -> creates SyncOperation with client_clock
2. Pull: GET /sync/pull -> returns pending operations
3. Ack: POST /sync/<op>/ack -> marks operation as synced
4. Full Sync: POST /sync/full-sync -> bidirectional diff + apply

### Conflict Detection
- Tombstone: Entity deleted after client's last sync
- Staleness: client_clock < entity.updated_at
- Name collision: Duplicate name+type detection
- Resolution: source / target / manual (with merged_content)

### Sync Fields by Entity Type
entity_types (name, description, icon, color, config), tags (name, color, description), properties (name, type, description, required, options, metadata), entities (name, entity_type_id, icon, cover_image, is_archived, metadata), relations (source_id, target_id, type, properties), blocks (entity_id, type, content, parent_block_id, position, branch_id, metadata), comments (entity_id, content, block_id, parent_id)

---

## 29. Background Jobs & Processing

### Worker (worker.py)
Entry point for background job processing

### Scheduler (scheduler.py)
Scheduled task runner: backup cleanup, expired session cleanup, orphan file cleanup

### Job System (Cloud Only)
- Table: jobs. Statuses: pending, running, completed, failed, cancelled, dead_letter
- Priorities: critical, high, medium, low
- Idempotency: idempotency_key unique index
- Retries: configurable retry_count / max_retries

---

## 30. Testing

### Test Structure
tests/ (conftest.py, test_auth.py, test_blocks.py, test_dashboard.py, test_entities.py, test_files.py, test_misc.py, test_models.py, test_notifications.py, test_relations.py, test_services.py, test_versions.py, test_workspaces.py)
tests/cloud/ (conftest.py, test_admin.py, test_comments.py, test_governance.py, test_jobs.py, test_smoke.py, test_workspace_members.py)

### Test Configuration (TestingConfig)
- Database: SQLite in-memory (sqlite://)
- Rate limiting: Disabled
- Cache: NullCache
- Zip keys: Test-specific encryption/HMAC keys

### Running Tests
python -m pytest tests/ -x -q (standard)
python -m pytest tests/cloud/ -x -q (cloud)
python -m pytest tests/test_auth.py -x -v (single)

---

## 31. Scripts & Utilities

| Script | Path | Purpose |
|--------|------|---------|
| gen_api_doc.py | scripts/gen_api_doc.py | Generate API documentation |
| compare_api_specs.py | scripts/compare_api_specs.py | Compare API specs |
| compare_spec_vs_code.py | scripts/compare_spec_vs_code.py | Compare spec vs code |
| s3_create_folders.py | scripts/s3_create_folders.py | Create S3 folder structure |
| test_storage.py | scripts/test_storage.py | Storage provider tests |
| s3_migrate_prefix.py | s3_migrate_prefix.py | S3 prefix migration |
| pgadmin_connect.py | pgadmin_connect.py | pgAdmin connection helper |

---

## 32. Storage Architecture (Local App)

The GNOVIUM Electron app manages local file storage across three domains:
1. **Application data** -- user data directory containing settings, cache, SQLite, backup keys
2. **User files** -- file uploads, downloads, exports within allowed user directories
3. **Backups** -- encrypted workspace archives and export formats

All file system access is mediated through a path validation layer. The app communicates with a Flask backend at http://127.0.0.1:5001 (configurable via FLASK_HOST and FLASK_PORT).

### Path Validation
1. Requested path resolved to absolute path using path.resolve()
2. Resolved path must start with (or equal) one of the four allowed directories
3. If validation fails, a path error is thrown
4. Additional: filenames checked for path separators (/, \) and parent directory references (..)

### Handler Middleware
All IPC handlers pass through: 1) Logging middleware (channel, args, duration), 2) Rate-limit middleware (per-channel), 3) Auth-check middleware (verifies auth state)
Errors serialized to standard format with code, message, optional details.

### Settings Storage
Settings are stored as `settings.json` in the `userData` directory. Read/written directly via filesystem. Reads return empty object if file does not exist.

---

## 33. File Upload/Download Flow

### Upload Flow
1. Client requests file:upload via IPC with file path and optional workspace ID
2. Path validated through path validation layer
3. Filename checked for path separators
4. File size checked against 100 MB limit
5. File contents read from disk
6. Magic byte validation (first 16 bytes checked against known signatures: PNG, JPEG, GIF, WebP, PDF, ZIP, GZIP)
7. Detected MIME type checked against allowed list
8. Concurrent upload slot acquired (max 10)
9. Multipart form request sent to Flask upload endpoint with Bearer token
10. Response returned to renderer, upload slot released

### Download Flow
1. Client requests file:download via IPC with file ID and optional save path
2. File ID validated as UUID v4
3. GET request sent to Flask download endpoint with Bearer token
4. Response body read as ArrayBuffer
5. If save path: buffer written to validated path; if not: returned as base64

### File Upload Limits
- Max concurrent uploads: 10
- Max file size: 100 MB
- Magic bytes validated: first 16 bytes against known signatures (PNG, JPEG, GIF, WebP, PDF, ZIP, GZIP)
- Allowed MIME types (client-side): image/png, image/jpeg, image/gif, image/webp, image/svg+xml, application/pdf, application/zip, application/gzip, text/plain, text/markdown, text/csv, text/html, application/json, application/xml, video/mp4, video/webm, video/quicktime, audio/mpeg, audio/wav, audio/ogg

### Request Retry
Flask API requests have exponential backoff retry logic:
- Up to 3 retries
- Initial delay: 500ms, doubled each attempt
- Retryable: HTTP 429 (rate limited) and 5xx (server errors)
- Request body limited to 10 MB
- Request timeout: 30 seconds

---

## 34. Export and Backup Tiers

### Tier 1: JSON Export
Full workspace serialized to JSON. All entities, blocks, relations, tags, properties, comments, files, links. Written to <instance_path>/exports/json/.

### Tier 2: ZIP Export
Markdown representations of every entity plus uploaded file assets in a standard ZIP. Contains one .md file per entity with YAML front matter, assets/ directory, _index.json manifest.

### Tier 3: Encrypted .gnv Archive
Password-free, encrypted workspace backup using AES-256-GCM encryption and HMAC-SHA256 signing. Key stored via Electron safeStorage.
- Encryption: AES-256-GCM with random 12-byte IV and 16-byte auth tag
- Key derivation: scrypt with random 16-byte salt
- Integrity: HMAC-SHA256 of AES ciphertext using separate derived key
- Format: Binary file with magic header, encrypted data, HMAC signature
- Source tracking: Each archive tagged with creating mode (local or cloud)
- Content: Full workspace data including file binaries from local storage

### Tier 4: HTML Export
Single entity as standalone HTML page with inline CSS. File assets embedded as base64 data URIs.

### Tier 5: PDF Export
Generated from HTML. Tries: wkhtmltopdf -> chromium-browser -> WeasyPrint (fallback). If unavailable, HTML file provided as fallback.

### Backup File Naming
- JSON: workspace_{workspace_id}_{timestamp}.json
- Encrypted: backup_{workspace_id}_{timestamp}.gnv
- ZIP: workspace_{workspace_id}_{timestamp}.zip

### Auto-Backup
Timer started via backup:start-timer with interval from settings (default 24h). On each tick, reads settings, fetches all workspaces, exports each one. Timer stopped via backup:stop-timer. Errors logged but do not stop timer.

---

## 35. Encryption Model

### Backup Key Rotation
Backup encryption keys managed through Electron safeStorage API (OS-level encryption):
1. Keys stored in backup-keys.json inside userData, encrypted with safeStorage.encryptString()
2. On first access, new 32-byte random key generated and saved
3. Key rotation: current encrypted key saved to backup-keys.json.old, new key generated and saved
4. Key format: 32 bytes of cryptographically random data, hex-encoded

### Client-Side Encryption (Password-Based)
- Algorithm: AES-256-GCM
- Key derivation: scrypt with random 16-byte salt
- IV: Random 12 bytes per encryption
- Auth tag: 16 bytes appended to ciphertext
- Storage format: salt (16) + iv (12) + authTag (16) + ciphertext (variable)
- Password change: decrypt with old password, re-encrypt with new password

### Auth Token Encryption
Tokens stored in userData/auth.json encrypted with safeStorage. Written after initial auth and each refresh. Automatic refresh scheduled 5 min before expiry. On refresh failure, tokens cleared. On logout, auth file deleted.

---

## 36. Security Architecture

### Electron App Security
- Content Security Policy (CSP): default-src 'self'
- IPC allowlist: only predefined channels
- Protocol handler validation (gnovium-auth://)
- Path traversal protection
- Secure file access sandbox (4 allowed directories)
- Model integrity verification (hash check)
- Optional backup encryption (AES-256)
- Sandboxed renderer, Context Isolation enforced
- Node Integration disabled
- safeStorage for auth tokens (encrypted auth.json, never in renderer)
- Rate limiting on local Flask API
- Input sanitization

### Token Management
API tokens are held by an authentication service. All Flask API calls include the Bearer token when available.

### Backend Security
- Flask-JWT-Extended for JWT management
- JWT callbacks: token_in_blocklist_loader, user_lookup_loader, expired/invalid/unauthorized/revoked token loaders
- Brute force protection (5 attempts, 300s window)
- Security decorators: @secured, @cloud_only, @require_local_auth, @require_admin
- Circuit breaker for S3 operations (CLOSED/OPEN/HALF_OPEN)
- Security logging for auth failures, rate limits, CSRF, suspicious requests
- structlog with sensitive data redaction
- Rate limiting: 5 tiers (STRICT 30/min, STANDARD 120/min, LENIENT 300/min, DESTRUCTIVE 10/min, AUTH_WRITE 5/min)
- CORS hardening, CSRF protection

### Local File Deletion (Local Mode)
LocalFileRepository physically removes file data from disk on delete: main file from objects/original/{prefix}/{hash}, all variants from objects/thumbnail/, objects/preview/, objects/optimized/. Empty parent directories cleaned up.
In cloud mode, deletion is logical only -- S3 lifecycle rules handle physical cleanup.

---

## 37. Error Handling Strategy

- Graceful offline mode
- Database corruption recovery
- Model load failure fallback
- JWT expiry -> re-auth flow
- Sync conflict resolution UI (only when cloud sync enabled)
- Filesystem permission errors
- Backup/restore failure handling
- Global error boundary + crash reporting

### Logging & Diagnostics
- Log file naming: `gnovium-{timestamp}.log` in `userData/logs/`
- Application logs (structured, rotation, max 10 MB per file, 10 files max)
- Log buffer flushed to disk every 5 seconds
- Console output in development mode
- AI inference logs
- Sync operation logs
- IPC call logs
- Crash dumps (Electron crash reporter)
- Diagnostics export (for support)

---

## 38. AI Runtime Management

- Model loading on app start (Qwen2.5-3B + BGE-M3)
- Warmup sequence
- Memory usage monitoring & limits
- GPU detection (CUDA / Metal / DirectML) with CPU fallback
- Inference queue with priority
- Embedding cache (sqlite-vec)
- Cancellation support
- Streaming responses
- Separate inference & embedding workers

### Resource Requirements
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB (CPU fallback) | 8 GB+ |
| Disk | ~3.5 GB (models ~2.6 GB + data) | 10 GB+ |
| GPU | CPU-only | CUDA (NVIDIA), Metal (Apple), DirectML (Windows) |
| Model Sizes | Qwen2.5-3B Q4_K_M ~2.0 GB, BGE-M3 ~0.6-1.2 GB |

---

## 39. Background Services

| Worker | Purpose |
|--------|---------|
| Sync Worker | Personal cloud sync (same user across devices) [optional] |
| Embedding Worker | Generate/update embeddings in background |
| Graph Materializer | Build graph indices |
| Backup Worker | Scheduled auto-backup |
| Cleanup Worker | Orphans, old logs, temp files |
| Notification Worker | Process & deliver notifications |

All managed via Electron's utility processes or child processes with restart logic.

---

## 40. Electron Packaging & Distribution

| Platform | Format |
|----------|--------|
| Windows | .exe installer + portable |
| macOS | .dmg + .app (Apple Silicon + Intel) |
| Linux | .AppImage, .deb, .rpm |

- Auto-updater via GitHub releases (electron-updater)
- Code signing (Windows + macOS)
- Installer branding
- Portable / single executable option

---

## Appendix A: Implementation Priority (MVP -> Full)

### Phase 1 - Core
- Auth flow + secure token storage
- Workspace + Entity CRUD
- Block editor (basic blocks)
- Local Flask backend integration

### Phase 2 - Intelligence
- Graph view
- Relations + AI suggestions
- Search + Semantic

### Phase 3 - Versions
- Versioning (branches, snapshots, diffs)
- Full governance
- Sync engine (optional)

### Phase 4 - Polish
- Themes, shortcuts, performance tuning
- File viewer, export formats
- Packaging & distribution

---

## Appendix B: Search UI Features
- Search modes: keyword, full_text (FTS5), semantic, hybrid (default)
- Recent searches, advanced filters, suggestions/autocomplete
- Keyboard navigation, search history, result highlighting

---

## Appendix C: Graph UI Features
- Multiple layout algorithms (force-directed, hierarchical, radial)
- Node clustering/grouping, pinning nodes
- Export as image/PDF, focus/isolate mode
- Multi-selection tools, edge labels & types
- Legend & filters

---

## Appendix D: Notifications System
- Toast notifications + notification center
- Read/unread management, persistence across sessions
- Action buttons (e.g., "Open Entity")

---

## Appendix E: File Viewer & Preview
- Image viewer (zoom, pan, rotate)
- PDF viewer (embedded)
- Markdown preview, code syntax-highlighted preview
- Embedded file linking in blocks

---

## Appendix F: Performance Features
- Virtual scrolling in lists/editors
- Lazy loading of blocks/graph nodes
- Graph virtualization (viewport culling)
- Image & embedding caching
- Query result caching (TanStack Query)
- Pagination where applicable

> **END OF MERGED SPECIFICATION**