# Gnovium Cloud Web — Application Specification (V1)

**Version:** 1.0
**Date:** July 11, 2026
**Status:** Comprehensive, Self-Contained, Production-Ready

---

## 1. Overview & Design Principles

**Gnovium Cloud** is the collaborative, multi-tenant SaaS web application (`https://app.gnovium.com`). It delivers the full feature set defined in the Gnovium V1 documentation while adding team collaboration, user management, and cloud infrastructure capabilities.

It maintains **perfect parity** with the Local/Electron desktop version in data model, API contracts, and core experience, while extending it with multi-user support, real-time signals, sync orchestration, and centralized governance.

### Core Philosophy

- **Start local. Scale to cloud with zero migration.**
- **Safety-first AI with explicit approval gates.**
- **Type-safe divinity from database to pixel.**
- **Offline-resilient, then online-supreme.**

### Tech Stack

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

## 2. Authentication & Onboarding

### 2.1 Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing / marketing redirect |
| `/auth` | Unified authentication page (sign-in + sign-up tabs, Google OAuth) |
| `/auth?tab=signup` | Auth page with sign-up tab pre-selected |
| `/auth?source=desktop` | Auth page for Electron desktop app (shows "Link Desktop App" heading) |
| `/onboarding` | Post-registration workspace creation wizard |
| `/auth/callback` | OAuth callback handler |

### 2.2 Sign-In Flow

1. User navigates to `/auth` (sign-in tab is default).
2. User enters email + password (or clicks Google OAuth).
3. Backend validates credentials, returns JWT access + refresh tokens.
4. If `?source=desktop` param present: after successful auth, generate one-time code via `POST /auth/exchange-code`, then redirect to `gnovium-auth://callback?code={code}` (custom protocol for Electron).
5. Tokens stored in Zustand persist (localStorage key: `gnovium-auth`).
6. Session restored on page load via `GET /auth/me`.
7. Silent token refresh via `POST /auth/refresh` when access token expires. Refresh **rotates** both tokens: revokes old session, issues new access + refresh token pair.
8. Google OAuth: if no account exists, auto-creates account from Google profile.

### 2.2a Desktop App Integration (Electron)

When the Electron desktop app needs to authenticate, it opens a BrowserWindow to `https://gnovium.com/auth?source=desktop`.

**Detection:**
- The auth page reads `searchParams.get("source") === "desktop"` to detect Electron.
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
- The exchange endpoint is rate-limited (10/minute).
- Tokens never leave the Electron main process — renderer accesses via IPC only.

### 2.3 Sign-Up Flow

1. User switches to the sign-up tab on `/auth`.
2. User enters full name, email, password.
3. Real-time email availability check (`GET /auth/check-email?email=...`).
4. Password strength validation (min 8 chars).
5. Optional: upload custom avatar (presigned URL to S3). On success, add to user record. On failure, remove from S3, do not add to DB.
6. Default identicon avatar assigned (DiceBear) if no custom avatar uploaded.
7. Account created → signed in automatically → redirect to home (or `gnovium-auth://` redirect if desktop).

### 2.3a Google OAuth Flow

1. User clicks "Sign in with Google" on the auth page.
2. Google OAuth popup/redirect completes.
3. Backend receives Google credential token.
4. If email exists in DB → sign in (create session, return tokens).
5. If email not in DB → create account from Google profile (name, email, avatar, google_id) → sign in.
6. Returns same token shape as email/password login.
7. If `?source=desktop` is present: after login, exchange code and redirect to `gnovium-auth://`.

### 2.4 Onboarding Flow

1. Create first workspace (name, optional description).
2. Choose workspace accent color.
3. Invite team members (optional, skip-able).
4. Redirect to workspace dashboard.

### 2.5 Workspace Invitation Flow

1. Admin invites user by email from workspace settings (role selection: Viewer, Editor, Admin).
2. Backend adds user as active workspace member directly (user must already have an account).
3. Invited user receives notification in-app.
4. Role assigned on invite (default: Editor).

### 2.6 Token Handling

- **Access Token**: Short-lived (30 min), JWT, contains `userId`, `workspaceId`, `role`.
- **Refresh Token**: Long-lived (30 days), JWT tracked via session record, supports revocation. Token refresh **rotates** both tokens: revokes old session, issues new access + refresh pair.
- **Logout**: Clear localStorage (Zustand persist), revoke session server-side. Each token pair creates a `Session` record; logout revokes the session.
- **Desktop App**: Tokens stored encrypted in `<userData>/auth.json` via Electron safeStorage (OS keychain). Renderer never holds raw tokens — all token operations go through IPC to main process.

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
- `ExportModal` — Export format selection (JSON, Markdown, CSV)
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
- Block-based editing (14 block types: text, heading_1, heading_2, heading_3, bulleted_list, numbered_list, to_do, code, quote, callout, image, divider, table, toggle).
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
- Graph traversal: shortest path between two entities.
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

**Management:**
- Grid / list view toggle.
- Sort by name, size, type, date.
- Filter by type, size, linked status.
- Storage usage indicator.

### 5.8 Governance (`/workspace/[id]/governance`)

**Dashboard:**
- Overall health score (0-100).
- Breakdown by category.

**Categories:**
| Category | Checks |
|----------|--------|
| Duplicates | Near-identical entities detected by AI |
| Orphans | Entities with no incoming/outgoing relations |
| Stale Content | Entities not modified in >30/60/90 days |
| Broken Links | References to deleted/non-existent entities |
| Naming Issues | Inconsistent naming patterns |
| Size Warnings | Entities with excessive content |

**Actions:**
- Review each issue with AI suggestion.
- Bulk resolve (merge duplicates, delete orphans, archive stale).
- Generate governance report (PDF/Markdown).
- Schedule recurring scans.
- View background job status and history.

### 5.9 Activity & Notifications

#### Activity Log (`/workspace/[id]/activity`)
- Chronological feed of all workspace actions.
- Filterable by user, action type, entity, date range.
- Action types: create, edit, delete, archive, restore, comment, share, AI action.

#### Notifications Center
- Real-time notifications via WebSocket.
- Notification types:
  - Entity mentioned / shared with you.
  - Comment on your entity.
  - AI suggestion ready for review.
  - Workspace invite received.
  - Governance issue detected.
  - Sync completed.
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

**Offline Support:**
- Queue changes locally when offline.
- Show pending changes count.
- Auto-sync when connection restored.
- Conflict detection on sync.

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
/auth                                      → Unified auth page (sign-in + sign-up tabs)
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
/workspace/[id]/entities                  → Entities browse
/workspace/[id]/settings/entity-types    → Entity type management
/workspace/[id]/settings/notifications   → Notification preferences

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
│   │   ├── page.tsx              # Unified auth page (sign-in + sign-up tabs)
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
│   │   ├── MentionMenu.tsx
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

> Models match the backend API response shapes exactly. All IDs are UUIDs. All timestamps are ISO 8601 UTC.

