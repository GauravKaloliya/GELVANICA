# Gnovium Cloud Web — Application Specification (V1)

**Version:** 1.0
**Base URL:** `/api/v1`
**Deployment Modes:** `local` (SQLite) | `cloud` (PostgreSQL)
**Auth:** JWT Bearer tokens (access + refresh)
**Total Backend Endpoints:** 221
**Total Backend Tables:** 36 (29 core + 7 cloud-only)
**Date:** July 25, 2026
**Status:** Perfect parity with backend API.md v1.0.0 and POSTGRESQL_SCHEMA.sql

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Flask Application                         │
│  ┌─────────┐ ┌────────────┐ ┌──────────────────────────┐   │
│  │  Core   │ │ Middleware  │ │     API v1 Blueprints    │   │
│  │ Config  │ │ - Security │ │  (28 sub-blueprints)     │   │
│  │ Errors  │ │ - Request  │ │                          │   │
│  │ Logging │ │   Context  │ │  /auth, /workspaces,     │   │
│  │ Metrics │ └────────────┘ │  /admin, /docs           │   │
│  └─────────┘                └──────────┬───────────────┘   │
│       │                                │                    │
│       ▼                                ▼                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │                   Services                         │     │
│  │  27 service classes + 3 processing modules         │     │
│  └───────────────────────┬──────────────────────────┘     │
│                          │                                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Repositories (DAO Layer)               │     │
│  │  BaseCRUDRepository, DomainRepository,             │     │
│  │  LocalRepository, Mixins                           │     │
│  └───────────────────────┬──────────────────────────┘     │
│                          │                                │
│                          ▼                                │
│  ┌────────────────────────────────────────────────────┐     │
│  │               SQLAlchemy Models                     │     │
│  │  Domain (36 tables)  │  Local (29 tables)           │     │
│  └────────────────────────────────────────────────────┘     │
│              │                    │                         │
│              ▼                    ▼                         │
│        PostgreSQL              SQLite                       │
└─────────────────────────────────────────────────────────────┘
```

### Key Backend File Structure

| Path | Purpose |
|------|---------|
| `run.py` | Local mode entry point (Flask dev server, port 5000) |
| `wsgi.py` | Cloud/WSGI entry point (setdefault GNOVIUM_MODE) |
| `worker.py` | Background worker entry point |
| `scheduler.py` | Background scheduler entry point |
| `app/__init__.py` | Flask app factory: extensions, routes, error handlers, schema init |
| `app/extensions.py` | Flask extensions: db, jwt, cors, limiter, cache, redis |
| `app/core/config.py` | Config classes: Config, LocalConfig, CloudConfig, TestingConfig |
| `app/core/constants.py` | Allowed extensions/MIME types, rate limits, thresholds |
| `app/core/errors.py` | 30+ error code constants + 14 ApiError subclasses |
| `app/core/response.py` | Response helpers: ok, ok_list, error, error_response |
| `app/core/sanitization.py` | sanitize_html, sanitize_text, sanitize_filename, sanitize_url |
| `app/core/validation.py` | load_schema with sanitization |
| `app/core/serialization.py` | to_json, model_to_dict |
| `app/core/logging.py` | structlog configuration with sensitive data redaction |
| `app/core/security_logger.py` | SecurityLogger: auth failure, rate limit, CSRF, suspicious req |
| `app/core/circuit_breaker.py` | CircuitBreaker with HALF_OPEN/CLOSED/OPEN states |
| `app/core/schema_setup.py` | execute_pg_schema, execute_sqlite_schema |
| `app/middleware/security.py` | Security middleware: CSP, HSTS, XSS, CORS hardening |
| `app/middleware/request_context.py` | Request ID, timing, metrics recording |
| `app/monitoring.py` | MetricsCollector: Prometheus export, request tracking |
| `SQLITE_SCHEMA.sql` | Complete SQLite schema (29 tables, FTS5, triggers, seed data) |
| `POSTGRESQL_SCHEMA.sql` | Complete PostgreSQL schema (36 tables, extensions, triggers) |

### Cloud Web Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Next.js (App Router, Server Components) |
| Styling | Tailwind CSS v4 + shadcn/ui + Radix Primitives |
| State | TanStack Query v5 (server) + Zustand/Jotai (client) |
| Editor | Tiptap / BlockNote (block-based, extensible) |
| Graph | React Flow / Cytoscape.js (force-directed + spatial) |
| Animations | Framer Motion v12 + CSS transitions |
| Toasts | Sonner |
| Auth | NextAuth v5 + custom JWT (access + refresh) |
| API | REST (OpenAPI contract) + WebSocket (real-time) |
| Backend | Flask (Python) — shared with desktop client |
| Deployment | Vercel (primary) + Docker (self-hosted) |

---

## 2. Authentication & Authorization

### 2.1 JWT Token System

| Token | Duration | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 30 min (configurable) | `Authorization: Bearer <token>` | API auth |
| Refresh Token | 30 days (configurable) | `refresh_jti` in DB | Token refresh |

### 2.2 Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing / marketing redirect |
| `/auth` | Auth landing page with Sign In / Sign Up links |
| `/auth/sign-in` | Sign-in page (email/password, Google OAuth) |
| `/auth/sign-in?source=desktop` | Sign-in page for Electron desktop app (shows "Link Desktop App" heading) |
| `/auth/sign-up` | Sign-up page (name, email, password, avatar) |
| `/onboarding` | Post-registration workspace creation wizard |
| `/auth/callback` | OAuth callback handler |


### 2.3 Password Policy

| Rule | Detail |
|------|--------|
| Min length | 8 characters |
| Max length | 128 characters |
| Uppercase | Required (`(?=.*[A-Z])`) |
| Lowercase | Required (`(?=.*[a-z])`) |
| Digit | Required (`(?=.*\d)`) |
| Special char | Required (`(?=.*[@$!%*?&])`) |
| Allowed chars | `[A-Za-z\d@$!%*?&]` |

### 2.4 Brute Force Protection

| Mechanism | Details |
|-----------|---------|
| Max attempts | 5 (`MAX_LOGIN_ATTEMPTS`) |
| Window | 300 seconds (`LOGIN_WINDOW_SECONDS`) |
| Storage | In-memory dict (module-level) |
| Lockout error | `AccountLockedError` (code: `account_locked`) |
| Attempt tracking | `_get_login_attempts()`, `_record_login_attempt()`, `_clear_login_attempts()` |

### 2.5 Sign-In Flow

1. User navigates to `/auth/sign-in` (or `/auth` landing page → clicks "Sign In").
2. User enters email + password (or clicks Google OAuth).
3. Backend validates credentials, returns JWT access + refresh tokens.
4. If `?source=desktop` param present: after successful auth, generate one-time code via `POST /auth/exchange-code`, then redirect to `gnovium-auth://callback?code={code}`.
5. Tokens stored in Zustand persist (localStorage key: `gnovium-auth`).
6. Session restored on page load via `GET /auth/me`.
7. Silent token refresh via `POST /auth/refresh` when access token expires. Issues new access token, revokes old refresh token.
8. Google OAuth: if no account exists, auto-creates account from Google profile.

### 2.6 Desktop App Integration (Electron)

When the Electron desktop app needs to authenticate, it opens a BrowserWindow to `https://gnovium.com/auth/sign-in?source=desktop`.

**Detection:**
- The auth pages read `searchParams.get("source") === "desktop"` to detect Electron.
- When detected, the page shows a "Link Desktop App" heading instead of the standard heading.

**Code Exchange Flow:**
1. User authenticates on the cloud web (sign-in, sign-up, or Google OAuth).
2. After successful authentication, if `isDesktop` is true:
   a. Call `POST /auth/exchange-code` with the user's access token (authenticated).
   b. Cloud backend generates a UUID one-time code (5-min expiry, single use, stored in `auth_codes` table).
   c. Redirect to `gnovium-auth://callback?code={code}` (custom protocol registered by Electron).
3. Electron's protocol handler captures the code.
4. Electron main process exchanges code via `POST /auth/exchange` on local Flask backend.
5. Local Flask proxies to cloud backend for validation.
6. Cloud validates code, returns `{ access_token, refresh_token, token_type, expires_in, user }`.
7. Electron stores tokens encrypted in `auth.json` via OS-level safeStorage.

**Security:**
- The one-time code is single-use and expires in 5 minutes.
- The exchange-code endpoint requires authentication (Bearer token).
- The exchange endpoint is rate-limited (DESTRUCTIVE: 10/minute).
- Tokens never leave the Electron main process — renderer accesses via IPC only.

### 2.7 Sign-Up Flow

1. User navigates to `/auth/sign-up` (or `/auth` landing page → clicks "Sign Up").
2. User enters full name, email, password.
3. Real-time email availability check (`GET /auth/check-email?email=...`).
4. Password strength validation (min 8 chars, uppercase, lowercase, digit, special char).
5. Optional: upload custom avatar (presigned URL to S3). On success, add to user record. On failure, remove from S3, do not add to DB.
6. Default identicon avatar assigned (DiceBear) if no custom avatar uploaded.
7. Account created → signed in automatically → redirect to home (or `gnovium-auth://` redirect if desktop).

### 2.8 Google OAuth Flow

1. User clicks "Sign in with Google" on `/auth/sign-in`.
2. Google OAuth popup/redirect completes.
3. Backend receives Google credential token.
4. If email exists in DB → sign in (create session, return tokens).
5. If email not in DB → create account from Google profile (name, email, avatar, google_id) → sign in.
6. Returns same token shape as email/password login.
7. If `?source=desktop` is present: after login, exchange code and redirect to `gnovium-auth://`.

### 2.9 Onboarding Flow

1. Create first workspace (name, optional description).
2. Choose workspace accent color.
3. Invite team members (optional, skip-able).
4. Redirect to workspace dashboard.

### 2.10 Workspace Invitation Flow

1. Admin invites user by email from workspace settings (role selection: Viewer, Editor, Admin).
2. Backend adds user as active workspace member directly (user must already have an account).
3. Invited user receives notification in-app.
4. Role assigned on invite (default: Editor).

### 2.11 Token Handling

- **Access Token**: Short-lived (30 min), JWT, contains `userId`, `workspaceId`, `role`.
- **Refresh Token**: Long-lived (30 days), JWT tracked via session record, supports revocation. Token refresh issues new access token, revokes old refresh token.
- **Logout**: Clear localStorage (Zustand persist), revoke session server-side. Each token pair creates a `Session` record; logout revokes the session.
- **Desktop App**: Tokens stored encrypted in `<userData>/auth.json` via Electron safeStorage (OS keychain). Renderer never holds raw tokens — all token operations go through IPC to main process.

### 2.12 Session Management

| Feature | Implementation |
|---------|---------------|
| Token storage | `sessions` table with `jti`, `refresh_jti`, `revoked_at` |
| Refresh | Issues new access token, revokes old refresh token |
| Logout | Revokes current session (`revoked_at = now()`) |
| Cleanup | `_cleanup_expired_sessions` (scheduled task) |

### 2.13 JWT Callbacks

| Callback | Handler |
|----------|---------|
| `token_in_blocklist_loader` | Checks `SessionRepository.find_by_any_jti(jti)` and `revoked_at` |
| `user_lookup_loader` | Loads user via `UserRepository().get(identity)` |
| `expired_token_loader` | Returns 401 `token_expired` |
| `invalid_token_loader` | Returns 401 `invalid_token` |
| `unauthorized_loader` | Returns 401 `unauthorized` |
| `revoked_token_loader` | Returns 401 `token_revoked` |

### 2.14 OAuth 2.0 Auth Code Flow

Used by the desktop Electron app (`gnovium://`, `gnovium-dev://`, `gnovium-auth://` schemes):

1. `POST /auth/authorize` — Generate one-time code (valid 5 min)
2. `GET /auth/authorize?redirect_uri=...` — Web view redirect
3. `POST /auth/exchange` — Exchange code for JWT tokens
4. Code validation: single-use, expiry, redirect_uri match

---

## 3. Global Layout & Shell

### 3.1 Top Navigation Bar

| Element | Behavior |
|---------|----------|
| Workspace Switcher | Dropdown showing all user workspaces, create new, switch context |
| Global Search | Hybrid search (keyword + semantic), `Cmd/Ctrl + K` to open |
| Notifications Bell | Badge count, dropdown with recent notifications, "Mark all as read" |
| User Avatar Menu | Profile, settings, theme toggle, workspace settings, logout |

### 3.2 Sidebar Navigation

| Section | Items |
|---------|-------|
| Primary | Dashboard, Graph, Search, Recent, Archive |
| Workspace | Members, Settings |
| Quick Actions | Create Entity, Import, Export |
| Member Stack | Avatar stack of workspace members (online indicators) |

**Behavior:**
- Collapsible on desktop (icon-only mode).
- Hidden by default on tablet (swipe to reveal).
- Bottom sheet on mobile.

### 3.3 Command Palette (`Cmd/Ctrl + K`)

