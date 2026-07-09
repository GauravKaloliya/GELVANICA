import type { ChangelogEntry } from './types';

export const API_ENDPOINT_COUNTS: Record<string, { modules: number; endpoints: number; paths: number }> = {
  'v1.0.1': { modules: 22, endpoints: 111, paths: 80 },
  'v1.0.0': { modules: 22, endpoints: 106, paths: 75 },
  'v0.9.0': { modules: 18, endpoints: 72, paths: 52 },
  'v0.5.0': { modules: 7, endpoints: 28, paths: 21 },
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v1.0.1',
    date: '2026-06-22',
    type: 'patch',
    title: 'API Specification & Reference Documentation',
    description: 'Published complete OpenAPI 3.0.3 specification covering all 111 endpoints across 22 modules. Added comprehensive API reference: error catalog (17 standardized codes), authentication guide (3 methods with OAuth2 PKCE, API keys, PATs), rate limit tiers (4 tiers), and CORS configuration. Documentation platform upgraded with responsive design, 6 themes, accessibility, and interactive features. No breaking changes to the API contract.',
    breaking: false,
    changes: [
      { type: 'added', description: 'OpenAPI 3.0.3 specification: 111 operations, 80 paths, 9 schemas, 3 security schemes, downloadable in JSON and YAML formats', module: 'Specification' },
      { type: 'added', description: 'Auto-generated API version manifest with version label, description, date, and change summary', module: 'Specification' },
      { type: 'added', description: 'Error catalog documenting 17 standardized error codes across 8 modules with causes, resolutions, and JSON examples', module: 'Reference' },
      { type: 'added', description: 'Authentication guide: OAuth2 Authorization Code + PKCE flow, API Key (X-API-Key header), Personal Access Tokens (Bearer scheme) with setup steps and code examples', module: 'Reference' },
      { type: 'added', description: 'Rate limit tiers: Free (30 req/min, 500/hr), Pro (120 req/min, 3000/hr), Team (500 req/min, 10000/hr), Enterprise (2000 req/min, 50000/hr) with burst limits and exponential backoff strategy', module: 'Reference' },
      { type: 'added', description: 'CORS configuration guide: default permissive policy (local mode), configurable allowed origins (cloud mode), standard method/header support, preflight handling', module: 'Reference' },
      { type: 'added', description: 'API versioning policy: semantic versioning, 6-month deprecation window, URL-based (/api/v1/) and header-based (Accept) versioning methods', module: 'Reference' },
      { type: 'added', description: 'Deprecation timeline for v1 API, OAuth2 implicit grant, legacy content blocks, keyword search mode, and classic docs layout', module: 'Reference' },
      { type: 'changed', description: 'Example tokens updated from $ACCESS_TOKEN placeholder to realistic gnov_sk_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 format', module: 'Auth' },
      { type: 'added', description: 'Documentation platform with neo-brutalist design system, 6 color themes (dark/light/sepia/high-contrast/ocean/midnight), accent color system', module: 'Docs' },
      { type: 'added', description: 'Separate responsive layout trees for desktop (sidebar + content) and mobile (accordion + detail panel)', module: 'Docs' },
      { type: 'added', description: 'Interactive search palette (Ctrl+K) with keyboard navigation and HTTP method/module filtering', module: 'Docs' },
      { type: 'added', description: 'Endpoint pinning, recently viewed tracking, continue-where-you-left-off banner, and breadcrumb navigation', module: 'Docs' },
      { type: 'added', description: 'Code block syntax highlighting via prism-react-renderer, line numbers, word-wrap toggle, and copy-to-clipboard', module: 'Docs' },
      { type: 'added', description: 'Particle graph animated background in hero section', module: 'Docs' },
      { type: 'added', description: 'Accessibility: skip-to-content link, ARIA labels and regions, keyboard navigation, focus-visible styles, prefers-reduced-motion support', module: 'Docs' },
      { type: 'changed', description: 'Desktop layout max-width constrained to 960px with optional zen mode for full-width content', module: 'Docs' },
      { type: 'changed', description: 'Sidebar redesigned with module icons, expand/collapse groups, active endpoint highlighting, and "You are here" scroll tracking', module: 'Docs' },
    ],
  },
  {
    version: 'v2.0.0',
    date: '2026-Q4',
    type: 'major',
    title: 'Cloud Sync & Multi-Device',
    description: 'Multi-user collaboration, real-time WebSocket sync, shared workspaces with role-based access, managed hosting, and automatic scheduled backups. API base URL migrates from /api/v1 to /api/v2. v1 endpoints remain available with deprecation warnings through v3.0.0.',
    breaking: true,
    changes: [
      { type: 'added', description: 'Real-time WebSocket sync endpoint for collaborative editing', module: 'Sync' },
      { type: 'added', description: 'POST /sync/subscribe — WebSocket upgrade for real-time entity change streaming', module: 'Sync' },
      { type: 'added', description: 'POST /sync/publish — Push entity changes to subscribed clients', module: 'Sync' },
      { type: 'added', description: 'Workspace member roles: owner, admin, editor, viewer with granular permission model', module: 'Workspaces' },
      { type: 'added', description: 'Shared workspaces with multi-device access and cross-device sync conflict resolution', module: 'Workspaces' },
      { type: 'added', description: 'Automatic scheduled backups with configurable interval and retention policy', module: 'Backups' },
      { type: 'added', description: 'POST /backups/schedule — Configure backup interval and retention', module: 'Backups' },
      { type: 'changed', description: 'API base URL changed from /api/v1 to /api/v2 — all endpoint paths shifted', module: 'General' },
      { type: 'changed', description: 'Rate limits increased 3x for cloud-tier workspaces', module: 'General' },
      { type: 'deprecated', description: 'v1 API endpoints at /api/v1/* scheduled for removal in v3.0.0 — migrate to /api/v2/*', module: 'General' },
      { type: 'deprecated', description: 'OAuth2 implicit grant flow — migrate to Authorization Code + PKCE', module: 'Auth' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-07',
    type: 'minor',
    title: 'Cloud Mode Beta',
    description: 'Cloud mode infrastructure with NeonDB (Postgres), S3-compatible storage, and Redis caching. GNOVIUM_MODE environment variable for local/cloud switching. Presigned URL file upload and workspace-level sync operations. No breaking changes.',
    breaking: false,
    changes: [
      { type: 'added', description: 'Cloud mode: NeonDB Postgres backend with connection pooling', module: 'Workspaces' },
      { type: 'added', description: 'S3-compatible object storage for file uploads with presigned URL generation', module: 'Files' },
      { type: 'added', description: 'Redis caching layer for API response and graph query optimization', module: 'Workspaces' },
      { type: 'added', description: 'GNOVIUM_MODE environment variable: local (SQLite + SimpleCache) or cloud (NeonDB + S3 + Redis)', module: 'System' },
      { type: 'added', description: 'GET /system/mode — Returns current mode and infrastructure status', module: 'System' },
      { type: 'added', description: 'POST /files/presign — Generate presigned upload URL for direct S3 upload', module: 'Files' },
      { type: 'added', description: 'POST /sync/workspace — Workspace-level sync push with conflict detection', module: 'Sync' },
      { type: 'changed', description: 'Local mode defaults to SQLite with SimpleCache instead of in-memory storage', module: 'System' },
      { type: 'fixed', description: 'Embedding generation timeout increased from 10s to 60s for large documents (>8K tokens)', module: 'AI' },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-06',
    type: 'major',
    title: 'Initial MVP Release',
    description: 'First stable release of the Gnovium Knowledge OS API. 106 endpoints across 22 modules. Local-first knowledge management with block editing, relational knowledge graph, Git-inspired versioning, and AI-powered semantic search.',
    breaking: true,
    changes: [
      { type: 'added', description: 'Auth module: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me, PATCH /auth/me — JWT-based auth with access/refresh token pair', module: 'Auth' },
      { type: 'added', description: 'Workspaces module: CRUD endpoints + GET /workspaces/<id>/stats — multi-workspace isolation with per-workspace settings', module: 'Workspaces' },
      { type: 'added', description: 'Entities module: CRUD + archive, restore, duplicate, children list/create, version history — typed entities with flexible JSONB properties', module: 'Entities' },
      { type: 'added', description: 'Entity Types module: CRUD + GET /entities/types/<id>/schema — custom type system with property definitions', module: 'Entities' },
      { type: 'added', description: 'Properties module: CRUD for entity-type property definitions with typed values (string, number, boolean, date, enum, relation)', module: 'Entities' },
      { type: 'added', description: 'Blocks module: CRUD + reorder batch update — rich text blocks with position-based ordering within entities', module: 'Blocks' },
      { type: 'added', description: 'Tags module: CRUD + assign/unassign from entities — flat tag classification system', module: 'Tags' },
      { type: 'added', description: 'Relations module: CRUD — typed directed edges between entities with metadata', module: 'Graph' },
      { type: 'added', description: 'Graph module: GET /graph/ (materialized snapshot), POST /graph/materialize, POST /graph/query (filtered), POST /graph/traverse (BFS, depth <=5), POST /graph/paths (shortest path)', module: 'Graph' },
      { type: 'added', description: 'Versions module: CRUD snapshots + branch management (CRUD, merge, diff) — Git-inspired linear versioning', module: 'Versions' },
      { type: 'added', description: 'Diffs module: GET /diffs/compare?base=<id>&target=<id> — visual diff between entity snapshots', module: 'Diffs' },
      { type: 'added', description: 'Search module: GET /search?q=<query>&mode=keyword|hybrid — full-text and hybrid search across entities', module: 'Search' },
      { type: 'added', description: 'AI module: POST /ai/query — natural language query with Inference Runtime embedding and semantic retrieval', module: 'AI' },
      { type: 'added', description: 'Files module: CRUD + download — file upload and management with local FS storage', module: 'Files' },
      { type: 'added', description: 'Notifications module: CRUD + mark-read + mark-all-read — user notification inbox', module: 'Notifications' },
      { type: 'added', description: 'Comments module: CRUD + threaded replies — entity-level comment threads', module: 'Comments' },
      { type: 'added', description: 'Activity module: GET /activity — workspace audit trail with event filtering', module: 'Activity' },
      { type: 'added', description: 'Jobs module: POST /jobs, GET /jobs/<id> — async background job system for long-running operations', module: 'Jobs' },
      { type: 'added', description: 'Governance module: POST /governance/score, GET /governance/reports — workspace health scoring and compliance reports', module: 'Governance' },
      { type: 'added', description: 'Dashboard module: GET /dashboard/overview, GET /dashboard/metrics — workspace analytics dashboard', module: 'Dashboard' },
      { type: 'added', description: 'Backups module: POST /backups, GET /backups/<id>/download — manual backup creation and restoration', module: 'Backups' },
      { type: 'added', description: 'System module: GET /health, GET /system/version, POST /system/seed — health checks and system metadata', module: 'System' },
      { type: 'added', description: 'API response envelope: { data, meta } — standardized with pagination metadata (page, per_page, total, pages)', module: 'General' },
      { type: 'added', description: 'Authentication: JWT access tokens (30 min expiry) with refresh token rotation and bcrypt password hashing', module: 'Auth' },
    ],
  },
  {
    version: 'v0.9.0',
    date: '2026-05',
    type: 'beta',
    title: 'Beta Preview',
    description: 'Pre-release beta for early adopters. Core API stabilized with 72 endpoints across 18 modules. Response envelope standardized to { data, meta } format. Tag, comment, activity, and job systems added.',
    breaking: false,
    changes: [
      { type: 'added', description: 'Tags module: CRUD for tag management with entity association', module: 'Tags' },
      { type: 'added', description: 'Comments module: CRUD with threaded reply support on entities', module: 'Comments' },
      { type: 'added', description: 'Activity module: GET /activity with event type filtering and pagination', module: 'Activity' },
      { type: 'added', description: 'Jobs module: POST /jobs (create), GET /jobs/<id> (poll status) for async operations', module: 'Jobs' },
      { type: 'added', description: 'Initial rate limiting framework with per-user token bucket', module: 'General' },
      { type: 'changed', description: 'All API responses standardized to { data, meta } envelope — meta includes page, per_page, total, pages for list endpoints', module: 'General' },
    ],
  },
  {
    version: 'v0.5.0',
    date: '2026-04',
    type: 'beta',
    title: 'Developer Preview',
    description: 'Early developer preview with 28 endpoints across 7 modules. Core CRUD for entities, blocks, relations, and files. Basic graph traversal. Notification system.',
    breaking: false,
    changes: [
      { type: 'added', description: 'Entities module: CRUD endpoints with basic title and properties support', module: 'Entities' },
      { type: 'added', description: 'Blocks module: CRUD endpoints with position-based ordering within entities', module: 'Blocks' },
      { type: 'added', description: 'Relations module: CRUD for typed directed edges between entities', module: 'Relations' },
      { type: 'added', description: 'Graph module: GET /graph/query (filtered query), POST /graph/traverse (BFS), POST /graph/paths (shortest path)', module: 'Graph' },
      { type: 'added', description: 'Files module: CRUD with local filesystem storage and download', module: 'Files' },
      { type: 'added', description: 'Notifications module: CRUD for user notification inbox', module: 'Notifications' },
    ],
  },
];

export const VERSIONING_POLICY = {
  current: 'v1.0.1',
  next: 'v1.1.0',
  deprecationNotice: '6 months',
  supportedVersions: ['v1.0.1', 'v1.0.0'],
  policy: `Gnovium follows semantic versioning (MAJOR.MINOR.PATCH) for both the API and documentation.

- **Major versions** (v1, v2) introduce breaking changes. Each major version is supported for a minimum of 12 months from the release of the next major version.
- **Minor versions** (v1.1, v1.2) add functionality in a backward-compatible manner. Deprecation warnings are added at least one minor version before removal.
- **Patch versions** (v1.0.x) include backward-compatible bug fixes, documentation enhancements, security patches, and UI/UX improvements. The API contract remains unchanged within a minor version.

## Version Strategy

| Version | Status      | Release      | End of Life    | Endpoints |
|---------|-------------|--------------|----------------|-----------|
| v1.0.1  | Current     | Jun 22, 2026 | Dec 2027       | 111       |
| v1.0.0  | Superseded  | Jun 2026     | —              | 106       |
| v1.1.0  | Planned     | Jul 2026     | Jun 2028       | ~120      |
| v2.0.0  | Planned     | Q4 2026      | Jun 2029       | ~150      |

## Deprecation Flow

1. Feature is marked as \`deprecated\` in changelog with migration guide
2. API response includes \`Warning: deprecated\` header
3. Feature remains functional for 6 months after deprecation notice
4. Feature is removed in the next major version

## API Versioning

Gnovium supports two versioning methods:

**URL-based (recommended):** \`/api/v1/entities/\` — explicit, easy to read, preferred for new integrations.

**Header-based:** \`Accept: application/vnd.gnovium.v1+json\` — cleaner URLs, requires client header management.

## Migration Between Versions

**v1.0.0 → v1.0.1:** No migration required. This is a documentation-only patch with no API contract changes. All existing client code continues to work unchanged.

**v1.x → v2.0.0:** Breaking change. Update all endpoint paths from \`/api/v1/*\` to \`/api/v2/*\`. Migrate OAuth2 implicit grant to Authorization Code + PKCE. Replace keyword search mode with hybrid mode.
`,
};

export const DEPRECATION_TIMELINE = [
  { feature: 'v1 API (URL path /api/v1/)', deprecatedIn: 'v1.1.0', removalIn: 'v3.0.0', migration: 'Use /api/v2/ endpoints. All v1 endpoints have v2 equivalents.' },
  { feature: 'OAuth2 implicit grant', deprecatedIn: 'v1.1.0', removalIn: 'v2.0.0', migration: 'Migrate to OAuth2 authorization code flow with PKCE.' },
  { feature: 'Legacy plain-text content blocks', deprecatedIn: 'v1.0.0', removalIn: 'v2.0.0', migration: 'Use structured JSONB content format.' },
  { feature: 'Search mode "keyword" (default)', deprecatedIn: 'v0.9.0', removalIn: 'v2.0.0', migration: 'Use "hybrid" mode for better results.' },
  { feature: 'Legacy $ACCESS_TOKEN placeholder format in documentation examples', deprecatedIn: 'v1.0.1', removalIn: 'v2.0.0', migration: 'Use realistic gnov_sk_* token format in Authorization headers.' },
];