```typescript
// ─── Auth & Users ───────────────────────────────────────────────────

interface User {
  id: string;                    // UUID
  email: string;
  name: string | null;
  avatar_url: string | null;     // DiceBear URL or uploaded URL
  profile_image_url?: string | null;  // Optional profile image
  password_hash: string | null;
  google_id: string | null;
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}

interface AuthTokens {
  access_token: string;          // JWT, 30 min expiry
  refresh_token: string;         // JWT, 30 day expiry (returned on login/register/refresh)
  token_type: string;            // "bearer"
  expires_in: number;            // 1800 (30 min)
}

// POST /auth/refresh response: { data: { access_token, refresh_token, token_type, expires_in } }
// Note: Refresh **rotates** both tokens — the old session is revoked and a new access + refresh pair is issued.

// ─── Workspaces ─────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;                  // 1-80 chars
  description: string | null;
  icon: string | null;
  color: string | null;          // hex accent color e.g. "#4f46e5"
  owner_id: string;
  my_role: 'viewer' | 'editor' | 'admin' | 'owner';  // current user's role in workspace
  entity_count: number;
  block_count: number;
  deployment_mode: 'local' | 'cloud';
  settings: Record<string, unknown>;  // arbitrary key-value config
  sync_enabled: boolean;         // cloud-only: personal sync flag
  cloud_workspace_id: string | null;  // cloud-only: remote workspace ID
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  // Note: 'owner' role is not assignable via API — only set during workspace creation/transfer
  email: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
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
  workspace_id: string;
  type: string;                  // entity type slug (resolved from entity_type_id)
  name: string | null;           // mirrors DB `title` column
  icon: string | null;
  color: string | null;
  cover_image: string | null;
  parent_id: string | null;      // parent entity ID (for tree hierarchy)
  sort_order: number;
  tags: string[];                // array of tag IDs
  summary: string | null;
  properties: Record<string, unknown>;  // custom property values
  is_favorite: boolean;
  is_archived: boolean;
  archived_at: string | null;
  block_count: number;
  created_by: string | null;     // FK → users.id
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityType {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  color: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

type PropertyType = 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'rich_text' | 'boolean' | 'entity_ref';

interface EntityProperty {
  id: string;
  workspace_id: string;
  name: string;
  type: PropertyType;            // mirrors DB `property_type`
  options: unknown[];            // e.g. ["Low", "Medium", "High"] for select types
  default_value: unknown;
  entity_type: string | null;    // entity_type_id or slug
  required: boolean;
  description: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityPropertyValue {
  id: string;
  entity_id: string;
  property_id: string;
  value: unknown;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface WorkspaceSettings {
  default_entity_type: string;
  allow_public_sharing: boolean;
  versioning_enabled: boolean;
  auto_save_interval: number;
  ai_features_enabled: boolean;
  export_format: string;
  timezone: string;
  locale: string;
  storage_quota: number;
  storage_used: number;
}

// ─── Blocks ─────────────────────────────────────────────────────────

type BlockType =
  | 'text' | 'heading1' | 'heading2' | 'heading3'
  | 'bullet_list' | 'ordered_list'
  | 'code' | 'quote' | 'callout' | 'divider'
  | 'image' | 'file' | 'video' | 'audio' | 'bookmark'
  | 'table' | 'toggle'
  | 'embed' | 'equation' | 'mermaid' | 'excalidraw' | 'drawio';
// Note: No server-side validation on block_type — any string is accepted. The 22 types above are the client-enforced set.

type BlockContent =
  | { text: string }                                          // text, heading1-3, bullet_list, ordered_list, quote
  | { text: string; language: string }                        // code
  | { text: string; icon: string }                            // callout
  | { text: string; open: boolean }                           // toggle
  | { url: string; alt: string; name: string }                // image, file, video, audio, bookmark
  | Record<string, never>                                     // divider
  | { rows: unknown[]; columns: unknown[] }                   // table
  | { code: string; language: string };                       // embed, equation, mermaid, excalidraw, drawio

interface Block {
  id: string;
  entity_id: string;
  type: string;                  // block type slug (mirrors DB `block_type`)
  position: number;              // NUMERIC(20,10) for ordering
  content: BlockContent;
  properties: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

// ─── Relations ──────────────────────────────────────────────────────

interface Relation {
  id: string;
  workspace_id: string;
  source_id: string;             // source_entity_id
  target_id: string;             // target_entity_id
  type: string;                  // relation_type: "refers_to", "depends_on", "part_of", etc.
  label: string | null;          // display label
  properties: Record<string, unknown>;
  generated_by: 'manual' | 'ai';
  verified: boolean;
  confidence: number | null;     // 0.0-1.0, null for manual
  ai_model: string | null;       // e.g. "Qwen2.5-3B-Instruct v1"
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Tags ───────────────────────────────────────────────────────────

interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;          // hex color e.g. "#ff4444"
  entity_count: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityTag {
  id: string;
  tag_id: string;
  entity_id: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Comments ───────────────────────────────────────────────────────

interface Comment {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  block_id: string | null;
  parent_id: string | null;      // parent_comment_id for threading
  user_id: string;               // author
  display_name: string;
  avatar_url: string | null;
  content: Record<string, unknown>;  // { text: "..." }
  resolved: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Branches ───────────────────────────────────────────────────────

interface Branch {
  id: string;
  workspace_id: string;
  parent_branch_id: string | null;
  name: string;
  description: string | null;
  is_default: boolean;
  is_locked: boolean;
  created_by: string | null;     // FK → users.id
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Versions & Diffs ───────────────────────────────────────────────

interface Changeset {
  id: string;
  branch_id: string;
  snapshot_id: string | null;
  message: string | null;
  created_by: string | null;     // FK → users.id
  created_at: string;
}

interface Snapshot {
  id: string;
  branch_id: string;
  name: string | null;
  description: string | null;
  created_by: string | null;     // FK → users.id
  created_at: string;
}

interface EntityVersion {
  id: string;
  entity_id: string;
  branch_id: string | null;
  changeset_id: string | null;   // FK → changesets (raw DB column)
  snapshot_id: string | null;
  version: number;               // entity's version_number at snapshot
  message: string | null;
  snapshot: Record<string, unknown>;  // JSONB: full entity snapshot at this version
  content_hash: string;          // SHA-256 of snapshot for integrity
  created_by: string | null;
  created_at: string;
}

interface BlockVersion {
  id: string;
  block_id: string;
  changeset_id: string | null;   // FK → changesets (raw DB column)
  snapshot: Record<string, unknown>;  // JSONB: full block snapshot at this version
  content_hash: string;          // SHA-256 of snapshot for integrity
  created_at: string;
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

// RestoreResult: API returns the full restored Entity object (same shape as GET /entities/<id>)
type RestoreResult = Entity;

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

// ─── Governance ─────────────────────────────────────────────────────

interface GovernanceReport {
  id: string;
  workspace_id: string;
  type: string;                  // "access_audit", "change_log", "storage_summary", "activity_summary", "compliance"
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  data: Record<string, unknown> | null;
  params: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
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

type JobPriority = 'critical' | 'high' | 'medium' | 'low';

interface FileRecord {
  id: string;
  workspace_id: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  content_hash: string;
  state: FileState;              // cloud-only: PENDING → UPLOADED → VALIDATING → READY → QUARANTINED/DELETED
  storage_provider: string;      // 'local' | 'aws_s3'
  object_key: string;
  uploaded_by: string | null;
  uploaded_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  has_extracted_text: boolean;   // true if extracted_text is not null
  has_metadata: boolean;         // true if metadata_json is not null
  variants: FileVariant[];       // local-only: generated variants
}

/** Variant types: thumbnail (256×256, WebP, Q80), preview (1024×1024, WebP, Q85), optimized (original, WebP, Q85) */
interface FileVariant {
  id: string;
  file_id: string;
  variant_type: string;
  object_key: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  file_size: number;
  algorithm: string | null;      // e.g. "Pillow", "libvips"
  algorithm_version: string | null;
  quality: number | null;        // 0-100
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

interface EntityFile {
  id: string;
  entity_id: string;
  file_id: string;
  block_id: string | null;
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
  has_extracted_text?: boolean;  // present on single-file GET response
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

// ─── File Request Schemas ──────────────────────────────────────────

interface PresignUploadSchema {
  workspace_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  content_hash: string;
}

interface MultipartInitSchema {
  workspace_id: string;
  content_type: string;
  file_size: number;
  file_name: string;
  content_hash?: string;         // SHA-256 for dedup
}

interface MultipartPartSchema {
  PartNumber: number;
  ETag: string;
}

interface MultipartCompleteSchema {
  workspace_id: string;
  upload_id: string;
  file_id: string;
  parts: MultipartPartSchema[];
}

interface QuarantineResolveSchema {
  approve: boolean;
}

// ─── Notifications ──────────────────────────────────────────────────

interface Notification {
  id: string;
  workspace_id: string;
  user_id: string;
  entity_id: string | null;
  type: 'mention' | 'comment' | 'update' | 'entity_update' | 'relation_created' | 'backup_complete' | 'sync_conflict' | 'invite' | 'system' | 'share' | 'version_created' | 'export_complete' | 'import_complete' | 'governance_report_ready' | 'system_alert';
  title: string;
  body: string | null;           // notification body text
  data: Record<string, unknown>; // e.g. { entity_id, block_id }
  is_read: boolean;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Activity ───────────────────────────────────────────────────────

interface ActivityEntry {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  user_id: string | null;       // null for system events
  display_name: string | null;
  action: string;               // "entity.create", "entity.update", "block.create", "update", "delete", etc.
  resource_type: string | null; // "entity", "block", "file", "relation", etc.
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ─── Jobs (Cloud-Only) ──────────────────────────────────────────────

interface Job {
  id: string;
  workspace_id: string | null;
  type: string;                 // job_type
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;             // 0-100
  message: string | null;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
  priority: JobPriority;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  retry_count: number;
  max_retries: number;
  timeout_seconds: number | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Sync ───────────────────────────────────────────────────────────

interface SyncOperation {
  id: string;
  workspace_id: string;
  operation_type: string;       // "entity_create", "entity_update", "entity_delete",
                                // "block_create", "block_update", "block_delete",
                                // "relation_create", "relation_delete"
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  device_id: string | null;
  client_clock: number | null;
  synced: boolean;              // raw DB column: true once client acks
  synced_at: string | null;     // timestamp of client acknowledgment
  status: 'pending' | 'applied' | 'acked';  // derived from synced + synced_at
  retry_count: number;
  error_message: string | null;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

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
    code: string;               // "not_found", "validation_error", "unauthorized", etc.
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─── Cloud-Only: Sessions ─────────────────────────────────────────

interface SessionRecord {
  id: string;
  user_id: string;
  refresh_jti: string;          // refresh token JTI claim
  user_agent: string | null;
  ip_address: string | null;
  revoked_at: string | null;
  expires_at: string;
  created_at: string;
}

// ─── Branch Merges ────────────────────────────────────────────────

interface BranchMerge {
  id: string;
  source_branch_id: string;
  target_branch_id: string;
  created_by: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';  // default: 'completed'
  metadata: Record<string, unknown>;
  created_at: string;
}

interface MergeConflict {
  id: string;
  merge_id: string;
  entity_id: string;
  conflict_type: string;
  details: Record<string, unknown>;
  resolved: boolean;
  resolved_by: string | null;
  resolution: string | null;
  resolved_at: string | null;
}

// ─── Entity Branch Heads ──────────────────────────────────────────

interface EntityBranchHead {
  id: string;
  branch_id: string;
  entity_id: string;
  current_version_id: string | null;   // PostgreSQL: FK → entity_versions
  base_version_id: string | null;      // PostgreSQL: FK → entity_versions (for merge)
}

// ─── Embeddings ───────────────────────────────────────────────────

interface Embedding {
  id: string;
  workspace_id: string;
  entity_id: string | null;
  block_id: string | null;
  model: string;                // e.g. "BGE-M3"
  embedding: unknown;           // vector(1024) pgvector in cloud
  content_hash: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Search Documents ─────────────────────────────────────────────

interface SearchDocument {
  id: string;
  workspace_id: string;
  entity_id: string;
  block_id: string | null;
  title: string | null;
  content: string | null;       // concatenated block text
  content_hash: string;
  search_vector: unknown;       // TSVectorType in cloud
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}

// ─── Entity Events ────────────────────────────────────────────────

interface EntityEvent {
  id: string;
  workspace_id: string;
  entity_id: string;
  user_id: string | null;
  changeset_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}
```