- Fuzzy search across: entities, pages, commands, settings, members.
- Actions: create entity, navigate, toggle theme, run AI command, switch workspace.
- Keyboard navigation: `↑↓` to move, `Enter` to select, `Esc` to close.

### 3.4 Contextual Right Sidebar

Toggleable panels (independent, stackable):

| Panel | Content |
|-------|---------|
| Properties | Entity metadata, tags, relations, custom fields |
| AI Assistant | Chat interface, agent suggestions, approval flow |
| Comments | Threaded discussions on entity/selection |
| Backlinks | Incoming references to current entity |
| Version History | Timeline of changes, branching, diff view |

### 3.5 Theme System

| Theme | Description |
|-------|-------------|
| Light | Clean, bright, default for daytime |
| Dark | Rich blacks, reduced eye strain |
| System | Follows OS `prefers-color-scheme` |
| Workspace Accent | Customizable accent color per workspace (applies to buttons, links, highlights) |

**Implementation:**
- CSS custom properties on `<html>`.
- Theme class toggled via React context.
- Persisted in `localStorage`.
- 300ms transition for smooth switching.
- No flash of wrong theme (inline `<script>` in `<head>` reads preference before paint).

---

## 4. Application Architecture

### 4.1 Global Providers (Hierarchy)

```
<SessionProvider>          ← Auth state, tokens, user
  <WorkspaceProvider>      ← Current workspace, members, permissions
    <QueryClientProvider>  ← TanStack Query (server state)
      <ThemeProvider>      ← Theme class on <html>
        <ToastProvider>    ← Sonner toaster
          <AIProvider>     ← Agent state, safety layer context
            <Layout>       ← Shell: navbar + sidebar + content
              {children}
```

### 4.2 Global Services

| Service | Responsibility |
|---------|---------------|
| **API Client** | Axios/fetch wrapper with auth interceptor, retry logic, request deduplication, base URL config |
| **Search Service** | Hybrid search orchestration (keyword + semantic), result ranking, highlight extraction |
| **Sync Service** | Local ↔ cloud reconciliation, conflict detection, queue management, offline support |
| **AI Service** | Agent orchestration, streaming responses, safety layer (simulation → diff → approval), tool execution |
| **Notification Service** | Real-time notifications via WebSocket, in-app notification center, preference management |
| **Permission Service** | Role-based access control (RBAC), resource-level permission checks, UI gating |

### 4.3 Shared Component Library

#### Layout Components
- `AppShell` — Full layout with navbar, sidebar, content area
- `TopNav` — Top navigation bar
- `Sidebar` — Collapsible sidebar navigation
- `RightPanel` — Toggleable contextual panels
- `MobileNav` — Bottom navigation / swipe drawer

#### Reusable Modals
- `ConfirmDialog` — Generic confirmation (delete, archive, restore)
- `DuplicateModal` — Entity duplication with options
- `MergeModal` — Entity merge with conflict preview
- `AIApprovalModal` — Review AI-generated changes with diff view
- `ExportModal` — Export format selection (JSON, Markdown, ZIP, Encrypted .gnv, HTML, PDF, Disk)
- `ImportModal` — File upload with format detection
- `InviteMemberModal` — Email invitation with role assignment
- `RemoveMemberModal` — Member removal confirmation

#### Reusable Side Panels
- `PropertiesPanel` — Entity metadata editor
- `AIPanel` — AI assistant chat + suggestions
- `CommentsPanel` — Threaded comment system
- `BacklinksPanel` — Incoming entity references
- `HistoryPanel` — Version timeline + branch management

#### Reusable UI Primitives
- `CommandPalette` — Fuzzy search + actions
- `ContextMenu` — Right-click / long-press menus
- `BulkActionBar` — Floating bar for multi-select actions
- `SkeletonLoader` — Page-level and component-level skeletons
- `EmptyState` — Contextual empty states with CTAs
- `ErrorBoundary` — Retry-capable error display
- `OfflineIndicator` — Network status + sync queue
- `PermissionGate` — Conditional rendering based on role
- `Toast` — Success, warning, error, info notifications

---

## 5. Core Pages & Functionality

### 5.1 Workspace Management

#### Workspace List (`/workspaces`)
- Grid/list of all user's workspaces.
- Create new workspace card.
- Quick switch, recently accessed.

#### Workspace Settings (`/workspace/[id]/settings`)

**General Tab:**
- Workspace name, description.
- Accent color picker.
- Danger zone: rename, delete workspace.

**Members Tab:**
- Member list with roles (Owner, Admin, Editor, Viewer).
- Invite by email → role assignment → send.
- Remove member → confirmation → done.
- Change member role → immediate effect.

**AI Tab:**
- Enable/disable AI features.
- Configure AI safety level (strict / moderate / permissive).
- Agent permissions.

**Sync Tab:**
- Connected devices list.
- Sync frequency settings.
- Conflict resolution preferences.

**Entity Types Tab:**
- View, create, edit, and delete entity type definitions.
- Configure name, slug, icon, color, and description per type.

**Notifications Tab:**
- Configure notification preferences per type and per workspace.
- Toggle notification types (mention, comment, invite, share, etc.).

### 5.2 Dashboard (`/workspace/[id]/dashboard`)

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Welcome Hero (user avatar, name, workspace name)    │
├─────────────┬─────────────┬─────────────────────────┤
│  Stats Card │  Stats Card │  Stats Card             │
│  (Pages)    │  (Entities) │  (Connections)          │
├─────────────┴─────────────┴─────────────────────────┤
│  Recent Entities List         │  Activity Feed       │
│  (last 10, with previews)     │  (recent actions)    │
├───────────────────────────────┼─────────────────────┤
│  Quick Actions                │  Governance Health   │
│  (create, import, AI search)  │  (score, warnings)   │
└───────────────────────────────┴─────────────────────┘
```

**Components:**
- `WelcomeHero` — User greeting, avatar, workspace context
- `StatsCards` — Animated counters (pages, entities, connections, members)
- `RecentEntities` — List with entity type icons, titles, last modified
- `ActivityFeed` — Timeline of recent actions (who did what, when)
- `QuickActions` — Button grid for common tasks
- `GovernanceHealth` — Score widget with warnings breakdown

### 5.3 Entity / Page Editor (`/workspace/[id]/entity/[entityId]`)

**Editor Capabilities:**
- Block-based editing (22 block types: `text`, `heading`, `bulleted_list`, `numbered_list`, `to-do`, `toggle`, `code`, `quote`, `callout`, `divider`, `image`, `video`, `file`, `bookmark`, `equation`, `table_of_contents`, `column_list`, `column`, `breadcrumb`, `heading1`, `heading2`, `heading3`).
- Rich text formatting (bold, italic, underline, strikethrough, code, highlight).
- Drag & drop block reordering.
- Nested blocks (unlimited depth).
- Slash commands (`/`) for quick block insertion.
- `@mentions` for entity references and user mentions.
- Inline AI actions (select text → AI menu: summarize, expand, rewrite, translate, explain).

**Integrated Panels:**
- Properties panel (right sidebar) — tags, relations, custom fields, metadata.
- AI assistant (right sidebar) — contextual chat about current entity.
- Comments (right sidebar) — threaded discussions, inline annotations.
- Backlinks (right sidebar) — incoming references.
- Version history (right sidebar) — timeline, branch, diff.

**Toolbar:**
- Breadcrumb navigation.
- Entity title (editable inline).
- Publish / archive / delete actions.
- Share / export buttons.
- Fullscreen toggle.

### 5.4 Knowledge Graph (`/workspace/[id]/graph`)

**Visualization:**
- Interactive force-directed graph (React Flow / Cytoscape.js).
- Nodes represent entities (colored by type).
- Edges represent relations (labeled, weighted).
- Smooth zoom, pan, and drag.

**Controls:**
- Filter by entity type, tag, date range, relation type.
- Search within graph (highlight matching nodes).
- Layout options: force-directed, hierarchical, circular, grid.
- Minimap for navigation.
- Fullscreen mode.

**Interactions:**
- Click node → select, show info panel.
- Double-click node → navigate to entity editor.
- Hover node → highlight connected subgraph.
- Right-click → context menu (open, edit, pin, hide).
- Select multiple → bulk actions.

**Advanced:**
- BFS graph traversal (`GRAPH_MAX_ITERATIONS = 10000`, `GRAPH_DEFAULT_DEPTH = 2`).
- Shortest path between two entities.
- Materialize trigger: sync graph state to backend.
- Export graph as image (PNG/SVG) or data (JSON).

### 5.5 Search & Discovery (`/workspace/[id]/search`)

**Search Modes:**
| Mode | Behavior |
|------|----------|
| Hybrid (default) | Combines keyword + semantic for best results |
| Keyword | Traditional text matching with fuzzy tolerance |
| Full-text | Exact phrase matching with boolean operators |
| Semantic | AI-powered meaning-based search |

**Filters:**
- Entity type (page, note, task, etc.)
- Tags (multi-select)
- Date range (created / modified)
- Author
- Has relations / orphan (no relations)
- File attachments (yes/no)

**Results:**
- Relevance-scored list.
- Highlighted matching excerpts.
- Entity type badges.
- Quick actions (open, archive, delete) on hover.
- Infinite scroll with virtual list.

### 5.6 Versioning & History

**Features:**
- Automatic versioning on significant changes.
- Named branches for experimental edits.
- Visual diff (side-by-side or inline) between versions.
- Merge branches with conflict resolution UI.
- Snapshot creation (manual save points).
- Restore to any previous version.

**UI:**
- Timeline view (vertical, newest at top).
- Branch selector dropdown.
- Diff viewer with additions (green) / deletions (red) / modifications (yellow).
- Merge modal with conflict markers and resolution options.

### 5.7 Files (`/workspace/[id]/files`)

**Features:**
- Upload via presigned S3 URLs (direct to cloud, no server bottleneck).
- Drag & drop upload zone.
- File preview (images, PDFs, code, markdown).
- Entity linking (attach files to entities).
- Orphan detection (files not linked to any entity).
- Bulk operations (delete, move, re-link).

**File Validation Pipeline (6 stages):**
1. Extension check against `ALLOWED_EXTENSIONS` (safe set — no executables)
2. MIME type check against `ALLOWED_MIMETYPES`
3. Magic byte validation against `MAGIC_BYTE_MAP` (first 16 bytes)
4. Malware scan via `_scan_file_for_malware()` (clamscan) — results: `CLEAN`, `INFECTED`, `SCAN_UNAVAILABLE`, `SCAN_TIMEOUT`, `SCAN_ERROR`
5. Content hash deduplication (SHA-256)
6. Storage quota check (`_check_quota()`)

**Post-upload (enqueued as background jobs):**
- Image variants for files ≤10MB (WebP: thumbnail 256×256 Q80, preview 1024×1024 Q85, optimized Q80)
- PDF pages (up to 10 pages at 150 DPI, stored as `pdf-page` variants)
- PDF text extraction for files ≤50MB (first 20 pages via PyMuPDF)
- Text/JSON/XML content extraction
- Metadata extraction

**Management:**
- Grid / list view toggle.
- Sort by name, size, type, date.
- Filter by type, size, linked status.
- Storage usage indicator.

### 5.8 Governance (`/workspace/[id]/governance`)

**Dashboard:**
- Overall health score (0-100).
- Breakdown by category.

**Health Score Formula:** `max(0, 100 - min(70, duplicates × 5 + orphans × 2 + stale))`
- 90-100: Excellent (green)
- 70-89: Needs attention (yellow)
- Below 70: Requires cleanup (red)

**Categories:**
| Category | Checks |
|----------|--------|
| Duplicates | Near-identical entities detected by AI |
| Orphans | Entities with no incoming/outgoing relations |
| Stale Content | Entities not modified in >90 days |
| Broken Links | References to deleted/non-existent entities |
| Naming Issues | Inconsistent naming patterns |
| Size Warnings | Entities with excessive content |

**Actions:**
- Review each issue with AI suggestion.
- Bulk resolve (merge duplicates, delete orphans, archive stale).
- Generate governance report (PDF/Markdown) via background job.
- Schedule recurring scans.
- View background job status and history.

### 5.9 Activity & Notifications

#### Activity Log (`/workspace/[id]/activity`)
- Chronological feed of all workspace actions.
- Filterable by user, action type, entity, date range.
- Action types: create, edit, delete, archive, restore, comment, share, AI action.

#### Notifications Center
- Real-time notifications via WebSocket.
- Notification types (15): `mention`, `comment`, `update`, `entity_update`, `invite`, `relation_created`, `backup_complete`, `sync_conflict`, `system`, `share`, `version_created`, `export_complete`, `import_complete`, `governance_report_ready`, `system_alert`.
- **Mark all as read** button.
- Notification preferences (per type, per workspace).

### 5.10 Sync (`/workspace/[id]/sync`)

**Dashboard:**
- Connected devices list (name, last sync, status).
- Sync history timeline.
- Current sync status (syncing / idle / conflict).

**Conflict Resolution:**
- Side-by-side diff view.
- Choose: keep local, keep cloud, merge manually.
- Auto-resolve option for non-conflicting changes.
- Resolution: `source` / `target` / `manual` (with `merged_content`)

**Offline Support:**
- Queue changes locally when offline.
- Show pending changes count.
- Auto-sync when connection restored.
- Conflict detection on sync.

**Sync Fields (7 entity types):**
| Entity Type | Fields Synced |
|-------------|---------------|
| entity_types | name, description, icon, color, config |
| tags | name, color, description |
| properties | name, type, description, required, options, metadata |
| entities | name, entity_type_id, icon, cover_image, is_archived, metadata |
| relations | source_id, target_id, type, properties |
| blocks | entity_id, type, content, parent_block_id, position, branch_id, metadata |
| comments | entity_id, content, block_id, parent_id |

---

## 6. Global UI Patterns

### 6.1 Loading / Error / Empty States

Every page and list supports:

| State | Implementation |
|-------|---------------|
| **Loading** | Skeleton screens matching content layout (no spinners) |
| **Error** | Error message with retry button, diagnostic info |
| **Empty** | Contextual illustration + message + CTA (e.g., "Create your first entity") |
| **Offline** | Banner indicator + sync queue status |
| **Permission Denied** | Clear message + request access CTA |
| **404** | Illustration + "Go to dashboard" CTA |

### 6.2 Universal Bulk Actions

All entity lists support multi-select:

| Action | Behavior |
|--------|----------|
| Bulk Delete | Soft delete with undo |
| Bulk Archive | Move to archive |
| Bulk Restore | Restore from archive |
| Bulk Tag / Untag | Add or remove tags |
| Bulk Move | Move to different collection/folder |
| Bulk AI | Run AI action on selected (summarize, categorize, etc.) |

**UI:** Floating action bar at bottom of screen when items selected.

### 6.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + N` | Create new entity |
| `Cmd/Ctrl + S` | Save current entity |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + /` | Toggle AI assistant |
| `/` | Slash commands (in editor) |
| `Enter` | Confirm / submit |
| `Esc` | Cancel / close |
| `Shift + Click` | Multi-select range |
| `Cmd/Ctrl + Click` | Multi-select individual |
| `Delete` | Soft delete selected |

### 6.4 Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| **Desktop** (≥1280px) | Full layout: sidebar + content + right panel |
| **Tablet** (768-1279px) | Collapsible sidebar, right panel as overlay, touch-optimized |
| **Mobile** (<768px) | Bottom nav, view + basic editing, graph simplified, panels as modals |

### 6.5 Global Permission Rules

| Role | Capabilities |
|------|-------------|
| **Viewer** | Read all entities, view graph, search, export (read-only) |
| **Editor** | All viewer permissions + create/edit/delete entities, add comments, AI actions |
| **Admin** | All editor permissions + manage members, workspace settings, governance |
| **Owner** | All admin permissions + delete workspace, transfer ownership |

**Implementation:**
- `PermissionGate` component wraps UI elements.
- API enforces permissions server-side.
- UI gracefully degrades (hide/disable buttons, show info messages).

### 6.6 Global Toast / Notification System

| Toast Type | Usage |
|------------|-------|
| Success | Entity saved, member invited, export complete |
| Warning | Governance issue, sync conflict, storage limit |
| Error | API failure, permission denied, validation error |
| Info | AI suggestion ready, background job started |

**Position:** Bottom-right (desktop), top-center (mobile).
**Duration:** 4s (success/info), 6s (warning), persistent (error, dismiss manually).

---

## 7. Route Structure

```
/                                          → Landing / redirect
/auth                                      → Auth landing page (Sign In / Sign Up links)
/auth/sign-in                              → Sign-in page (email/password, Google OAuth)
/auth/sign-in?source=desktop               → Sign-in page for Electron desktop app
/auth/sign-up                              → Sign-up page (name, email, password, avatar)
/onboarding                                → Post-registration wizard

/auth/callback                             → OAuth callback

/workspaces                                → Workspace list

/workspace/[id]                            → Redirect to dashboard
/workspace/[id]/dashboard                  → Dashboard
/workspace/[id]/entity/[entityId]          → Entity editor
/workspace/[id]/entity/[entityId]/versions → Version history
/workspace/[id]/entity/[entityId]/branches → Branch manager
/workspace/[id]/graph                      → Knowledge graph
/workspace/[id]/search                     → Search & discovery
/workspace/[id]/files                      → File management
/workspace/[id]/governance                 → Governance dashboard
/workspace/[id]/activity                   → Activity log
/workspace/[id]/sync                       → Sync management
/workspace/[id]/tags                       → Tag management
/workspace/[id]/settings                   → Workspace settings
/workspace/[id]/settings/members           → Members management
/workspace/[id]/settings/ai                → AI configuration
/workspace/[id]/settings/sync              → Sync configuration
/workspace/[id]/entities                   → Entities browse
/workspace/[id]/settings/entity-types      → Entity type management
/workspace/[id]/settings/notifications     → Notification preferences
/profile                                   → User profile
/settings                                  → User preferences
```

---

## 8. Component Hierarchy

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (providers, fonts, theme)
│   ├── page.tsx                  # Landing / redirect
│   ├── auth/
│   │   ├── page.tsx              # Auth landing page (Sign In / Sign Up links)
│   │   ├── sign-in/page.tsx      # Sign-in page
│   │   └── sign-up/page.tsx      # Sign-up page
│   │   └── callback/page.tsx
│   ├── onboarding/page.tsx
│   ├── invites/[token]/page.tsx
│   ├── workspaces/page.tsx
│   ├── workspace/[id]/
│   │   ├── layout.tsx           # Workspace layout (sidebar, context)
│   │   ├── dashboard/page.tsx
│   │   ├── entity/[entityId]/
│   │   │   ├── page.tsx           # Entity editor
│   │   │   ├── versions/page.tsx  # Version history
│   │   │   └── branches/page.tsx  # Branch manager
│   │   ├── graph/page.tsx
│   │   ├── search/page.tsx
│   │   ├── files/page.tsx
│   │   ├── governance/page.tsx
│   │   ├── activity/page.tsx
│   │   ├── sync/page.tsx
│   │   ├── tags/page.tsx
│   │   ├── entities/page.tsx
│   │   └── settings/
│   │       ├── page.tsx
│   │       ├── members/page.tsx
│   │       ├── ai/page.tsx
│   │       ├── entity-types/page.tsx
│   │       ├── notifications/page.tsx
│   │       └── sync/page.tsx
│   ├── profile/page.tsx
│   └── settings/page.tsx
│
├── components/
│   ├── layout/                   # Shell components
│   │   ├── AppShell.tsx
│   │   ├── TopNav.tsx
│   │   ├── Sidebar.tsx
│   │   ├── RightPanel.tsx
│   │   ├── MobileNav.tsx
│   │   └── WorkspaceSwitcher.tsx
│   ├── ui/                       # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Dialog.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── ContextMenu.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Toast.tsx
│   │   ├── Badge.tsx
│   │   ├── Avatar.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Tabs.tsx
│   │   ├── Switch.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Slider.tsx
│   │   ├── Progress.tsx
│   │   ├── Separator.tsx
│   │   ├── ScrollArea.tsx
│   │   ├── Sheet.tsx
│   │   ├── Popover.tsx
│   │   ├── Calendar.tsx
│   │   └── DataTable.tsx
│   ├── modals/                   # Reusable modals
│   │   ├── ConfirmDialog.tsx
│   │   ├── DuplicateModal.tsx
│   │   ├── MergeModal.tsx
│   │   ├── AIApprovalModal.tsx
│   │   ├── ExportModal.tsx
│   │   ├── ImportModal.tsx
│   │   ├── InviteMemberModal.tsx
│   │   └── RemoveMemberModal.tsx
│   ├── panels/                   # Reusable side panels
│   │   ├── PropertiesPanel.tsx
│   │   ├── AIPanel.tsx
│   │   ├── CommentsPanel.tsx
│   │   ├── BacklinksPanel.tsx
│   │   └── HistoryPanel.tsx
│   ├── editor/                   # Editor components
│   │   ├── BlockEditor.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── SlashCommandMenu.tsx
│   │   ├── MentionInput.tsx
│   │   └── blocks/              # Individual block types
│   │       ├── TextBlock.tsx
│   │       ├── HeadingBlock.tsx
│   │       ├── ListBlock.tsx
│   │       ├── CodeBlock.tsx
│   │       ├── ImageBlock.tsx
│   │       ├── TableBlock.tsx
│   │       ├── CalloutBlock.tsx
│   │       ├── ToggleBlock.tsx
│   │       ├── EmbedBlock.tsx
│   │       ├── DividerBlock.tsx
│   │       ├── QuoteBlock.tsx
│   │       ├── EquationBlock.tsx
│   │       ├── MentionBlock.tsx
│   │       └── AIBlock.tsx
│   ├── graph/                    # Knowledge graph
│   │   ├── KnowledgeGraph.tsx
│   │   ├── GraphControls.tsx
│   │   ├── GraphMinimap.tsx
│   │   ├── GraphInfoPanel.tsx
│   │   └── GraphFilters.tsx
│   ├── dashboard/                # Dashboard widgets
│   │   ├── WelcomeHero.tsx
│   │   ├── StatsCards.tsx
│   │   ├── RecentEntities.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── QuickActions.tsx
│   │   └── GovernanceHealth.tsx
│   ├── search/                   # Search components
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   ├── SearchFilters.tsx
│   │   └── SearchModeToggle.tsx
│   ├── files/                    # File management
│   │   ├── FileGrid.tsx
│   │   ├── FileList.tsx
│   │   ├── FileUpload.tsx
│   │   ├── FilePreview.tsx
│   │   └── StorageIndicator.tsx
│   ├── tags/                     # Tag management
│   │   ├── TagList.tsx
│   │   ├── TagBadge.tsx
│   │   ├── TagPicker.tsx
│   │   └── CreateTagModal.tsx
│   ├── versions/                 # Version history
│   │   ├── VersionTimeline.tsx
│   │   ├── DiffViewer.tsx
│   │   ├── BranchSelector.tsx
│   │   └── MergeModal.tsx
│   ├── governance/               # Governance components
│   │   ├── HealthScore.tsx
│   │   ├── IssueList.tsx
│   │   ├── IssueCard.tsx
│   │   └── GovernanceReport.tsx
│   ├── settings/                 # Settings components
│   │   ├── WorkspaceGeneral.tsx
│   │   ├── MembersTable.tsx
│   │   ├── AISettings.tsx
│   │   └── SyncSettings.tsx
│   └── shared/                   # Cross-cutting components
│       ├── BulkActionBar.tsx
│       ├── PermissionGate.tsx
│       ├── OfflineIndicator.tsx
│       ├── ThemeToggle.tsx
│       └── UserAvatarMenu.tsx
│
├── lib/                          # Shared utilities
│   ├── api.ts                    # API client + types
│   ├── auth.ts                   # Auth helpers
│   ├── search.ts                 # Search service
│   ├── sync.ts                   # Sync service
│   ├── ai.ts                     # AI service
│   ├── notifications.ts          # Notification service
│   ├── permissions.ts            # Permission checks
│   ├── utils.ts                  # General utilities
│   ├── cn.ts                     # Class name helper
│   ├── constants.ts              # App constants
│   └── types.ts                  # Shared TypeScript types
│
├── hooks/                        # Custom React hooks
│   ├── useSession.ts
│   ├── useWorkspace.ts
│   ├── usePermissions.ts
│   ├── useEntity.ts
│   ├── useGraph.ts
│   ├── useSearch.ts
│   ├── useSync.ts
│   ├── useAI.ts
│   ├── useNotifications.ts
│   ├── useKeyboardShortcuts.ts
│   ├── useCommandPalette.ts
│   ├── useOnlineStatus.ts
│   └── useMediaQuery.ts
│
├── stores/                       # Zustand stores
│   ├── authStore.ts
│   ├── workspaceStore.ts
│   ├── editorStore.ts
│   ├── graphStore.ts
│   ├── uiStore.ts
│   └── syncStore.ts
│
└── styles/
    └── globals.css               # Tailwind v4 + design tokens
```

---

## 9. Data Models (TypeScript)

> Models match the backend API response shapes exactly. All IDs are UUIDs (`gen_random_uuid()` in PostgreSQL). All timestamps are ISO 8601 UTC.
> All soft-deletable models include `is_deleted`, `deleted_at`, `deleted_by` (FK → users.id).