---

## 10. API Contract (All Endpoints)

> Base URL: `/api/v1/` prefix for all endpoints except `/health` and `/metrics`.
> Auth: `Authorization: Bearer <token>` header. Public routes: `GET /auth/authorize`, `POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `POST /auth/exchange`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /health`.
> Pagination: `?page=1&per_page=50` (max 50). All timestamps ISO 8601 UTC.
> Rate limits are per-client-IP, keyed by `request.access_route[0]`:

| Rate Limit Category | Value | Applied To |
|---|---|---|
| `AUTH_WRITE` | **5/min** | Register, login, google, authorize (POST) |
| `PASSWORD_RESET` | **3/min** | Forgot-password, reset-password |
| `DESTRUCTIVE` | **10/min** | Exchange-code, exchange, backup create/restore/import/export, admin user delete, versions delete, snapshots delete, export-zip-encrypted, import-zip |
| `FILE_UPLOAD` | **10/min** | File upload (multipart) |
| `FILE_DOWNLOAD` | **60/min** | File download |
| `STRICT` | **30/min** | All mutation endpoints (POST/PATCH/DELETE) across all blueprints |
| `STANDARD` | **120/min** | All read (GET) endpoints across all blueprints |
| `LENIENT` | **300/min** | Dashboard overview, notifications unread-count |