```typescript
// ─── Common Mixins (applied to all models below) ─────────────────────
// UUIDPrimaryKeyMixin:     id = UUID, gen_random_uuid() default
// TimestampMixin:          created_at, updated_at (auto-updated via trigger)
// CreatedOnlyMixin:        created_at only
// SoftDeleteMixin:         is_deleted, deleted_at, deleted_by (FK users)

// ─── Auth & Users ───────────────────────────────────────────────────

interface User {
  id: string;                    // UUID, gen_random_uuid()
  email: string;                 // UNIQUE
  name: string | null;
  avatar_url: string | null;     // DiceBear URL or uploaded URL
  profile_image_url?: string | null;  // Optional profile image
  password_hash: string | null;
  google_id: string | null;      // UNIQUE
  created_at: string;            // ISO 8601, DEFAULT now()
  updated_at: string;            // ISO 8601, auto-updated via trigger
  is_deleted: boolean;           // DEFAULT false
  deleted_at: string | null;
  deleted_by: string | null;     // FK → users.id ON DELETE SET NULL
}

interface AuthTokens {
  access_token: string;          // JWT, 30 min expiry
  refresh_token: string;         // JWT, 30 day expiry (returned on login/register/refresh)
  token_type: string;            // "bearer"
  expires_in: number;            // 1800 (30 min)
}

interface AuthCode {
  id: string;
  code: string;                  // UNIQUE
  user_id: string;               // FK → users.id ON DELETE CASCADE
  expires_at: string;            // NOT NULL
  consumed_at: string | null;
  redirect_uri: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// POST /auth/refresh response: flat shape { access_token, refresh_token, token_type, expires_in }
// POST /auth/register and /auth/login: nested { tokens: {...}, user: {...} }

// ─── Sessions ────────────────────────────────────────────────────────

interface SessionRecord {
  id: string;
  user_id: string;               // FK → users.id ON DELETE CASCADE
  jti: string | null;            // access token JTI
  refresh_jti: string;           // UNIQUE, refresh token JTI claim
  user_agent: string | null;
  ip_address: string | null;
  revoked_at: string | null;
  expires_at: string;            // NOT NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Workspaces ─────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;                  // 1-80 chars
  description: string | null;
  icon: string | null;
  color: string | null;          // hex accent color e.g. "#4f46e5"
  owner_id: string;              // FK → users.id ON DELETE RESTRICT
  my_role: 'viewer' | 'editor' | 'admin' | 'owner';  // current user's role
  entity_count: number;
  block_count: number;
  deployment_mode: 'local' | 'cloud';  // CHECK constraint
  settings: Record<string, unknown>;   // DEFAULT '{}'::jsonb
  sync_enabled: boolean;         // DEFAULT false
  cloud_workspace_id: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  user_id: string;               // FK → users.id ON DELETE RESTRICT
  role: 'owner' | 'admin' | 'editor' | 'viewer';  // CHECK constraint
  // Note: 'owner' role cannot be assigned via API
  email: string;                 // NOT NULL
  display_name: string;          // NOT NULL
  avatar_url: string | null;
  joined_at: string;             // DEFAULT now()
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface Invite {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  email: string;                 // NOT NULL
  role: 'owner' | 'admin' | 'editor' | 'viewer';  // CHECK constraint
  invited_by: string;            // FK → users.id ON DELETE RESTRICT
  token: string;                 // UNIQUE
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';  // CHECK
  message: string | null;
  expires_at: string;            // NOT NULL
  accepted_at: string | null;
  accepted_by: string | null;    // FK → users.id ON DELETE SET NULL
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface WorkspaceStats {
  workspace: {
    id: string;
    name: string;
    my_role: string;
  };
  stats: {
    entities: number;
    blocks: number;
    files: number;
    relations: number;
    tags: number;
    members: number;
    archived: number;
    storage_used: number;
    storage_quota: number;
  };
  recent_entities: Array<{
    id: string;
    name: string;
    type: string;
    updated_at: string;
  }>;
  recent_activity: ActivityEntry[];
  storage_by_type: Record<string, number>;
}

// ─── Entities ───────────────────────────────────────────────────────

interface Entity {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_type_id: string;        // FK → entity_types.id ON DELETE RESTRICT
  name: string | null;
  icon: string | null;
  color: string | null;
  cover_image: string | null;
  parent_id: string | null;      // FK → entities.id ON DELETE SET NULL
  sort_order: number;            // DEFAULT 0
  summary: string | null;
  is_favorite: boolean;          // DEFAULT false
  is_archived: boolean;          // DEFAULT false, NOT NULL
  archived_at: string | null;
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  version: number;               // NOT NULL, DEFAULT 1
  block_count: number;           // DEFAULT 0
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityType {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  name: string;                  // NOT NULL
  slug: string;                  // NOT NULL
  icon: string | null;
  description: string | null;
  color: string | null;
  config: Record<string, unknown>;  // DEFAULT '{}'
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

type PropertyType =
  | 'text' | 'number' | 'date' | 'select' | 'multi_select'
  | 'checkbox' | 'url' | 'email' | 'phone'
  | 'rich_text' | 'boolean' | 'entity_ref';

interface EntityProperty {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_type_id: string | null; // FK → entity_types.id ON DELETE RESTRICT
  name: string;                  // NOT NULL
  type: PropertyType;            // CHECK constraint
  description: string | null;
  required: boolean;             // DEFAULT false
  options: Record<string, unknown>;  // DEFAULT '{}'
  config: Record<string, unknown>;   // DEFAULT '{}'
  default_value: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityPropertyValue {
  id: string;
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  property_id: string;           // FK → entity_properties.id ON DELETE CASCADE
  value: unknown;                // JSON, NOT NULL
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Blocks ─────────────────────────────────────────────────────────

type BlockType =
  | 'text' | 'heading' | 'heading1' | 'heading2' | 'heading3'
  | 'bulleted_list' | 'numbered_list'
  | 'to-do' | 'toggle'
  | 'code' | 'quote' | 'callout' | 'divider'
  | 'image' | 'video' | 'file' | 'bookmark'
  | 'equation' | 'table_of_contents'
  | 'column_list' | 'column' | 'breadcrumb';

interface Block {
  id: string;
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  parent_block_id: string | null; // FK → blocks.id ON DELETE CASCADE
  type: string;                  // NOT NULL, block type slug
  position: number;              // NUMERIC(20,10) for ordering, NOT NULL
  content: Record<string, unknown>;  // JSON, DEFAULT '{}', NOT NULL
  properties: Record<string, unknown>;  // JSONB, DEFAULT '{}'
  branch_id: string;             // FK → branches.id, DEFAULT '000...0003', NOT NULL
  content_hash: string;          // DEFAULT '', NOT NULL
  indent: number;                // DEFAULT 0, NOT NULL
  version: number;               // NOT NULL
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Block Versions ────────────────────────────────────────────────

interface BlockVersion {
  id: string;
  block_id: string;              // FK → blocks.id ON DELETE RESTRICT
  changeset_id: string | null;   // FK → changesets.id ON DELETE SET NULL
  snapshot: Record<string, unknown>;  // JSON, NOT NULL
  content_hash: string;          // NOT NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Relations ──────────────────────────────────────────────────────

interface Relation {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  source_id: string;             // FK → entities.id ON DELETE CASCADE
  target_id: string;             // FK → entities.id ON DELETE CASCADE
  type: string;                  // NOT NULL
  label: string | null;
  properties: Record<string, unknown>;  // DEFAULT '{}'
  generated_by: 'manual' | 'ai';      // DEFAULT 'manual', CHECK
  verified: boolean;             // DEFAULT true, NOT NULL
  confidence: number | null;     // FLOAT, 0.0-1.0
  ai_model: string | null;
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  // CONSTRAINT no_self_relation: source_id != target_id
}

// ─── Tags ───────────────────────────────────────────────────────────

interface Tag {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  name: string;                  // NOT NULL
  color: string | null;          // hex color e.g. "#ff4444"
  entity_count: number;          // DEFAULT 0
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityTag {
  id: string;
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  tag_id: string;                // FK → tags.id ON DELETE CASCADE
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Comments ───────────────────────────────────────────────────────

interface Comment {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_id: string | null;      // FK → entities.id ON DELETE CASCADE
  block_id: string | null;       // FK → blocks.id ON DELETE CASCADE
  parent_id: string | null;      // FK → comments.id ON DELETE CASCADE
  user_id: string;               // FK → users.id ON DELETE RESTRICT
  display_name: string;          // NOT NULL
  avatar_url: string | null;
  content: string;               // NOT NULL
  resolved: boolean;             // DEFAULT false
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface CommentReaction {
  id: string;
  comment_id: string;            // FK → comments.id ON DELETE CASCADE
  user_id: string;               // FK → users.id ON DELETE RESTRICT
  reaction: string;              // NOT NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Branches ───────────────────────────────────────────────────────

interface Branch {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  parent_branch_id: string | null; // FK → branches.id ON DELETE SET NULL
  name: string;                  // NOT NULL
  description: string | null;
  is_default: boolean;           // DEFAULT false
  is_locked: boolean;            // DEFAULT false
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  version: number;               // NOT NULL, DEFAULT 1
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Versions & Diffs ───────────────────────────────────────────────

interface Changeset {
  id: string;
  branch_id: string;             // FK → branches.id ON DELETE CASCADE
  snapshot_id: string | null;    // FK → snapshots.id ON DELETE SET NULL
  message: string | null;
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface Snapshot {
  id: string;
  branch_id: string;             // FK → branches.id ON DELETE CASCADE
  name: string | null;
  description: string | null;
  metadata: Record<string, unknown>;  // DEFAULT '{}'
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityVersion {
  id: string;
  entity_id: string;             // FK → entities.id ON DELETE RESTRICT
  branch_id: string | null;      // FK → branches.id ON DELETE SET NULL
  changeset_id: string | null;   // FK → changesets.id ON DELETE SET NULL
  snapshot_id: string | null;    // FK → snapshots.id ON DELETE SET NULL
  version: number;               // entity's version_number at snapshot
  message: string | null;
  snapshot: Record<string, unknown>;  // JSON, NOT NULL
  content_hash: string;          // SHA-256 of snapshot, NOT NULL
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface DiffEntry {
  from_version: number;
  to_version: number;
  summary: {
    blocks_added: number;
    blocks_removed: number;
    blocks_modified: number;
  };
  changes: Array<{
    block_id: string;
    type: 'added' | 'removed' | 'modified';
    block_type: string;
    from: Record<string, unknown> | null;
    to: Record<string, unknown> | null;
  }>;
}

interface EntityBranchHead {
  id: string;
  branch_id: string;             // FK → branches.id ON DELETE CASCADE
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  current_version_id: string | null;  // FK → entity_versions.id ON DELETE SET NULL
  base_version_id: string | null;     // FK → entity_versions.id ON DELETE SET NULL
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  // UNIQUE (branch_id, entity_id)
}

interface BranchMerge {
  id: string;
  source_branch_id: string;      // FK → branches.id ON DELETE CASCADE
  target_branch_id: string;      // FK → branches.id ON DELETE CASCADE
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  merged_at: string;             // DEFAULT now(), NOT NULL
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  metadata: Record<string, unknown>;  // DEFAULT '{}'
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  // CONSTRAINT no_self_merge: source_branch_id != target_branch_id
}

interface MergeConflict {
  id: string;
  merge_id: string;              // FK → branch_merges.id ON DELETE CASCADE
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  conflict_type: string;         // NOT NULL
  details: Record<string, unknown>;  // JSON, NOT NULL
  resolved: boolean;             // DEFAULT false
  resolved_by: string | null;    // FK → users.id ON DELETE SET NULL
  resolution: string | null;     // 'source' | 'target' | 'manual'
  resolved_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Search ─────────────────────────────────────────────────────────

type SearchResultEntity = {
  type: 'entity';
  id: string;
  name: string;
  summary: string;
  score: number;                // 0.0-1.0
};

type SearchResultBlock = {
  type: 'block';
  id: string;
  entity_id: string;
  entity_name: string;
  content_preview: string;
  score: number;                // 0.0-1.0
};

type SearchResult = SearchResultEntity | SearchResultBlock;

type SearchMode = 'keyword' | 'full_text' | 'hybrid' | 'semantic';

// ─── Graph ──────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  title: string;
  type: string;                 // entity_type_id
  icon: string | null;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;                 // relation_type
  label?: string;
}

interface GraphSnapshot {
  id: string;
  workspace_id: string;
  graph_snapshot: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    generated_at: string;
  };
  version_hash: string;
  generated_at: string;
}

interface GraphQueryResult {
  workspace_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  distance: number;             // -1 if no path exists
}

// ─── Entity Events ────────────────────────────────────────────────

interface EntityEvent {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_id: string;             // FK → entities.id ON DELETE RESTRICT
  user_id: string | null;        // FK → users.id ON DELETE SET NULL
  changeset_id: string | null;   // FK → changesets.id ON DELETE SET NULL
  event_type: string;            // NOT NULL
  payload: Record<string, unknown>;  // JSON, NOT NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Activity ───────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_id: string | null;      // FK → entities.id ON DELETE RESTRICT
  user_id: string | null;        // FK → users.id ON DELETE SET NULL
  display_name: string | null;
  action: string;                // NOT NULL, e.g. "entity.create"
  resource_type: string | null;  // "entity", "block", "file", "relation", etc.
  resource_id: string | null;
  details: Record<string, unknown>;  // DEFAULT '{}'
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Governance ─────────────────────────────────────────────────────

type GovernanceReportType = 'access_audit' | 'change_log' | 'storage_summary' | 'activity_summary' | 'compliance';

interface GovernanceReport {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  type: GovernanceReportType;    // CHECK constraint
  title: string;                 // NOT NULL
  status: 'pending' | 'running' | 'completed' | 'failed';  // DEFAULT 'pending', CHECK
  data: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface GovernanceHealthScore {
  score: number;                 // 0-100
  breakdown: {
    duplicates: number;
    orphans: number;
    stale: number;
  };
}

// ─── Files ──────────────────────────────────────────────────────────

type FileState = 'PENDING' | 'UPLOADED' | 'VALIDATING' | 'READY' | 'QUARANTINED' | 'DELETED';

interface FileRecord {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  file_name: string;             // NOT NULL
  mime_type: string | null;
  file_size: number;             // BIGINT, DEFAULT 0, NOT NULL
  content_hash: string;          // NOT NULL
  state: FileState;              // DEFAULT 'READY', NOT NULL
  storage_provider: string;      // DEFAULT 'aws_s3'
  object_key: string;            // NOT NULL
  object_lock_mode: 'GOVERNANCE' | 'COMPLIANCE' | null;  // CHECK constraint
  object_lock_retain_until: string | null;
  legal_hold_status: boolean | null;
  uploaded_by: string | null;    // FK → users.id ON DELETE SET NULL
  uploaded_at: string;           // DEFAULT now(), NOT NULL
  updated_at: string;
  has_extracted_text: boolean;   // DEFAULT false
  has_metadata: boolean;         // DEFAULT false
  extracted_text: string | null;
  metadata_json: Record<string, unknown> | null;
  storage_class: string;         // DEFAULT 'STANDARD'
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface FileVariant {
  id: string;
  file_id: string;               // FK → file_records.id ON DELETE CASCADE
  variant_type: string;          // 'thumbnail' | 'preview' | 'optimized' | 'pdf-page'
  object_key: string;            // NOT NULL
  mime_type: string;             // NOT NULL
  width: number | null;
  height: number | null;
  file_size: number | null;      // BIGINT
  algorithm: string | null;      // e.g. "sharp-1.0" (image), "pdf-lib-1.0" (PDF)
  algorithm_version: string | null;
  quality: number | null;        // 80-85 (JPEG/WebP encoding quality)
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityFile {
  id: string;
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  file_id: string;               // FK → file_records.id ON DELETE CASCADE
  block_id: string | null;       // FK → blocks.id ON DELETE SET NULL
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface FileUploadResult {
  id: string;
  workspace_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  content_hash: string;
  storage_provider: string;
  object_key: string;
  uploaded_by: string | null;
  uploaded_at: string;
  deduplicated: boolean;
  has_thumbnail: boolean;
  has_preview: boolean;
  has_extracted_text?: boolean;
  has_metadata?: boolean;
  variants?: FileVariant[];
}

interface PresignResult {
  enabled: boolean;
  upload_url: string;
  object_key: string;
  file_id: string;
  expires_at: string;
}

// When deduplicated:
// { "enabled": false, "deduplicated": true, "file": { ...fileRecord } }

// ─── File Storage Architecture ─────────────────────────────────────

// Object Key Structure (S3):
//   v1/objects/{variant}/{prefix1}/{prefix2}/{full_sha256}{ext}
//   v1/temp/pending/{prefix1}/{prefix2}/{uuid_hex}
//   v1/quarantine/{reason}/{content_hash}
// Where:
//   variant = "original" | "derived/{variant_type}"
//   prefix1 = first 2 chars of SHA-256 hash
//   prefix2 = next 2 chars of SHA-256 hash (chars 2-3)
//   reason = "invalid" | "virus" | "failed"

// Local mode key structure:
//   objects/original/{prefix}/{sha256}
//   objects/thumbnail/{prefix}/{sha256}.webp
//   objects/preview/{prefix}/{sha256}.webp
//   objects/optimized/{prefix}/{sha256}

// Encrypted .gnv format:
//   MAGIC_HEADER (b"GNOVIUM_ZIP_V1") | KEY_ID (4 bytes) | NONCE (12 bytes) | CIPHERTEXT | HMAC_SIG (64 hex chars)
//   Encryption: AES-256-GCM. HMAC: SHA-256. Key derivation: PBKDF2-HMAC-SHA256 with 100,000 iterations

// ─── File Request Schemas ──────────────────────────────────────────

interface PresignUploadSchema {
  workspace_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  content_hash?: string;         // SHA-256 for dedup
}

interface PresignMultipartSchema {
  workspace_id: string;
  content_type: string;
  file_size: number;
  file_name: string;
  content_hash?: string;
}

interface PresignMultipartPart {
  PartNumber: number;
  ETag: string;
}

interface PresignMultipartCompleteSchema {
  workspace_id: string;
  upload_id: string;
  file_id: string;
  parts: PresignMultipartPart[];
}

interface QuarantineResolveSchema {
  approve: boolean;
}

// ─── Notifications ──────────────────────────────────────────────────

type NotificationType =
  | 'mention' | 'comment' | 'update' | 'entity_update'
  | 'invite' | 'relation_created' | 'backup_complete'
  | 'sync_conflict' | 'system' | 'share'
  | 'version_created' | 'export_complete' | 'import_complete'
  | 'governance_report_ready' | 'system_alert';

interface Notification {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  user_id: string;               // FK → users.id ON DELETE CASCADE
  entity_id: string | null;      // FK → entities.id ON DELETE CASCADE
  type: NotificationType;        // CHECK constraint (15 types)
  title: string;                 // NOT NULL
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;              // DEFAULT false
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Jobs (Cloud-Only) ──────────────────────────────────────────────

type JobPriority = 'critical' | 'high' | 'medium' | 'low';
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'dead_letter';

interface Job {
  id: string;
  workspace_id: string | null;   // FK → workspaces.id ON DELETE CASCADE
  type: string;                  // NOT NULL
  status: JobStatus;             // CHECK constraint (6 values)
  progress: number;              // DEFAULT 0
  message: string | null;
  priority: JobPriority;         // CHECK constraint (4 values)
  payload: Record<string, unknown>;  // JSON, NOT NULL
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  idempotency_key: string | null;    // UNIQUE where NOT NULL
  retry_count: number;           // NOT NULL
  max_retries: number;           // NOT NULL
  timeout_seconds: number | null;
  created_by: string | null;     // FK → users.id ON DELETE SET NULL
  started_at: string | null;
  completed_at: string | null;
  schedule_at: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// Job Types: export_zip, import_zip, export_markdown, export_html, export_pdf,
//            file_processing, governance_report, cleanup, backup

// ─── Sync ───────────────────────────────────────────────────────────

interface SyncOperation {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  operation_type: string;        // NOT NULL
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;  // JSON, NOT NULL
  device_id: string | null;
  client_clock: number | null;   // BIGINT
  synced: boolean;               // DEFAULT false
  retry_count: number;           // NOT NULL
  error_message: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// Sync operation types: entity_create, entity_update, entity_delete,
//                       block_create, block_update, block_delete,
//                       relation_create, relation_delete

interface SyncDiff {
  entity_types: unknown[];
  entities: unknown[];
  properties: unknown[];
  relations: unknown[];
  tags: unknown[];
  blocks: unknown[];
  comments: unknown[];
}

interface SyncApplyResult {
  workspace_id: string;
  synced: {
    entity_types: number;
    entities: number;
    properties: number;
    relations: number;
    tags: number;
    blocks: number;
    comments: number;
  };
}

// ─── Embeddings ───────────────────────────────────────────────────

interface Embedding {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_id: string | null;      // FK → entities.id ON DELETE CASCADE
  block_id: string | null;       // FK → blocks.id ON DELETE SET NULL
  model: string;                 // NOT NULL
  embedding: unknown;            // VECTOR(1024) in PostgreSQL
  content_hash: string;          // NOT NULL
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Search Documents ─────────────────────────────────────────────

interface SearchDocument {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  entity_id: string;             // FK → entities.id ON DELETE CASCADE
  block_id: string | null;       // FK → blocks.id ON DELETE CASCADE
  title: string | null;
  content: string | null;
  content_hash: string;          // DEFAULT '', NOT NULL
  search_vector: unknown;        // TSVECTOR in PostgreSQL (GIN-indexable)
  created_at: string;
  updated_at: string;            // search_vector auto-populated via trigger on title/content change
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Graph Materializations ───────────────────────────────────────

interface GraphMaterialization {
  id: string;
  workspace_id: string;          // FK → workspaces.id ON DELETE CASCADE
  graph_snapshot: Record<string, unknown>;  // JSON, NOT NULL
  generated_at: string;          // DEFAULT now(), NOT NULL
  version_hash: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Backups ────────────────────────────────────────────────────────

interface WorkspaceExport {
  workspace_id: string;
  exported_at: string;
  entity_types: EntityType[];
  entities: Entity[];
  blocks: Block[];
  relations: Relation[];
  tags: Tag[];
  comments: Comment[];
  properties: EntityProperty[];
  files: FileRecord[];
}

interface ImportResult {
  workspace_id: string;
  imported: {
    entity_types: number;
    entities: number;
    properties: number;
    property_values: number;
    blocks: number;
    relations: number;
    tags: number;
    comments: number;
    files: number;
    entity_files: number;
  };
}

// ─── API Response Envelope ──────────────────────────────────────────

interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;         // UUID, generated per-request
  };
}
```

---

## 10. API Contract (All 221 Endpoints)

> **Base URL:** `/api/v1/` prefix for all endpoints except `/health` and `/metrics`.
> **Auth:** `Authorization: Bearer <token>` header.
> **Public routes:** `GET /auth/authorize`, `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/exchange`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /health`, `GET /docs/`.
> **Pagination:** `?page=1&per_page=30` (default `DEFAULT_PAGE_SIZE`), max `per_page`: 100 (`MAX_PAGE_SIZE`).
> **Response Format:** `{"data": ...}` on success, `{"error": {"code": ..., "message": ...}}` on error.
> **Rate limits** are per-client-IP, keyed by `request.access_route[0]`:

| Rate Limit Category | Value | Applied To |
|---|---|---|
| `AUTH_WRITE` | **5/min** | Register, login, google, authorize (POST) |
| `PASSWORD_RESET` | **3/min** | Forgot-password, reset-password |
| `DESTRUCTIVE` | **10/min** | Deletes, permanent deletes, exchange, backup restore/create/import |
| `FILE_UPLOAD` | **10/min** | File upload (multipart) |
| `FILE_DOWNLOAD` | **60/min** | File download |
| `STRICT` | **30/min** | All mutation endpoints (POST/PATCH/DELETE) |
| `STANDARD` | **120/min** | All read (GET) endpoints |
| `LENIENT` | **300/min** | Dashboard overview, notifications unread-count |

### 10.1 Root Endpoints

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/metrics` | — | STANDARD | Prometheus metrics (text/plain) |
| GET | `/health` | — | STANDARD | Health check: `{"status":"healthy","dependencies":{"database":"ok","redis":"ok","db_pool":{...}}}` |