### 10.1 System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | — | Liveness check → `{"status":"healthy","mode":"local\|cloud","database":"connected\|disconnected","redis":"enabled\|disabled","s3":"enabled\|disabled","version":"2.0.0","timestamp":"..."}` |
| GET | `/metrics` | SuperAdmin | Prometheus metrics |

### 10.2 Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| GET | `/auth/authorize` | — | STANDARD (120/min) | Webview OAuth redirect (302 to web app login page) |
| POST | `/auth/authorize` | Access | AUTH_WRITE (5/min) | Generate one-time code for desktop app auth (5-min TTL) |
| POST | `/auth/register` | — | AUTH_WRITE (5/min) | Create account (email, password, name?) → nested tokens + user |
| POST | `/auth/login` | — | AUTH_WRITE (5/min) | Sign in (email, password) → nested tokens + user |
| POST | `/auth/google` | — | AUTH_WRITE (5/min) | Sign in with Google OAuth (credential token) → nested tokens + user + `is_new_user` |
| GET | `/auth/check-email` | — | STANDARD (120/min) | Check email availability → `{ data: { available: boolean } }` |
| POST | `/auth/refresh` | Refresh | STANDARD (120/min) | Rotate tokens (revokes old session, issues new access + refresh pair, NO user field) |
| POST | `/auth/logout` | Access/Refresh | STANDARD (120/min) | Revoke session (accepts access OR refresh token) → `{ data: { revoked: true } }` |
| GET | `/auth/me` | Access | STANDARD (120/min) | Get authenticated user profile (id, email, name, avatar_url, profile_image_url, google_id) |
| PATCH | `/auth/me` | Access | STRICT (30/min) | Update profile (name, avatar_url, profile_image_url) |
| POST | `/auth/exchange-code` | Access | DESTRUCTIVE (10/min) | Generate one-time code for desktop app (cloud-only) |
| POST | `/auth/exchange` | — | DESTRUCTIVE (10/min) | Exchange one-time code for tokens + user |
| POST | `/auth/change-password` | Access | STRICT (30/min) | Change password (old_password, new_password) |
| POST | `/auth/forgot-password` | — | PASSWORD_RESET (3/min) | Request password reset email |
| POST | `/auth/reset-password` | — | PASSWORD_RESET (3/min) | Reset password using token |
| POST | `/auth/profile-changed` | Access | STANDARD (120/min) | Check if profile changed since timestamp → `{ data: { changed, profile? } }` |

**Register / Login Response:**
```json
{
  "data": {
    "tokens": { "access_token": "eyJ...", "refresh_token": "eyJ..." },
    "user": { "id": "uuid", "email": "...", "name": "...", "avatar_url": null }
  }
}
```

**Refresh Response:**
```json
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

> **Refresh behaviour:** The existing refresh token is revoked and a **new** access + refresh token pair is issued (rotation). The `token_type` and `expires_in` fields are only present in the refresh and exchange responses (not in register/login).

**Exchange Code (Desktop App Flow):**

POST /auth/exchange-code (authenticated, cloud-only)
→ Generates UUID code, 5-min expiry, single use
→ Response: `{ "data": { "code": "uuid" } }`

POST /auth/exchange (unauthenticated)
→ Validates code against auth_codes table (requires `code` min 10 chars, optional `redirect_uri`)
→ Returns same shape as exchange (flat: access_token, refresh_token, token_type, expires_in, user)
→ Rate limited: 10/minute (DESTRUCTIVE)

### 10.3 Workspaces

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/workspaces/` | Access | STANDARD (120/min) | List user's workspaces (paginated, searchable) |
| POST | `/workspaces/` | Access | STRICT (30/min) | Create workspace (name, description, icon, color) |
| GET | `/workspaces/<id>` | Access | STANDARD (120/min) | Get workspace details (includes my_role, entity_count, block_count) |
| PATCH | `/workspaces/<id>` | Admin | STRICT (30/min) | Update workspace (name, icon, color) |
| DELETE | `/workspaces/<id>` | Admin | STRICT (30/min) | Delete workspace (cascades to all data) → `{ data: { message: "Workspace deleted" } }` |
| GET | `/workspaces/<id>/stats` | Access | STANDARD (120/min) | Workspace overview statistics |
| GET | `/workspaces/<id>/members` | Access | STANDARD (120/min) | **Cloud-only.** List workspace members (paginated, searchable) |
| POST | `/workspaces/<id>/members/invite` | Admin | STRICT (30/min) | **Cloud-only.** Invite member by email (email, role) → `{ data: { id, user_id, role, status } }` |
| PATCH | `/workspaces/<id>/members/<member_id>` | Admin | STRICT (30/min) | **Cloud-only.** Update member role (role: viewer/editor/admin) |
| DELETE | `/workspaces/<id>/members/<member_id>` | Admin | STRICT (30/min) | **Cloud-only.** Remove member from workspace → `{ data: { message: "Member removed" } }` |

### 10.4 Entities

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/workspaces/<workspace_id>/entities` | Access | STANDARD (120/min) | List entities (paginated, filterable by type, tags, sort, search, deleted) |
| POST | `/workspaces/<workspace_id>/entities` | Access | STRICT (30/min) | Create entity (type, name, icon, color, parent_id, tags, summary) |
| GET | `/workspaces/<workspace_id>/entities/<id>` | Access | STANDARD (120/min) | Get entity details (entity wrapped under `entity` key, plus blocks and storage_used) |
| PATCH | `/workspaces/<workspace_id>/entities/<id>` | Access | STRICT (30/min) | Update entity (name, icon, color, is_favorite, is_archived, tags, summary) |
| DELETE | `/workspaces/<workspace_id>/entities/<id>` | Access | STRICT (30/min) | Soft-delete entity (sets deleted_at) |
| DELETE | `/workspaces/<workspace_id>/entities/<id>/permanent` | Admin | STRICT (30/min) | Permanently delete entity (must be soft-deleted first) |
| POST | `/workspaces/<workspace_id>/entities/<id>/restore` | Access | STRICT (30/min) | Restore deleted entity within retention window |
| POST | `/workspaces/<workspace_id>/entities/<id>/archive` | Access | STRICT (30/min) | Archive entity (hide from default views) |
| POST | `/workspaces/<workspace_id>/entities/<id>/duplicate` | Access | STRICT (30/min) | Duplicate entity metadata (name, icon, type) — blocks/properties/relations NOT copied |
| GET | `/workspaces/<workspace_id>/entities/<id>/children` | Access | STANDARD (120/min) | List child entities (paginated) |
| POST | `/workspaces/<workspace_id>/entities/<id>/children` | Access | STRICT (30/min) | Create child entity (requires type in body) |

**List Entity Response:**
```json
{
  "data": [
    {
      "id": "uuid", "workspace_id": "uuid",
      "type": "note", "name": "My Note", "icon": "📝",
      "color": "#4f46e5", "parent_id": null, "sort_order": 0,
      "tags": ["tag-uuid"], "summary": "...",
      "is_favorite": false, "is_archived": false,
      "deleted_at": null,
      "created_at": "...", "updated_at": "...",
      "block_count": 5
    }
  ],
  "meta": { "page": 1, "per_page": 30, "total": 42, "pages": 2 }
}
```

**Get Entity Response:**
```json
{
  "data": {
    "entity": { "id": "uuid", "workspace_id": "uuid", "type": "note", "name": "My Note", "icon": "📝", "color": "#4f46e5", "parent_id": null, "sort_order": 0, "tags": ["tag-uuid"], "summary": "...", "is_favorite": false, "is_archived": false, "deleted_at": null, "created_at": "...", "updated_at": "...", "block_count": 5 },
    "blocks": [ { "id": "uuid", "type": "text", "content": {}, "position": 0, "version": 3 } ],
    "storage_used": 1024
  }
}
```

### 10.5 Blocks

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/blocks/` | Access | STANDARD (120/min) | List blocks for entity (?entity_id=uuid — returns current non-deleted blocks) |
| POST | `/blocks/` | Access | STRICT (30/min) | Create block (entity_id, type, content, position, parent_block_id, properties, branch_id, indent) |
| GET | `/blocks/<id>` | Access | STANDARD (120/min) | Get block details (latest version) |
| PATCH | `/blocks/<id>` | Access | STRICT (30/min) | Update block (type, content, position, properties) |
| POST | `/blocks/<id>/move` | Access | STRICT (30/min) | Move block to new parent/position/entity (parent_block_id, position, indent, entity_id) |
| DELETE | `/blocks/<id>` | Access | STRICT (30/min) | Soft-delete block |
| POST | `/blocks/reorder` | Access | STRICT (30/min) | Batch reorder blocks (blocks: [{id, position}]) → `{ data: { reordered: 2 } }` |
| GET | `/blocks/entity/<entity_id>` | Access | STANDARD (120/min) | List blocks for entity (shorthand) |