### 10.2 Docs

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/docs/` | — | STANDARD | Full API documentation JSON with 208+ endpoints |

### 10.3 Authentication

**Blueprint:** `auth` | **Prefix:** `/auth`

| Method | Path | Auth | Rate Limit | Permission | Description |
|--------|------|------|------------|------------|-------------|
| POST | `/auth/register` | — | AUTH_WRITE | Public (local auth gate) | Create account → nested `{tokens, user}` |
| POST | `/auth/login` | — | AUTH_WRITE | Public (local auth gate) | Sign in → nested `{tokens, user}` |
| GET | `/auth/check-email` | — | STRICT | Public | `{data: {available: bool}}` |
| POST | `/auth/google` | — | AUTH_WRITE | `@cloud_only` | Google OAuth → nested `{tokens, user}` |
| POST | `/auth/refresh` | Refresh | STANDARD | Public (cookie) | Rotate tokens → flat `{access_token, refresh_token, token_type, expires_in}` |
| POST | `/auth/logout` | Access/Refresh | STANDARD | Public (cookie) | Revoke session |
| GET | `/auth/me` | Access | STANDARD | `_verify_jwt()` | User profile |
| PATCH | `/auth/me` | Access | STRICT | `_verify_jwt()` | Update name/avatar |
| POST | `/auth/avatar` | Access | STRICT | `@secured` | Upload profile avatar (multipart) → `{data: {avatar_url}}` |
| POST | `/auth/change-password` | Access | STRICT | `@secured` + `@cloud_only` | Change password |
| POST | `/auth/forgot-password` | — | PASSWORD_RESET | Public | Request reset email |
| POST | `/auth/reset-password` | — | PASSWORD_RESET | Public | Reset password |
| POST | `/auth/exchange-code` | Access | DESTRUCTIVE | `@secured` + `@cloud_only` | Generate one-time code |
| POST | `/auth/authorize` | Access | AUTH_WRITE | `@secured` + local auth gate | OAuth code flow |
| GET | `/auth/authorize` | — | STANDARD | Public | 302 redirect to web app |
| POST | `/auth/profile-changed` | Access | STANDARD | `@secured` + local auth gate | Desktop polling |
| POST | `/auth/exchange` | — | DESTRUCTIVE | Public (local auth gate) | Code-for-tokens |

**Proxy Helper:** `proxy_to_cloud(method, path, json_data=None)` — validates against `ALLOWED_CLOUD_HOSTS`, forwards request. Used by: `refresh`, `logout`, `forgot_password`, `reset_password`, `exchange_code`.

### 10.4 Workspaces

**Blueprint:** `workspaces` | **Prefix:** `/workspaces`

| Method | Path | Auth | Rate Limit | Permission | Description |
|--------|------|------|------------|------------|-------------|
| GET | `/workspaces/` | Access | STANDARD | Authenticated | List (search, page) |
| POST | `/workspaces/` | Access | STRICT | Authenticated | Create |
| GET | `/workspaces/<ws>` | Access | STANDARD | `check_workspace_access` | Get details |
| PATCH | `/workspaces/<ws>` | Access | STRICT | admin/owner | Update |
| DELETE | `/workspaces/<ws>` | Access | DESTRUCTIVE | admin/owner | Delete |
| POST | `/workspaces/<ws>/restore` | Access | STRICT | owner | Restore |
| GET | `/workspaces/<ws>/stats` | Access | STANDARD | `check_workspace_access` | Entity/block/relation/file counts |

### 10.5 Workspace Members

**Blueprint:** `workspace_members` | **Prefix:** `/workspaces` | **Cloud-only**

| Method | Path | Auth | Rate Limit | Permission | Description |
|--------|------|------|------------|------------|-------------|
| GET | `/workspaces/<ws>/members` | Access | STANDARD | member | List |
| GET | `/workspaces/<ws>/members/<user_id>` | Access | STANDARD | member | Get |
| POST | `/workspaces/<ws>/members/invite` | Access | STRICT | owner/admin | Invite by email |
| PATCH | `/workspaces/<ws>/members/<user_id>` | Access | STRICT | owner | Update role |
| DELETE | `/workspaces/<ws>/members/<user_id>` | Access | STRICT | owner/admin | Remove |

### 10.6 Entities

**Blueprint:** `entities` | **Prefix:** `/workspaces/<ws>/entities`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/entities/` | Access | STANDARD | List (type, search, tags, deleted, sort, order, page) |
| POST | `/workspaces/<ws>/entities/` | Access | STRICT | Create (with properties, parent relation, event, search) |
| GET | `/workspaces/<ws>/entities/<entity_id>` | Access | STANDARD | Get with blocks |
| PATCH | `/workspaces/<ws>/entities/<entity_id>` | Access | STRICT | Update |
| DELETE | `/workspaces/<ws>/entities/<entity_id>` | Access | STRICT | Soft-delete cascade |
| DELETE | `/workspaces/<ws>/entities/<entity_id>/permanent` | Access | DESTRUCTIVE | Hard delete (must be soft-deleted) |
| POST | `/workspaces/<ws>/entities/<entity_id>/restore` | Access | STRICT | Cascade-restore |
| POST | `/workspaces/<ws>/entities/<entity_id>/archive` | Access | STRICT | Toggle archive |
| POST | `/workspaces/<ws>/entities/<entity_id>/duplicate` | Access | STRICT | Deep copy with "Copy" suffix |
| GET | `/workspaces/<ws>/entities/<entity_id>/children` | Access | STANDARD | List children |
| POST | `/workspaces/<ws>/entities/<entity_id>/children` | Access | STRICT | Create child |
| GET | `/workspaces/<ws>/entities/<entity_id>/versions` | Access | STANDARD | List entity versions |
| GET | `/workspaces/<ws>/entities/properties` | Access | STANDARD | Alias for properties list (no admin gate) |
| POST | `/workspaces/<ws>/entities/properties` | Access | STRICT | Alias for properties create (no admin gate) |

### 10.7 Entity Types

**Blueprint:** `entities` | **Prefix:** `/workspaces/<ws>/entities/types`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| POST | `/workspaces/<ws>/entities/types` | Access | STRICT | Create |
| GET | `/workspaces/<ws>/entities/types` | Access | STANDARD | List |
| GET | `/workspaces/<ws>/entities/types/<type_id>` | Access | STANDARD | Get |
| PATCH | `/workspaces/<ws>/entities/types/<type_id>` | Access | STRICT | Update |
| DELETE | `/workspaces/<ws>/entities/types/<type_id>` | Access | STRICT | Delete |

### 10.8 Properties

**Blueprint:** `properties` | **Prefix:** `/workspaces/<ws>/properties`

| Method | Path | Auth | Rate Limit | Permission | Description |
|--------|------|------|------------|------------|-------------|
| GET | `/workspaces/<ws>/properties/` | Access | STANDARD | `check_workspace_access` | List |
| POST | `/workspaces/<ws>/properties/` | Access | STRICT | `_require_admin` | Create (admin) |
| GET | `/workspaces/<ws>/properties/<property_id>` | Access | STANDARD | `check_workspace_access` | Get |
| PATCH | `/workspaces/<ws>/properties/<property_id>` | Access | STRICT | `_require_admin` | Update (admin) |
| DELETE | `/workspaces/<ws>/properties/<property_id>` | Access | STRICT | `_require_admin` | Delete (admin) |
| POST | `/workspaces/<ws>/properties/<property_id>/restore` | Access | STRICT | `_require_admin` | Restore (admin) |

**Property Types (12):** `text`, `number`, `date`, `select`, `multi_select`, `checkbox`, `url`, `email`, `phone`, `rich_text`, `boolean`, `entity_ref`

### 10.9 Blocks

**Blueprint:** `blocks` | **Prefix:** `/workspaces/<ws>/blocks`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/blocks/` | Access | STANDARD | List (entity_id required) |
| POST | `/workspaces/<ws>/blocks/` | Access | STRICT | Create (sanitize, auto-position, event, search) |
| GET | `/workspaces/<ws>/blocks/<block_id>` | Access | STANDARD | Get |
| PATCH | `/workspaces/<ws>/blocks/<block_id>` | Access | STRICT | Update (circular ref check, versioning, event, search) |
| POST | `/workspaces/<ws>/blocks/<block_id>/move` | Access | STRICT | Move (reindex old+new entity) |
| DELETE | `/workspaces/<ws>/blocks/<block_id>` | Access | STRICT | Soft-delete, event, search |
| POST | `/workspaces/<ws>/blocks/reorder` | Access | STRICT | Batch reorder |
| POST | `/workspaces/<ws>/blocks/<block_id>/restore` | Access | STRICT | Restore soft-deleted |
| GET | `/workspaces/<ws>/blocks/entity/<entity_id>` | Access | STANDARD | 308 redirect to `/blocks/?entity_id=` |

**Block Types (22):** `text`, `heading`, `bulleted_list`, `numbered_list`, `to-do`, `toggle`, `code`, `quote`, `callout`, `divider`, `image`, `video`, `file`, `bookmark`, `equation`, `table_of_contents`, `column_list`, `column`, `breadcrumb`, `heading1`, `heading2`, `heading3`

### 10.10 Relations

**Blueprint:** `relations` | **Prefix:** `/workspaces/<ws>/relations`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/relations/` | Access | STANDARD | List (entity_id?, target_id?, type?, page) |
| POST | `/workspaces/<ws>/relations/` | Access | STRICT | Create (no_self_relation, generated_by IN manual/ai) |
| GET | `/workspaces/<ws>/relations/<relation_id>` | Access | STANDARD | Get |
| PATCH | `/workspaces/<ws>/relations/<relation_id>` | Access | STRICT | Update |
| DELETE | `/workspaces/<ws>/relations/<relation_id>` | Access | STRICT | Soft-delete |
| POST | `/workspaces/<ws>/relations/<relation_id>/restore` | Access | STRICT | Restore |
| GET | `/workspaces/<ws>/relations/entity/<entity_id>` | Access | STANDARD | Outgoing |
| GET | `/workspaces/<ws>/relations/backlinks/<entity_id>` | Access | STANDARD | Incoming |
| GET | `/workspaces/<ws>/relations/neighbors/<entity_id>` | Access | STANDARD | All connected |
| GET | `/workspaces/<ws>/relations/path` | Access | STANDARD | Shortest path |
| POST | `/workspaces/<ws>/relations/batch` | Access | STRICT | Batch create |

### 10.11 Tags

**Blueprint:** `tags` | **Prefix:** `/workspaces/<ws>/tags`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/tags/` | Access | STANDARD | List |
| POST | `/workspaces/<ws>/tags/` | Access | STRICT | Create |
| GET | `/workspaces/<ws>/tags/<tag_id>` | Access | STANDARD | Get |
| PATCH | `/workspaces/<ws>/tags/<tag_id>` | Access | STRICT | Update |
| DELETE | `/workspaces/<ws>/tags/<tag_id>` | Access | STRICT | Delete |
| POST | `/workspaces/<ws>/tags/<tag_id>/restore` | Access | STRICT | Restore |
| POST | `/workspaces/<ws>/tags/<tag_id>/entities/<entity_id>` | Access | STRICT | Tag entity |
| DELETE | `/workspaces/<ws>/tags/<tag_id>/entities/<entity_id>` | Access | STRICT | Untag |

### 10.12 Comments

**Cloud-only.** **Blueprint:** `comments` | **Prefix:** `/workspaces/<ws>/comments`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/comments/` | Access | STANDARD | List (entity_id?, parent_id?, page) |
| POST | `/workspaces/<ws>/comments/` | Access | STRICT | Create |
| GET | `/workspaces/<ws>/comments/<comment_id>` | Access | STANDARD | Get |
| PATCH | `/workspaces/<ws>/comments/<comment_id>` | Access | STRICT | Update |
| DELETE | `/workspaces/<ws>/comments/<comment_id>` | Access | STRICT | Soft-delete |
| POST | `/workspaces/<ws>/comments/<comment_id>/restore` | Access | STRICT | Restore |

### 10.13 Branches

**Blueprint:** `branches` | **Prefix:** `/workspaces/<ws>/branches`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/branches` | Access | STANDARD | List |
| POST | `/workspaces/<ws>/branches` | Access | STRICT | Create |
| GET | `/workspaces/<ws>/branches/<branch_id>` | Access | STANDARD | Get |
| PATCH | `/workspaces/<ws>/branches/<branch_id>` | Access | STRICT | Update |
| DELETE | `/workspaces/<ws>/branches/<branch_id>` | Access | DESTRUCTIVE | Delete |
| POST | `/workspaces/<ws>/branches/<branch_id>/restore` | Access | STRICT | Restore |
| POST | `/workspaces/<ws>/branches/<branch_id>/merge` | Access | DESTRUCTIVE | Merge into target |
| POST | `/workspaces/<ws>/branches/merge` | Access | DESTRUCTIVE | Merge by source+target |
| GET | `/workspaces/<ws>/branches/merge-conflicts` | Access | STANDARD | List conflicts (cloud) |
| PATCH | `/workspaces/<ws>/branches/merge-conflicts/<conflict_id>/resolve` | Access | STRICT | Resolve (cloud) |

### 10.14 Versions / Changesets / Snapshots

**Blueprint:** `versions` | **Prefix:** `/workspaces/<ws>/versions`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/versions/changesets` | Access | STANDARD | List changesets |
| POST | `/workspaces/<ws>/versions/changesets` | Access | STRICT | Create changeset |
| GET | `/workspaces/<ws>/versions/changesets/<cs_id>` | Access | STANDARD | Get changeset |
| DELETE | `/workspaces/<ws>/versions/changesets/<cs_id>` | Access | DESTRUCTIVE | Delete changeset |
| GET | `/workspaces/<ws>/versions/snapshots` | Access | STANDARD | List snapshots |
| POST | `/workspaces/<ws>/versions/snapshots` | Access | STRICT | Create snapshot |
| GET | `/workspaces/<ws>/versions/snapshots/<snap_id>` | Access | STANDARD | Get snapshot |
| DELETE | `/workspaces/<ws>/versions/snapshots/<snap_id>` | Access | DESTRUCTIVE | Delete snapshot |
| POST | `/workspaces/<ws>/versions/entities/<entity_id>/snapshot` | Access | STRICT | Snapshot entity |
| GET | `/workspaces/<ws>/versions/entities/<entity_id>` | Access | STANDARD | List entity versions |
| GET | `/workspaces/<ws>/versions/blocks/<block_id>` | Access | STANDARD | List block versions |
| GET | `/workspaces/<ws>/versions/compare` | Access | STANDARD | Compare (left_version_id, right_version_id) |
| POST | `/workspaces/<ws>/versions/<version_id>/restore` | Access | DESTRUCTIVE | Restore version |

### 10.15 Diffs

**Blueprint:** `diffs` | **Prefix:** `/workspaces/<ws>/diffs`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/diffs/compare` | Access | STANDARD | Compare versions/snapshots/branches |
| POST | `/workspaces/<ws>/diffs/blocks` | Access | STRICT | Diff two blocks |

### 10.16 Search

**Blueprint:** `search` | **Prefix:** `/workspaces/<ws>/search`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/search` | Access | STANDARD | Search (q required, entity_type_id?, page) |
| POST | `/workspaces/<ws>/search/rebuild-index` | Access | STRICT | Rebuild search index |
| GET | `/workspaces/<ws>/search/history` | Access | STANDARD | Search history (stub) |
| GET | `/workspaces/<ws>/search/suggest` | Access | STANDARD | Autocomplete (q required) |

### 10.17 Graph

**Blueprint:** `graph` | **Prefix:** `/workspaces/<ws>/graph`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/graph/` | Access | STANDARD | Get graph (entity_id?, depth?, filter_type?, include_tags?) |
| POST | `/workspaces/<ws>/graph/materialize` | Access | STRICT | Materialize snapshot |
| POST | `/workspaces/<ws>/graph/query` | Access | STRICT | Filtered query |
| POST | `/workspaces/<ws>/graph/cleanup` | Access | STRICT | Cleanup old (keep? default 10, max 100) |
| POST | `/workspaces/<ws>/graph/traverse` | Access | STRICT | BFS (center_node, depth max 5, relation_types) |
| POST | `/workspaces/<ws>/graph/paths` | Access | STRICT | Shortest path (source_id, target_id) |
| GET | `/workspaces/<ws>/graph/search` | Access | STANDARD | Search (q, type?) |

**BFS Parameters:** `GRAPH_MAX_ITERATIONS = 10000`, `GRAPH_DEFAULT_DEPTH = 2`

### 10.18 Files

**Blueprint:** `files` | **Prefix:** `/workspaces/<ws>/files`

| Method | Path | Auth | Rate Limit | Mode | Description |
|--------|------|------|------------|------|-------------|
| GET | `/workspaces/<ws>/files` | Access | STANDARD | Both | List (uploaded_by?, page) |
| POST | `/workspaces/<ws>/files/upload` | Access | FILE_UPLOAD | Both | Upload multipart |
| POST | `/workspaces/<ws>/files` | Access | STRICT | Both | Register metadata |
| GET | `/workspaces/<ws>/files/<file_id>` | Access | STANDARD | Both | Get metadata |
| GET | `/workspaces/<ws>/files/<file_id>/download` | Access | FILE_DOWNLOAD | Both | Download |
| GET | `/workspaces/<ws>/files/<file_id>/thumbnail` | Access | STANDARD | Both | Variant: thumbnail |
| GET | `/workspaces/<ws>/files/<file_id>/preview` | Access | STANDARD | Both | Variant: preview |
| GET | `/workspaces/<ws>/files/<file_id>/optimized` | Access | STANDARD | Both | Variant: optimized |
| DELETE | `/workspaces/<ws>/files/<file_id>` | Access | STRICT | Both | Soft-delete |
| GET | `/workspaces/<ws>/files/<file_id>/variants/<variant_type>` | Access | STANDARD | Both | Get variant |
| GET | `/workspaces/<ws>/files/<file_id>/variants` | Access | STANDARD | Both | List variants |
| POST | `/workspaces/<ws>/files/<file_id>/entities/<entity_id>` | Access | STRICT | Both | Link to entity |
| DELETE | `/workspaces/<ws>/files/<file_id>/entities/<entity_id>` | Access | STRICT | Both | Unlink |
| POST | `/workspaces/<ws>/files/presign` | Access | STRICT | Cloud | Presigned URL |
| POST | `/workspaces/<ws>/files/presign-multipart` | Access | FILE_UPLOAD | Cloud | Multipart start |
| POST | `/workspaces/<ws>/files/presign-multipart/complete` | Access | STRICT | Cloud | Multipart complete |
| POST | `/workspaces/<ws>/files/<file_id>/confirm` | Access | STRICT | Cloud | Confirm upload |
| POST | `/workspaces/<ws>/files/quarantine/<file_id>/resolve` | Access | STRICT | Cloud | Resolve quarantine |
| POST | `/workspaces/<ws>/files/cleanup-orphans` | Access | STRICT | Both | Remove orphan files |
| POST | `/workspaces/<ws>/files/cleanup-quarantine` | Access | STRICT | Cloud | Purge quarantine |
| POST | `/workspaces/<ws>/files/cleanup-deleted` | Access | STRICT | Cloud | Purge deleted |
| GET | `/workspaces/<ws>/files/storage-info` | Access | STANDARD | Both | Storage usage stats |

**File States:** `PENDING` → `UPLOADED` → `VALIDATING` → `READY` | `QUARANTINED` | `DELETED`
**Variant Types:** `thumbnail` (≤256px, WebP, Q80), `preview` (≤1024px, WebP, Q85), `optimized` (WebP, Q80), `pdf-page` (WebP, 150 DPI)
**File Validation:** Extension → MIME → Magic bytes → Malware scan → Content hash dedup → Storage quota

### 10.19 Backups & Export

**Blueprint:** `backups` | **Prefix:** `/workspaces/<ws>/backups`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/backups` | Access | STANDARD | List backup files |
| POST | `/workspaces/<ws>/backups/export` | Access | STRICT | Export workspace JSON |
| POST | `/workspaces/<ws>/backups/create` | Access | DESTRUCTIVE | Create encrypted .gnv |
| POST | `/workspaces/<ws>/backups/<path:filename>/restore` | Access | DESTRUCTIVE | Restore from .gnv or .json |
| POST | `/workspaces/<ws>/backups/export-to-disk` | Access | STRICT | Write JSON to disk |
| POST | `/workspaces/<ws>/backups/import` | Access | DESTRUCTIVE | Import workspace data |
| POST | `/workspaces/<ws>/backups/export-markdown` | Access | STRICT | Export as markdown files |
| POST | `/workspaces/<ws>/backups/export-zip` | Access | STRICT | Export as ZIP archive |
| POST | `/workspaces/<ws>/backups/export-html` | Access | STRICT | Export entity as HTML |
| POST | `/workspaces/<ws>/backups/export-pdf` | Access | STRICT | Export as PDF |
| POST | `/workspaces/<ws>/backups/export-zip-encrypted` | Access | STRICT | Export encrypted .gnv |
| POST | `/workspaces/<ws>/backups/import-zip` | Access | DESTRUCTIVE | Import encrypted .gnv |
| GET | `/workspaces/<ws>/backups/download-zip/<path:filename>` | Access | STRICT | Download ZIP |

**Export Formats Summary (7 formats supported by backend `ExportService`):**

| Format | Endpoint | Scope | Output | Backend Method |
|--------|----------|-------|--------|----------------|
| JSON | `/backups/export` | Full workspace | `.json` file | `export_workspace()` |
| JSON to Disk | `/backups/export-to-disk` | Full workspace | Files on server disk | `export_to_disk()` |
| Markdown | `/backups/export-markdown` | Full workspace | `.zip` of `.md` files with YAML front-matter | `export_markdown()` |
| ZIP | `/backups/export-zip` | Full workspace | `.zip` of Markdown + assets | `export_zip()` |
| Encrypted .gnv | `/backups/export-zip-encrypted` | Full workspace | AES-256-GCM encrypted `.gnv` with HMAC-SHA256 | `export_secure_zip()` |
| HTML | `/backups/export-html` | Single entity | Self-contained `.html` with inline CSS | `export_html()` |
| PDF | `/backups/export-pdf` | Single entity | Rendered `.pdf` via wkhtmltopdf/chromium/WeasyPrint | `export_pdf()` |

### 10.20 Sync

**Blueprint:** `sync` | **Prefix:** `/workspaces/<ws>/sync`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/sync` | Access | STANDARD | List operations |
| POST | `/workspaces/<ws>/sync` | Access | STRICT | Create operation |
| GET | `/workspaces/<ws>/sync/<op_id>` | Access | STANDARD | Get operation |
| POST | `/workspaces/<ws>/sync/<op_id>/ack` | Access | STRICT | Acknowledge |
| POST | `/workspaces/<ws>/sync/diff` | Access | STRICT | Diff local vs remote |
| POST | `/workspaces/<ws>/sync/apply-diff` | Access | STRICT | Apply diff |
| POST | `/workspaces/<ws>/sync/sync-from-export` | Access | STRICT | Full import |
| POST | `/workspaces/<ws>/sync/push` | Access | STRICT | Push changes |
| POST | `/workspaces/<ws>/sync/pull` | Access | STANDARD | Pull pending |
| POST | `/workspaces/<ws>/sync/full-sync` | Access | STRICT | Bidirectional full sync |
| GET | `/workspaces/<ws>/sync/status` | Access | STANDARD | Sync status |
| GET | `/workspaces/<ws>/sync/changes` | Access | STANDARD | Local diff |
| POST | `/workspaces/<ws>/sync/conflicts/<conflict_id>/resolve` | Access | STRICT | Resolve conflict |
| POST | `/workspaces/<ws>/sync/resolve-conflict` | Access | STRICT | Alternative resolve |

**Operation Types (8):** `entity_create`, `entity_update`, `entity_delete`, `block_create`, `block_update`, `block_delete`, `relation_create`, `relation_delete`
**Sync Fields (7):** entity_types, tags, properties, entities, relations, blocks, comments

### 10.21 Activity

**Blueprint:** `activity` | **Prefix:** `/workspaces/<ws>/activity`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/activity` | Access | STANDARD | List (entity_id?, action?, user_id?, date range, page) |
| GET | `/workspaces/<ws>/activity/events` | Access | STANDARD | List entity events (entity_id?, changeset_id?, page) |

### 10.22 Notifications

**Blueprint:** `notifications` | **Prefix:** `/workspaces/<ws>/notifications`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/notifications` | Access | STANDARD | List (unread_only?, page) |
| POST | `/workspaces/<ws>/notifications` | Access | STRICT | Create |
| GET | `/workspaces/<ws>/notifications/<notification_id>` | Access | STANDARD | Get |
| POST | `/workspaces/<ws>/notifications/<notification_id>/read` | Access | STRICT | Mark read |
| PATCH | `/workspaces/<ws>/notifications/<notification_id>` | Access | STRICT | Update (delegates to mark_read) |
| POST | `/workspaces/<ws>/notifications/<notification_id>/dismiss` | Access | STRICT | Dismiss |
| POST | `/workspaces/<ws>/notifications/read-all` | Access | STRICT | Mark all read |
| GET | `/workspaces/<ws>/notifications/unread-count` | Access | LENIENT | `{data: {unread_count: int}}` |

**Notification Types (15):** `mention`, `comment`, `update`, `entity_update`, `invite`, `relation_created`, `backup_complete`, `sync_conflict`, `system`, `share`, `version_created`, `export_complete`, `import_complete`, `governance_report_ready`, `system_alert`

### 10.23 Settings

**Blueprint:** `settings` | **Prefix:** `/workspaces/<ws>/settings`

| Method | Path | Auth | Rate Limit | Permission | Description |
|--------|------|------|------------|------------|-------------|
| GET | `/workspaces/<ws>/settings/<category>` | Access | STANDARD | `check_workspace_access` | Get category |
| PUT | `/workspaces/<ws>/settings/<category>` | Access | STRICT | `_require_settings_access` | Update category |
| PATCH | `/workspaces/<ws>/settings` | Access | STRICT | admin check | Multi-category update |
| GET | `/workspaces/<ws>/settings` | Access | STANDARD | `check_workspace_access` | List all (flat?, page) |
| POST | `/workspaces/<ws>/settings/reset` | Access | STRICT | `_require_settings_access` | Reset category or all |

**Valid Categories (10):** `general`, `editor`, `appearance`, `ai`, `performance`, `backups`, `privacy`, `sync`, `keyboard_shortcuts`, `advanced`

### 10.24 Dashboard

**Blueprint:** `dashboard` | **Prefix:** `/workspaces/<ws>/dashboard`

| Method | Path | Auth | Rate Limit | Cache | Description |
|--------|------|------|------------|-------|-------------|
| GET | `/workspaces/<ws>/dashboard/overview` | Access | LENIENT | 60s TTL, 100 max | Entity/block/relation counts + recent entities |
| GET | `/workspaces/<ws>/dashboard/storage` | Access | STANDARD | — | File count, total size, entity count |

### 10.25 AI

**Blueprint:** `ai` | **Prefix:** `/workspaces/<ws>/ai` | **All 501 Not Implemented**

| Method | Path | Auth | Rate Limit |
|--------|------|------|------------|
| POST | `/workspaces/<ws>/ai/query` | Access | STRICT |
| POST | `/workspaces/<ws>/ai/suggest-relations` | Access | STRICT |
| POST | `/workspaces/<ws>/ai/summarize` | Access | STRICT |
| POST | `/workspaces/<ws>/ai/chat` | Access | STRICT |
| POST | `/workspaces/<ws>/ai/complete` | Access | STRICT |
| POST | `/workspaces/<ws>/ai/embed` | Access | STRICT |
| POST | `/workspaces/<ws>/ai/semantic-search` | Access | STRICT |

### 10.26 Jobs (Cloud-Only)

**Blueprint:** `jobs` | **Prefix:** `/workspaces/<ws>/jobs`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/jobs` | Access | STANDARD | List (status?, type?, page) |
| GET | `/workspaces/<ws>/jobs/<job_id>` | Access | STANDARD | Get |
| POST | `/workspaces/<ws>/jobs` | Access | STRICT | Create |
| POST | `/workspaces/<ws>/jobs/<job_id>/running` | Access | STRICT | Mark running |
| POST | `/workspaces/<ws>/jobs/<job_id>/completed` | Access | STRICT | Mark completed |
| POST | `/workspaces/<ws>/jobs/<job_id>/fail` | Access | STRICT | Mark failed |
| POST | `/workspaces/<ws>/jobs/<job_id>/cancel` | Access | STRICT | Cancel |