**Block Types:** `text`, `heading1`, `heading2`, `heading3`, `bullet_list`, `ordered_list`, `code`, `quote`, `callout`, `divider`, `image`, `file`, `video`, `audio`, `bookmark`, `table`, `toggle`, `embed`, `equation`, `mermaid`, `excalidraw`, `drawio`

**Content Shapes:**
| Block Type | Content |
|-----------|---------|
| `text` / `heading1-3` / `bullet_list` / `ordered_list` / `quote` | `{ "text": "..." }` |
| `to_do` | `{ "text": "...", "checked": false }` |
| `code` | `{ "text": "...", "language": "python" }` |
| `callout` | `{ "text": "...", "icon": "💡" }` |
| `image` / `file` / `video` / `audio` / `bookmark` | `{ "url": "...", "alt": "...", "name": "..." }` |
| `divider` | `{}` |
| `table` | `{ "rows": [...], "columns": [...] }` |
| `toggle` | `{ "text": "...", "open": false }` |
| `embed` / `equation` / `mermaid` / `excalidraw` / `drawio` | `{ "code": "...", "language": "..." }` |

### 10.6 Relations

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/relations/` | Access | STANDARD (120/min) | List relations (paginated, filterable by workspace_id, entity_id, target_id, type) |
| POST | `/relations/` | Access | STRICT (30/min) | Create relation (workspace_id, source_id, target_id, type, label, properties, generated_by, confidence) |
| GET | `/relations/<id>` | Access | STANDARD (120/min) | Get relation details |
| DELETE | `/relations/<id>` | Access | STRICT (30/min) | Soft-delete relation |
| POST | `/relations/batch` | Access | STRICT (30/min) | Batch create relations (atomic, admin only) |
| GET | `/relations/entity/<entity_id>` | Access | STANDARD (120/min) | Get outgoing relations (entity is source) |
| GET | `/relations/backlinks/<entity_id>` | Access | STANDARD (120/min) | Get incoming relations (entity is target — "who links to me") |
| GET | `/relations/neighbors/<entity_id>` | Access | STANDARD (120/min) | Get all connected entities with relation types (for graph renderer) |
| GET | `/relations/path` | Access | STANDARD (120/min) | Find shortest path (?source_entity_id=uuid&target_entity_id=uuid) |

**Relation Types (examples):** `depends_on`, `relates_to`, `parent_of`, `child_of`, `references`, `references_by`, `implements`, `implemented_by`, `extends`, `extended_by`, `custom`

**Response:**
```json
{
  "data": [{
    "id": "uuid", "workspace_id": "uuid",
    "source_id": "uuid", "target_id": "uuid",
    "type": "depends_on", "label": "depends on",
    "properties": {},
    "created_at": "...", "updated_at": "..."
  }]
}
```

### 10.7 Tags

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/tags/` | Access | STANDARD (120/min) | List tags (paginated, filterable by workspace_id) |
| POST | `/tags/` | Access | STRICT (30/min) | Create tag (workspace_id, name, color) |
| GET | `/tags/<id>` | Access | STANDARD (120/min) | Get tag details |
| PATCH | `/tags/<id>` | Access | STRICT (30/min) | Update tag (name, color) |
| DELETE | `/tags/<id>` | Access | STRICT (30/min) | Delete tag |
| POST | `/tags/<tag_id>/entities/<entity_id>` | Access | STRICT (30/min) | Tag an entity (no body needed) |
| DELETE | `/tags/<tag_id>/entities/<entity_id>` | Access | STRICT (30/min) | Untag an entity |

### 10.8 Comments

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/comments/` | Access | STANDARD (120/min) | List comments (filterable by entity_id, parent_id, workspace_id) |
| POST | `/comments/` | Access | STRICT (30/min) | Create comment (workspace_id, entity_id, block_id, content, parent_id for threading) |
| GET | `/comments/<id>` | Access | STANDARD (120/min) | Get comment |
| PATCH | `/comments/<id>` | Access | STRICT (30/min) | Update comment content or resolved status |
| DELETE | `/comments/<id>` | Access | STRICT (30/min) | Soft-delete comment (owner or admin) |

### 10.9 Branches

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/branches/` | Access | STANDARD (120/min) | List branches (filterable by workspace_id) |
| POST | `/branches/` | Access | STRICT (30/min) | Create branch (workspace_id, parent_branch_id, name, description, is_default) |
| GET | `/branches/<id>` | Access | STANDARD (120/min) | Get branch details |
| PATCH | `/branches/<id>` | Access | STRICT (30/min) | Update branch (name, is_locked) — admin for lock |
| DELETE | `/branches/<id>` | Access | STRICT (30/min) | Delete branch (admin, cannot delete default) |
| POST | `/branches/<id>/merge` | Access | STRICT (30/min) | Merge branch into target (target_branch_id in body) |
| POST | `/branches/merge` | Access | STRICT (30/min) | Merge two branches (source_branch_id, target_branch_id in body) |
| GET | `/branches/merge-conflicts` | Access | STANDARD (120/min) | List unresolved merge conflicts |
| PATCH | `/branches/merge-conflicts/<id>/resolve` | Access | STRICT (30/min) | Resolve a merge conflict |

### 10.10 Versions

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/versions/` | Access | STANDARD (120/min) | List versions (filterable by entity_id, branch_id, paginated) |
| POST | `/versions/` | Access | STRICT (30/min) | Create version snapshot (entity_id, branch_id, message) |
| GET | `/versions/<id>` | Access | STANDARD (120/min) | Get version with snapshot data |
| POST | `/versions/<id>/restore` | Access | STRICT (30/min) | Restore entity to version (creates new version +1 with "Restored to version {n}" message) |
| GET | `/versions/changesets` | Access | STANDARD (120/min) | List changesets (filterable by branch_id) |
| POST | `/versions/changesets` | Access | STRICT (30/min) | Create changeset (branch_id, snapshot_id, message) |
| GET | `/versions/snapshots` | Access | STANDARD (120/min) | List snapshots (filterable by branch_id) |
| POST | `/versions/snapshots` | Access | STRICT (30/min) | Create snapshot (branch_id, name, description) |
| POST | `/versions/entities/<entity_id>/snapshot` | Access | STRICT (30/min) | Snapshot single entity (changeset_id) |
| GET | `/versions/entities/<entity_id>` | Access | STANDARD (120/min) | List entity versions (paginated) |
| GET | `/versions/blocks/<block_id>` | Access | STANDARD (120/min) | List block versions (paginated) |
| GET | `/versions/compare` | Access | STANDARD (120/min) | Compare two versions (?entity_id, from_version, to_version, from_snapshot_id, to_snapshot_id) |
| POST | `/versions/restore/<version_id>` | Access | STRICT (30/min) | Restore entity to version (returns restored entity object) |

**Compare Response:**
```json
{
  "data": {
    "from_version": 3, "to_version": 5,
    "summary": { "blocks_added": 2, "blocks_removed": 1, "blocks_modified": 3 },
    "changes": [
      { "block_id": "uuid", "type": "modified", "block_type": "text",
        "from": { "text": "Old" }, "to": { "text": "New" } }
    ]
  }
}
```

### 10.11 Diffs (Deprecated)

> These endpoints are deprecated. Use `GET /versions/compare` instead.

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/diffs/compare` | Access | STANDARD (120/min) | Compare two versions/snapshots (?entity_id, from_version, to_version, from_snapshot_id, to_snapshot_id) |
| POST | `/diffs/blocks` | Access | STRICT (30/min) | Compare two block versions or block snapshots |

### 10.12 Search

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/search/` | Access | STANDARD (120/min) | Search workspace content (?workspace_id=uuid&q=string&q=string&type=entity_type&scope=all\|entities\|blocks\|files&tags=csv&page=1&per_page=30) |
| GET | `/search/history` | Access | STANDARD (120/min) | Recent search queries (?workspace_id=uuid&limit=10) |
| GET | `/search/suggest` | Access | STANDARD (120/min) | Autocomplete suggestions (?workspace_id=uuid&q=string&limit=5) |

**Search Params for `GET /search/`:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `workspace_id` | UUID | — | ✅ **Required.** Scope to workspace |
| `q` | string | — | ✅ **Required.** Search query (min 2 chars) |
| `type` | string | — | Entity type filter |
| `scope` | enum | `all` | `entities`, `blocks`, `files`, `all` |
| `tags` | CSV string | — | Comma-separated tag IDs (AND logic) |
| `page` | int | 1 | Pagination |
| `per_page` | int | 30 | Max 100 |

**Search Response:**
```json
{
  "data": {
    "results": [
      { "type": "entity", "id": "uuid", "name": "Meeting Notes",
        "summary": "... <mark>review</mark> ...", "score": 0.95 },
      { "type": "block", "id": "uuid", "entity_id": "uuid",
        "entity_name": "Meeting Notes", "content_preview": "... <mark>review</mark> ...", "score": 0.87 }
    ]
  },
  "meta": { "total": 42, "page": 1, "per_page": 30, "pages": 2 }
}
```

**Logic:** `pg_trgm` `ILIKE '%query%'` on entity name/summary and block content. SQLite fallback: `LIKE`.

**`GET /search/history` Response:** Array of `{ query, searched_at, result_count }`

**`GET /search/suggest` Response:** Array of `{ text, entity_id }`

### 10.13 AI Assistant

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| POST | `/ai/chat` | Access | STRICT (30/min) | Chat with AI assistant (entity_id, message, context, model) |
| POST | `/ai/complete` | Access | STRICT (30/min) | AI autocomplete (entity_id, block_id, content, cursor_position) |
| POST | `/ai/embed` | Access | STRICT (30/min) | Generate embeddings (content, entity_id) → stored in Embedding table |
| POST | `/ai/semantic-search` | Access | STRICT (30/min) | Vector similarity search (query, limit, threshold, filter_type) |
| POST | `/ai/query` | Access | STRICT (30/min) | Ask question about workspace content (workspace_id, question, limit) |
| POST | `/ai/suggest-relations` | Access | STRICT (30/min) | Suggest related entities for an entity |
| POST | `/ai/summarize` | Access | STRICT (30/min) | Summarize entity or workspace content (workspace_id, entity_id?, max_length?) |

**Safety Pipeline:** Supervisor → Planner → Worker Agents → Safety Layer (Policy, Permission, Simulation, Diff, Approval) → Execution

**`POST /ai/chat` Response:**
```json
{ "data": { "message": "Summary...", "sources": ["block-uuid"], "model": "gpt-4o-mini", "tokens_used": 450 } }
```

**`POST /ai/complete` Response:**
```json
{ "data": { "completion": " jumps over the lazy dog", "model": "gpt-4o-mini" } }
```

**`POST /ai/summarize` Response:**
```json
{
  "data": {
    "summary": "Research Notes covers authentication architecture...",
    "entity_id": "uuid",
    "word_count": 185
  }
}
```

### 10.14 Files

| Method | Endpoint | Auth | Mode | Rate Limit | Description |
|--------|----------|------|------|-----------|-------------|
| GET | `/files/` | Access | Both | STANDARD (120/min) | List files (?workspace_id, uploaded_by) |
| POST | `/files/upload` | Access | Both | FILE_UPLOAD (10/min) | Upload file (multipart: file + workspace_id) |
| POST | `/files/` | Access | Both | STRICT (30/min) | Register file metadata |
| GET | `/files/<id>` | Access | Both | STANDARD (120/min) | Get file details |
| GET | `/files/<id>/download` | Access | Both | FILE_DOWNLOAD (60/min) | Download file content |
| DELETE | `/files/<id>` | Access | Both | STRICT (30/min) | Delete file |
| GET | `/files/<id>/thumbnail` | Access | Both | STANDARD (120/min) | Serve/redirect thumbnail variant |
| GET | `/files/<id>/preview` | Access | Both | STANDARD (120/min) | Serve/redirect preview variant |
| GET | `/files/<id>/variants` | Access | Both | STANDARD (120/min) | List all variants |
| GET | `/files/<id>/variants/<type>` | Access | Both | STANDARD (120/min) | Get specific variant |
| POST | `/files/<id>/entities/<eid>` | Access | Both | STRICT (30/min) | Link file to entity |
| DELETE | `/files/<id>/entities/<eid>` | Access | Both | STRICT (30/min) | Unlink file from entity |
| POST | `/files/presign` | Access | Cloud | STRICT (30/min) | Get presigned S3 upload URL |
| POST | `/files/presign-multipart` | Access | Cloud | STRICT (30/min) | Initiate multipart upload |
| POST | `/files/presign-multipart/complete` | Access | Cloud | STRICT (30/min) | Complete multipart upload |
| POST | `/files/<id>/confirm` | Access | Cloud | STRICT (30/min) | Confirm direct-to-S3 upload |
| POST | `/files/quarantine/<id>/resolve` | Access | Cloud | STRICT (30/min) | Approve or reject quarantined file |
| POST | `/files/cleanup-orphans` | Access | Both | STRICT (30/min) | Remove unlinked file records |
| POST | `/files/cleanup-quarantine` | Access | Cloud | STRICT (30/min) | Purge expired quarantined files |
| POST | `/files/cleanup-deleted` | Access | Cloud | STRICT (30/min) | Purge expired soft-deleted files |
| GET | `/files/storage-info` | Access | Local | STANDARD (120/min) | Workspace storage usage → `{ used_bytes, file_count, quota_bytes, max_file_size, quota_used_percent, storage_provider }` |

**Upload Response (201):** `{ id, workspace_id, file_name, mime_type, file_size, content_hash, storage_provider, object_key, uploaded_by, uploaded_at, deduplicated, has_thumbnail, has_preview }`
**Dedup Response (200):** Same shape with `deduplicated: true`

**File GET Response (200):** `{ id, workspace_id, file_name, mime_type, file_size, content_hash, state, storage_provider, object_key, uploaded_by, uploaded_at, is_deleted, has_extracted_text, has_metadata, variants: [{variant_type, object_key, mime_type}] }`

**File States:** `PENDING`, `UPLOADING`, `VALIDATING`, `UPLOADED`, `READY`, `FAILED`, `DELETED`, `QUARANTINED`

**Presign Response (200):** `{ "data": { "enabled": true, "upload_url": "...", "object_key": "...", "file_id": "uuid", "expires_at": "..." } }`
**Presign Dedup Response (200):** `{ "data": { "enabled": false, "deduplicated": true, "file": { ... } } }`

### 10.15 Graph

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/graph/` | Access | STANDARD (120/min) | Get entity-relation graph (?depth=1&entity_id=uuid&filter_type=string&include_tags=false) — 404 if not materialized |
| GET | `/graph/search` | Access | STANDARD (120/min) | Search within graph (?q=string, relation_type=string) |
| POST | `/graph/materialize` | Access | STRICT (30/min) | Materialize graph snapshot from current entities + relations (workspace_id) |
| POST | `/graph/query` | Access | STRICT (30/min) | Filtered graph query (workspace_id, relation_types, entity_type_ids, limit) |
| POST | `/graph/traverse` | Access | STRICT (30/min) | BFS traversal from center node (workspace_id, center_node, depth [max 5], relation_types) |
| POST | `/graph/paths` | Access | STRICT (30/min) | Find shortest path (workspace_id, source_entity_id, target_entity_id) |