**Job Statuses (6):** `pending`, `running`, `completed`, `failed`, `cancelled`, `dead_letter`
**Job Priorities (4):** `critical`, `high`, `medium`, `low`
**Job Types (9):** `export_zip`, `import_zip`, `export_markdown`, `export_html`, `export_pdf`, `file_processing`, `governance_report`, `cleanup`, `backup`

### 10.27 Governance (Cloud-Only)

**Blueprint:** `governance` | **Prefix:** `/workspaces/<ws>/governance`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/workspaces/<ws>/governance/reports` | Access | STANDARD | List reports |
| GET | `/workspaces/<ws>/governance/health` | Access | STANDARD | Health score |
| GET | `/workspaces/<ws>/governance/duplicates` | Access | STANDARD | Find duplicates |
| GET | `/workspaces/<ws>/governance/orphans` | Access | STANDARD | Find orphans |
| GET | `/workspaces/<ws>/governance/stale` | Access | STANDARD | Find stale (90+ days) |
| POST | `/workspaces/<ws>/governance/health-score` | Access | STRICT | Force recalculate |
| POST | `/workspaces/<ws>/governance/reports` | Access | STRICT | Create report |
| GET | `/workspaces/<ws>/governance/reports/<report_id>` | Access | STANDARD | Get report |

**Health Score Formula:** `max(0, 100 - min(70, duplicates × 5 + orphans × 2 + stale))`

### 10.28 Admin (Cloud-Only)

**Blueprint:** `admin` | **Prefix:** `/admin` | **Permission:** `@require_admin` + `@cloud_only`

| Method | Path | Auth | Rate Limit | Description |
|--------|------|------|------------|-------------|
| GET | `/admin/users` | Access | STANDARD | List users (search, page) |
| GET | `/admin/users/<user_id>` | Access | STANDARD | Get user |
| PATCH | `/admin/users/<user_id>` | Access | STRICT | Update user |
| DELETE | `/admin/users/<user_id>` | Access | DESTRUCTIVE | Delete user |
| GET | `/admin/system/status` | Access | STANDARD | System status (501) |
| GET | `/admin/system/logs` | Access | STANDARD | System logs (501) |
| POST | `/admin/system/cleanup` | Access | DESTRUCTIVE | System cleanup (501) |

---

## 11. Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `bad_request` | Generic bad request |
| 400 | `cloud_only` | Endpoint only available in cloud mode |
| 400 | `auth_disabled` | Local auth is disabled |
| 400 | `invalid_email` | Email validation failed |
| 400 | `invalid_category` | Invalid settings category |
| 400 | `invalid_file_type` | File type not allowed |
| 400 | `invalid_request_body` | Malformed request body |
| 400 | `code_already_used` | Auth code already consumed |
| 400 | `code_expired` | Auth code has expired |
| 400 | `invalid_archive` | Archive format invalid |
| 400 | `origin_mismatch` | Redirect URI mismatch |
| 400 | `decryption_failed` | Decryption of backup failed |
| 400 | `quota_exceeded` | Storage quota exceeded |
| 400 | `csrf_error` | CSRF validation failed |
| 400 | `upload_error` | File upload failed |
| 401 | `unauthorized` | Authentication required |
| 401 | `token_expired` | JWT token has expired |
| 401 | `invalid_token` | Token is invalid |
| 401 | `token_revoked` | Token has been revoked |
| 401 | `wrong_token` | Wrong token type used |
| 401 | `account_locked` | Account locked (brute force) |
| 401 | `invalid_credentials` | Email/password mismatch |
| 403 | `forbidden` | Insufficient permissions |
| 404 | `not_found` | Resource not found |
| 405 | `method_not_allowed` | HTTP method not allowed |
| 409 | `conflict` | Resource already exists |
| 413 | `payload_too_large` | Request body exceeds limit (100MB max) |
| 415 | `unsupported_media_type` | Unsupported content type |
| 422 | `validation_error` | Schema validation failed |
| 429 | `rate_limit_exceeded` | Rate limit hit |
| 500 | `internal_error` | Unexpected server error |
| 501 | `not_implemented` | Feature not yet implemented |
| 502 | `bad_gateway` | Upstream service error |
| 503 | `service_degraded` | Dependency unavailable |

---

## 12. Security & Middleware

### 12.1 Security Decorators

| Decorator | Behavior |
|-----------|----------|
| `@secured` | Wraps `@jwt_required()`, handles JWT errors |
| `@cloud_only` | Returns 400 `cloud_only` in local mode |
| `@require_local_auth` | Returns 400 if `LOCAL_AUTH_ENABLED=False` |
| `@require_admin` | Checks admin/owner role in at least 1 workspace |
| `check_workspace_access(ws_id)` | Validates user owns workspace (local) or is member (cloud) |
| `check_workspace_role(ws_id, roles)` | Cloud only: checks minimum role level |
| `_require_settings_access(ws_id)` | Access check + cloud admin (settings routes) |
| `_require_member(ws_id, roles)` | Cloud-only membership + optional role check (workspace member routes) |
| `_require_admin(ws_id)` | Cloud-only admin/owner role (properties routes) |
| `transactional` | Wraps function in DB transaction (commit/rollback) |
| `feature_flag(flag)` | Returns 501 if `FEATURE_{flag}_ENABLED` is false |
| `@limiter.limit(...)` | Flask-Limiter per-endpoint rate limiting |

### 12.2 Security Headers

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` |
| `X-XSS-Protection` | `1; mode=block` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` (if secure) |

### 12.3 Input Validation & Sanitization

- **Global:** `before_request` handler strips control characters from all JSON body strings
- **Endpoint-level:** Marshmallow schemas with `unknown = EXCLUDE`
- **Settings:** `_SettingsUpdateSchema` with `unknown = RAISE`
- **HTML:** Stripped of dangerous tags: `script`, `iframe`, `object`, `embed`, `form`, `style`, `link`, `meta`, `base`, `applet`, `frame`, `frameset`, `ilayer`, `layer`, `bgsound`, `audio`, `video`, `canvas`, `svg`
- **Event handlers:** All `on*` attributes removed
- **Protocols:** Only `http://` and `https://` allowed
- **Filename:** Path traversal detection via `..` sequences; special chars replaced with `_`

### 12.4 Security Logging

| Event | Level | Method |
|-------|-------|--------|
| Authentication failure | WARNING | `SecurityLogger.log_auth_failure()` |
| Rate limit hit | INFO | `SecurityLogger.log_rate_limit_hit()` |
| CSRF failure | WARNING | `SecurityLogger.log_csrf_failure()` |
| Suspicious request | ERROR | `SecurityLogger.log_suspicious_request()` |
| Privilege escalation | CRITICAL | `SecurityLogger.log_privilege_escalation()` |

### 12.5 Circuit Breaker

- States: `CLOSED` → `OPEN` → `HALF_OPEN` → `CLOSED`
- Configurable: `failure_threshold` (default 5), `recovery_timeout` (default 60s)
- Used for S3 operations to prevent cascading failures

### 12.6 Logging

- **Framework:** structlog
- **Format:** JSON (default) or console via `LOG_FORMAT`
- **Level:** Configurable via `LOG_LEVEL` (default INFO)
- **Sensitive data redaction:** Keys matching `password|secret|token|jwt|authorization|api_key|api_secret|access_key|private_key` → `***REDACTED***`

---

## 13. Monitoring & Metrics

### Metrics Endpoint

**`GET /metrics`** — Prometheus text format at `/metrics`

### MetricsCollector

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `gnovium_requests_total` | Counter | method, path, status | Request count |
| `gnovium_request_duration_seconds` | Histogram | le (buckets) | Request duration |
| `gnovium_errors_total` | Counter | type | Error count |
| `gnovium_active_connections` | Gauge | — | Active connections |
| `gnovium_uptime_seconds` | Gauge | — | Application uptime |

**Histogram buckets (s):** `0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10`

### Health Endpoint

**`GET /health`** response:
```json
{
  "service": "gnovium-api",
  "status": "healthy" | "degraded",
  "dependencies": {
    "database": "ok" | "error: ...",
    "redis": "ok" | "unavailable" | "error: ...",
    "db_pool": {"size": 5, "checked_in": 3, "checked_out": 2, "overflow": 0}
  }
}
```

---

## 14. Non-Functional Requirements

### Performance
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTI** (Time to Interactive): < 3.5s
- **Editor keystroke latency**: < 16ms (60fps)
- **Graph render** (1000 nodes): < 500ms initial, 60fps interaction
- **Search results**: < 200ms for keyword, < 500ms for semantic

### Accessibility
- WCAG 2.1 AA compliance minimum.
- Keyboard navigable throughout.
- Screen reader compatible (ARIA labels, live regions).
- Focus management in modals and panels.
- Color contrast ratios meeting AA standards.

### PWA Support
- Service worker for offline caching.
- Installable on desktop and mobile.
- Offline indicator with sync queue.
- Background sync for pending changes.

### Internationalization (i18n)
- All user-facing strings externalized.
- Ready for RTL layout support.
- Date/time formatting via `Intl` API.
- Number formatting locale-aware.

### Security
- CSRF protection on all state-changing requests.
- XSS prevention via React's escaping + CSP headers.
- Rate limiting: 600 req/min (cloud), 1200 req/min (local) — returns `429` with `Retry-After` header.
- Input sanitization on all user content.
- Secure cookie attributes (`httpOnly`, `secure`, `sameSite=Lax`).
- No secrets in client bundle (all via `NEXT_PUBLIC_` prefix).
- JWT access token (30 min) + refresh token (30 day) with server-side revocation.

### Error Handling
- Global error boundary (React).
- API error normalization (consistent error shapes).
- Retry logic with exponential backoff.
- Graceful degradation (show stale data vs. error).
- User-friendly error messages (no technical jargon).

### Testing
- **Unit**: Vitest for utilities, hooks, stores.
- **Component**: Vitest + React Testing Library.
- **E2E**: Playwright (critical paths: auth, editor, graph, search).
- **Visual Regression**: Chromatic / Percy (optional).
- **Accessibility**: axe-core integration in CI.

---

## 15. Deployment

### Vercel (Primary)
- Auto-deploy from `main` branch.
- Preview deployments for PRs.
- Environment variables per branch.
- Edge functions for auth middleware.

### Docker (Self-Hosted)
- Multi-stage build (deps → build → runner).
- Standalone Next.js output.
- Health check endpoint.
- Configurable via environment variables.

### CI/CD Pipeline
1. Lint (ESLint + Prettier)
2. Type check (TypeScript)
3. Unit tests (Vitest)
4. Build (Next.js)
5. E2E tests (Playwright, optional)
6. Deploy (Vercel / Docker)

---

## 16. Future Evolution (Post-V1)

| Feature | Priority | Notes |
|---------|----------|-------|
| Real-time collaboration (CRDT) | High | Multi-user editing with conflict resolution |
| AI agent workflows | High | Multi-step AI automation with approval gates |
| Mobile app (React Native) | Medium | Shared business logic with web |
| Browser extension | Medium | Quick capture, entity creation from any page |
| API public documentation | Medium | Interactive API explorer |
| Webhook integrations | Medium | Zapier, Make, custom |
| Audit log | Low | Compliance-focused activity tracking |
| SSO / SAML | Low | Enterprise authentication |
| Custom entity types | Low | User-defined entity schemas |

---

**This is the complete, final, self-contained specification.**

It covers all 221 API endpoints across 28 blueprints, all 36 PostgreSQL database tables, all 30+ error codes, all 8 rate limit categories, all 15 notification types, all 22 block types, all 12 property types, all 6 job statuses, all 7 export formats, the complete security model, monitoring infrastructure, and every data model interface with full field-level detail.

Ready for handoff to design and development teams.