**Graph Response:**
```json
{
  "data": {
    "nodes": [{ "id": "uuid", "type": "entity", "name": "Note A", "entity_type": "note", "color": "#4f46e5" }],
    "edges": [{ "id": "uuid", "source": "entity-a", "target": "entity-b", "type": "depends_on", "label": "depends on" }],
    "meta": { "node_count": 50, "edge_count": 120 }
  }
}
```

### 10.16 Governance

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/governance/reports` | Admin | STANDARD (120/min) | List governance reports (types: access_audit, change_log, storage_summary, activity_summary, compliance) |
| POST | `/governance/reports` | Admin | STRICT (30/min) | Generate governance report (queued as background job: type, params) |
| GET | `/governance/reports/<id>` | Admin | STANDARD (120/min) | Get report data |
| GET | `/governance/health` | Admin | STANDARD (120/min) | Get workspace health score (?workspace_id=uuid) |
| GET | `/governance/duplicates` | Admin | STANDARD (120/min) | Find entities with identical titles |
| GET | `/governance/orphans` | Admin | STANDARD (120/min) | Find entities with zero relations |
| GET | `/governance/stale` | Admin | STANDARD (120/min) | Find entities not updated in 90+ days |
| POST | `/governance/health-score` | Admin | STRICT (30/min) | Force recalculate health score (?workspace_id=uuid) |

**Health Score:** `max(0, 100 - min(70, duplicates × 5 + orphans × 2 + stale))`
- 90-100: Excellent (green)
- 70-89: Needs attention (yellow)
- Below 70: Requires cleanup (red)

### 10.17 Dashboard

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/dashboard/overview` | Access | LENIENT (300/min) | Workspace overview → workspace info, stats, recent entities, recent activity, storage by type |
| GET | `/dashboard/storage` | Access | STANDARD (120/min) | Storage breakdown → `{ total_used, quota, usage_percent, by_category: { files: { count, size }, versions: { count, size }, exports: { count, size } } }` |

**Dashboard Response:**
```json
{
  "data": {
    "workspace": { "id": "uuid", "name": "My KB", "my_role": "admin" },
    "stats": { "entities": 42, "blocks": 156, "files": 12, "relations": 200, "tags": 8, "storage_used": 52428800, "storage_quota": 1073741824 },
    "recent_entities": [...],
    "recent_activity": [...],
    "storage_by_type": { "files": 80, "versions": 15, "exports": 5 }
  }
}
```

### 10.18 Settings

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/settings/` | Access | STANDARD (120/min) | List all settings for a workspace |
| GET | `/settings/<category>` | Access | STANDARD (120/min) | Get settings for a category |
| PATCH | `/settings/` | Access | STRICT (30/min) | Update workspace settings (admin only) |
| PUT | `/settings/<category>` | Access | STRICT (30/min) | Update settings for a category (merge into existing) |
| POST | `/settings/reset` | Access | STRICT (30/min) | Reset a category or all settings to defaults (workspace_id, category) |

**Settings Response:**
```json
{
  "data": {
    "default_entity_type": "note",
    "allow_public_sharing": false,
    "versioning_enabled": true,
    "auto_save_interval": 30,
    "ai_features_enabled": true,
    "export_format": "markdown",
    "timezone": "UTC",
    "locale": "en-US",
    "storage_quota": 1073741824,
    "storage_used": 52428800
  }
}
```

### 10.19 Notifications

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/notifications/` | Access | STANDARD (120/min) | List notifications (filterable by workspace_id, user_id, unread_only) |
| POST | `/notifications/` | Access | STRICT (30/min) | Create notification (workspace_id, user_id, entity_id, type, title, body, data) |
| PATCH | `/notifications/<id>` | Access | STRICT (30/min) | Mark single notification as read |
| POST | `/notifications/<id>/read` | Access | STRICT (30/min) | Mark notification as read |
| POST | `/notifications/<id>/dismiss` | Access | STRICT (30/min) | Dismiss (soft-delete) a notification |
| POST | `/notifications/read-all` | Access | STRICT (30/min) | Mark all notifications as read |
| GET | `/notifications/unread-count` | Access | LENIENT (300/min) | Get unread count → `{ data: { unread_count: 3 } }` |

**Notification Types:** `mention`, `comment`, `invite`, `share`, `version_created`, `export_complete`, `import_complete`, `backup_complete`, `governance_report_ready`, `system_alert`

### 10.20 Jobs (Cloud-Only)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/jobs/` | Access | STANDARD (120/min) | List jobs (filterable by workspace_id, status, type) |
| POST | `/jobs/` | Access | STRICT (30/min) | Create job (workspace_id, type, payload, priority, idempotency_key) |
| GET | `/jobs/<id>` | Access | STANDARD (120/min) | Get job status with result/error details |
| POST | `/jobs/<id>/cancel` | Access | STRICT (30/min) | Cancel a pending/running job (admin or job creator) |

**Job Types:** `export_zip`, `import_zip`, `export_markdown`, `export_html`, `export_pdf`, `file_processing`, `governance_report`, `cleanup`, `backup`

**Job Response:**
```json
{
  "data": {
    "type": "export_zip",
    "status": "completed", "progress": 100,
    "message": "Export complete",
    "result": { "backup_id": "uuid", "size": 1048576, "entity_count": 15 },
    "error": null, "created_at": "...", "completed_at": "..."
  }
}
```

### 10.21 Sync

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/sync/` | Access | STANDARD (120/min) | List sync operations (filterable by workspace_id) |
| POST | `/sync/` | Access | STRICT (30/min) | Ingest sync operation (workspace_id, operation_type, entity_type, entity_id, payload, device_id, client_clock) |
| GET | `/sync/<id>` | Access | STANDARD (120/min) | Get sync operation details |
| POST | `/sync/<op_id>/ack` | Access | STRICT (30/min) | Acknowledge sync complete (client applies locally, then acks) |
| POST | `/sync/push` | Access | STRICT (30/min) | Push local changes to server (delta-merge with conflict detection → `{ accepted, conflicts, sync_token, synced_at }`) |
| POST | `/sync/pull` | Access | STRICT (30/min) | Pull server changes since last sync (entity_id, sync_token, last_synced_at) → full entity + blocks |
| GET | `/sync/status` | Access | STANDARD (120/min) | Get sync status for entity (?entity_id=uuid) → `{ current_version, last_modified_at, pending_changes, last_synced_at, has_conflicts }` |
| POST | `/sync/diff` | Access | STRICT (30/min) | Compare local vs remote export → returns missing records |
| POST | `/sync/apply-diff` | Access | STRICT (30/min) | Apply missing remote records to local workspace |
| POST | `/sync/sync-from-export` | Access | STRICT (30/min) | Full differential import (diff + apply in one call) |
| POST | `/sync/resolve-conflict` | Access | STRICT (30/min) | Resolve a sync conflict (workspace_id, conflict_id, resolution: local_wins/remote_wins/manual, merged_data?) |

**Operation Types:** `entity_create`, `entity_update`, `entity_delete`, `block_create`, `block_update`, `block_delete`, `relation_create`, `relation_delete`

**Push Request:**
```json
{
  "entity_id": "uuid",
  "changes": [{ "type": "block_update", "block_id": "uuid", "content": {}, "version": 3, "client_timestamp": "..." }],
  "last_synced_at": "...",
  "sync_token": "abc123"
}
```

**Push Response:**
```json
{
  "data": {
    "accepted": 5,
    "conflicts": [{ "block_id": "uuid", "server_version": 6, "client_version": 3, "server_content": {} }],
    "sync_token": "new-token",
    "synced_at": "..."
  }
}
```

### 10.22 Activity

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/activity/` | Access | STANDARD (120/min) | List activity log (?workspace_id=uuid&page=1&per_page=50) — most recent first, user_id null for system events |
| GET | `/activity/events` | Access | STANDARD (120/min) | List entity-specific events (?workspace_id=uuid&entity_id=uuid&changeset_id=uuid&page=1&per_page=50) |

### 10.23 Backups

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| GET | `/backups/` | Access | STANDARD (120/min) | List available backups on disk (?workspace_id=uuid) |
| POST | `/backups/export` | Access | STRICT (30/min) | Export workspace as JSON (workspace_id) → full dump |
| POST | `/backups/export-to-disk` | Access | STRICT (30/min) | Export workspace to disk (workspace_id) |
| POST | `/backups/export-markdown` | Access | STRICT (30/min) | Export as Markdown ZIP (workspace_id) |
| POST | `/backups/export-zip` | Access | STRICT (30/min) | Export as ZIP archive (workspace_id) |
| POST | `/backups/export-zip-encrypted` | Access | DESTRUCTIVE (10/min) | Export as encrypted `.gnv` ZIP (workspace_id) |
| POST | `/backups/export-html` | Access | STRICT (30/min) | Export single entity as self-contained HTML |
| POST | `/backups/export-pdf` | Access | STRICT (30/min) | Render single entity to PDF |
| POST | `/backups/import` | Access | STRICT (30/min) | Import workspace from JSON |
| POST | `/backups/import-zip` | Admin | DESTRUCTIVE (10/min) | Import `.gnv` ZIP with origin enforcement (multipart) |
| POST | `/backups/create` | Access | DESTRUCTIVE (10/min) | Create backup |
| POST | `/backups/<filename>/restore` | Access | DESTRUCTIVE (10/min) | Restore backup from filename |
| GET | `/backups/download-zip/<filename>` | Access | STANDARD (120/min) | Download exported ZIP |

**`GET /backups/` Response:** Array of `{ filename, path, size_bytes, created_at, workspace_id }`

> **Note:** Files metadata is included in export but NOT re-imported by `/backups/import`.

**Export Format Summary:**
| Format | Endpoint | Scope | Output |
|--------|----------|-------|--------|
| JSON | `/backups/export` | Full workspace | `.json` file |
| Disk | `/backups/export-to-disk` | Full workspace | Files on server disk |
| Markdown | `/backups/export-markdown` | Full workspace | `.zip` of `.md` files |
| ZIP | `/backups/export-zip` | Full workspace | `.zip` of Markdown + images |
| Encrypted ZIP | `/backups/export-zip-encrypted` | Full workspace | `.gnv` (AES-256-GCM) |
| HTML | `/backups/export-html` | Single entity | Self-contained `.html` |
| PDF | `/backups/export-pdf` | Single entity | Rendered `.pdf` |

---

## 11. Non-Functional Requirements

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

## 12. Deployment

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

## 13. Future Evolution (Post-V1)

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

It covers every feature, page, component, API endpoint, data model, UI pattern, and non-functional requirement for the Gnovium Cloud Web V1 application.

Ready for handoff to design and development teams.
