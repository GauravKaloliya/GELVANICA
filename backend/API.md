# Gnovium API Reference

> API version 1 — The backend engine for the knowledge operating system.
> 111 endpoints across 22 modules, powering both **Local** (SQLite, offline-first desktop) and **Cloud** (PostgreSQL/NeonDB, multi-tenant SaaS) deployments with a single unified interface.

---

## Table of Contents

- [Architecture](#architecture)
- [Base URL & Environments](#base-url--environments)
- [Authentication](#authentication)
- [Standard Response Envelope](#standard-response-envelope)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Modules](#api-modules)
  - [Auth (Cloud-Only)](#auth-cloud-only)
  - [Workspaces](#workspaces)
  - [Entities](#entities)
  - [Blocks](#blocks)
  - [Relations](#relations)
  - [Comments](#comments)
  - [Tags](#tags)
  - [Branches](#branches)
  - [Versions (Cloud-Only)](#versions-cloud-only)
  - [Diffs (Cloud-Only)](#diffs-cloud-only)
  - [Search](#search)
  - [AI Assistant](#ai-assistant)
  - [Files](#files)
  - [Graph](#graph)
  - [Governance](#governance)
  - [Dashboard](#dashboard)
  - [Notifications](#notifications)
  - [Jobs (Cloud-Only)](#jobs-cloud-only)
  - [Sync (Cloud-Only)](#sync-cloud-only)
  - [Activity](#activity)
  - [Backups](#backups)
- [Quick Reference](#quick-reference)
- [Best Practices](#best-practices)
- [Appendix: Schema Reference](#appendix-schema-reference)

---

## Architecture

### Two Modes, One API

Every endpoint uses the same contract regardless of deployment mode. The application code detects the mode at startup and adapts automatically.

> **Local mode seed data:** On first startup, SQLite is seeded with a default workspace (`00000000-0000-0000-0000-000000000001`), entity type "Page" (`00000000-0000-0000-0000-000000000002`), and branch "main" (`00000000-0000-0000-0000-000000000003`). These fixed UUIDs make local development predictable.

| Aspect | Local Mode | Cloud Mode |
|--------|------------|------------|
| **Database** | SQLite (`backend/data/local.db`, WAL mode) | PostgreSQL / NeonDB |
| **Auth** | JWT verified against shared secret | JWT verified + full auth blueprint |
| **Schema** | `db.create_all()` + `SQLITE_SCHEMA.sql` (FTS5, triggers, indexes, seed data) | Alembic migrations auto-generated from `domain.py` models (`POSTGRESQL_SCHEMA.sql` is reference only) |
| **File storage** | Local filesystem (`instance/uploads/`) — extension/MIME validation, SHA-256 dedup, storage quota (500 MB default), orphan cleanup | S3 (AWS) |
| **Rate limiting** | In-memory (1,000 req/min) | Redis-backed (200 req/min) |
| **Cache** | SimpleCache | Redis |
| **Search** | SQLite FTS5 (full-text + keyword) | PostgreSQL tsvector + pg_trgm + pgvector |
| **Blocks** | Append-only (composite PK: `id + branch_id + created_at`) | Mutable with entity/block versioning |
| **User identity** | JWT identity stored as text ref (no FK) | FK-constrained to `users` table |
| **Sync/Jobs** | Not available | Full async job + sync engine |
| **Versions/Diffs** | Not available | Full changeset + snapshot versioning |

### Auth Flow (Desktop App)

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  Electron    │     │  Cloud API        │     │  Local Flask API │
│  Desktop App │     │  (api.gnovium.com)│     │  (localhost:5001)│
├──────────────┤     ├───────────────────┤     ├──────────────────┤
│  1. Open     │────>│  2. Login page    │     │                  │
│  browser     │     │  3. User signs in │     │                  │
│              │<────│  4. Returns JWT   │     │                  │
│  5. Store    │     │                   │     │                  │
│  JWT locally │     │                   │     │                  │
│  6. API call │─────────────────────────────────>│  7. Verifies   │
│  + Bearer    │                                  │  JWT locally   │
│  token       │                                  │                │
│              │<─────────────────────────────────│  8. Returns    │
│              │                                  │  response      │
└──────────────┘                                  └──────────────────┘
```

The local Flask API cryptographically verifies the cloud-issued JWT using the **shared `JWT_SECRET_KEY`**, requiring zero network calls for auth validation. The same token works across web, mobile, and desktop.

---

## Base URL & Environments

| Environment | Base URL | Mode | Database |
|-------------|----------|------|----------|
| **Local Development** | `http://localhost:5001` | `GNOVIUM_MODE=local` | SQLite |
| **Cloud Production** | `https://api.gnovium.com` | `GNOVIUM_MODE=cloud` | NeonDB (PostgreSQL) |

All API paths are prefixed with `/api/v1/`.

```
GET  /api/v1/workspaces/
POST /api/v1/ai/query
```

One endpoint lives outside the versioned prefix:

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Liveness check | `{"status": "healthy"}` |

---

## Authentication

### JWT Token-Based Auth

Gnovium uses **JWT access + refresh token** authentication. Tokens are issued by the **cloud API** and verified by **any instance** (cloud, local desktop, mobile) via a shared `JWT_SECRET_KEY`.

#### Getting Tokens (Cloud API only)

```
POST /api/v1/auth/register   →  { access_token, refresh_token, user }
POST /api/v1/auth/login      →  { access_token, refresh_token, user }
```

#### Using Tokens

**Access token** goes in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Refresh token** replaces the access token in the `Authorization` header when calling `/auth/refresh` or `/auth/logout`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### Token Lifecycle

| Token | Lifespan | Usage |
|-------|----------|-------|
| Access Token | 30 minutes | All authenticated requests |
| Refresh Token | 14 days | Obtain new access tokens |

#### Security Notes

- Tokens expire silently — if you get a 401, call `/auth/refresh`
- Logout revokes the refresh token server-side
- In cloud mode, cookies are `Secure` + `HttpOnly` + `SameSite=Lax`
- The same `JWT_SECRET_KEY` must be set in `.env` (base), `.env.local`, and `.env.cloud`
- Public routes (no auth): `/auth/register`, `/auth/login`, `/auth/check-email`, `/auth/google`, `/health`
- Refresh-token routes: `/auth/refresh` (send refresh token via `Authorization: Bearer`), `/auth/logout` (send refresh token via `Authorization: Bearer`)
- All other routes require a valid JWT **access token** in the `Authorization: Bearer <token>` header

---

## Standard Response Envelope

All timestamps are **ISO 8601 UTC** (e.g. `2025-06-15T08:30:00Z`).

### Success

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 42,
    "pages": 3
  }
}
```

| Field | Present | Description |
|-------|---------|-------------|
| `data` | Always | The response payload — object, array, or scalar |
| `meta` | Paginated only | Pagination metadata |

### Error

```json
{
  "error": {
    "code": "not_found",
    "message": "Entity not found",
    "details": { "entity_id": "abc-123" }
  }
}
```

| Field | Present | Description |
|-------|---------|-------------|
| `code` | Always | Machine-readable error code |
| `message` | Always | Human-readable description |
| `details` | Sometimes | Additional context — e.g. for `validation_error`: `{"field": "email", "error": "must be a valid email address"}` |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — malformed input or missing required fields |
| `401` | Unauthorized — missing or expired token |
| `403` | Forbidden — you don't own this resource |
| `404` | Not Found — resource doesn't exist |
| `409` | Conflict — duplicate or state conflict |
| `422` | Validation Error — schema validation failed |
| `429` | Too Many Requests — rate limit exceeded |
| `500` | Internal Server Error — something went wrong |

### Error Codes

| Code | Meaning |
|------|---------|
| `not_found` | Resource doesn't exist |
| `validation_error` | Input failed schema validation |
| `unauthorized` | Invalid or missing credentials |
| `forbidden` | Not authorized for this resource |
| `bad_request` | General request error |
| `rate_limit_exceeded` | Slow down |
| `internal_error` | Unexpected server error |

---

## Rate Limiting

| Mode | Default Limit | Storage |
|------|---------------|---------|
| **Local** | 1,000 requests/min | In-memory |
| **Cloud** | 200 requests/min | Redis / Upstash |

Rate-limited requests return `429 Too Many Requests` with a `Retry-After` header.

---

## API Modules

### Auth (Cloud-Only)

Identity and session management. **Only registered in cloud mode.** In local mode, tokens are verified using the shared `JWT_SECRET_KEY` but no auth endpoints are served.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | — | Create a new account |
| POST | `/auth/login` | — | Sign in with email + password |
| GET | `/auth/check-email` | — | Check if email is available |
| POST | `/auth/refresh` | Refresh | Get a new access token |
| POST | `/auth/google` | — | Sign in with Google OAuth |
| POST | `/auth/logout` | Refresh | Revoke the current session |
| GET | `/auth/me` | Access | Get the authenticated user |
| PATCH | `/auth/me` | Access | Update your profile |

#### `POST /auth/register`

**Request:**
```json
{
  "email": "admin@gnovium.dev",
  "password": "change-me-123",
  "name": "Admin User"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `email` | ✅ | Must be a valid email, unique per instance |
| `password` | ✅ | Minimum 8 characters |
| `name` | — | Display name |

**Response `201`:**
```json
{
  "data": {
    "tokens": {
      "access_token": "eyJ...",
      "refresh_token": "eyJ..."
    },
    "user": {
      "id": "d9b23b3f-1d86-4e5a-a5f1-3cf93f9ef294",
      "email": "admin@gnovium.dev",
      "name": "Admin User",
      "avatar_url": null
    }
  }
}
```

#### `POST /auth/login`

**Request:**
```json
{
  "email": "admin@gnovium.dev",
  "password": "change-me-123"
}
```

**Response `200`:** Same token envelope as register.

#### `GET /auth/check-email`

**Query:** `?email=admin@gnovium.dev`

**Response `200`:**
```json
{ "data": { "available": true } }
```

#### `POST /auth/refresh`

**Headers:** `Authorization: Bearer <refresh_token>`

**Response `200`:**
```json
{
  "data": {
    "access_token": "eyJ..."
  }
}
```

> Note: Only a new `access_token` is returned — the existing refresh token is reused.

#### `POST /auth/google`

**Request:**
```json
{
  "credential": "google-oauth-credential-token"
}
```

**Response `200`:** Same token envelope as login.

#### `POST /auth/logout`

Revoke the current session. Requires a refresh token.

**Headers:** `Authorization: Bearer <refresh_token>`

**Response `200`:**
```json
{
  "data": {
    "revoked": true
  }
}
```

The refresh token's session is revoked server-side. Subsequent attempts to use the same refresh token will be rejected.

#### `GET /auth/me`

**Response `200`:**
```json
{
  "data": {
    "id": "d9b23b3f-1d86-4e5a-a5f1-3cf93f9ef294",
    "email": "admin@gnovium.dev",
    "name": "Admin User",
    "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=Admin+User",
    "created_at": "2026-06-07T12:00:00Z",
    "updated_at": "2026-06-21T08:30:00Z"
  }
}
```

#### `PATCH /auth/me`

**Request:**
```json
{
  "name": "Admin Updated",
  "avatar_url": "https://example.com/avatar.png"
}
```

**Response `200`:** Updated user object.

---

### Workspaces

Top-level containers that group knowledge, entities, and collaborators.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/workspaces/` | Access | List your workspaces |
| POST | `/workspaces/` | Access | Create a workspace |
| GET | `/workspaces/<id>` | Access | Get workspace details |
| PATCH | `/workspaces/<id>` | Access | Update workspace |
| DELETE | `/workspaces/<id>` | Access | Delete workspace permanently |
| GET | `/workspaces/<id>/stats` | Access | Workspace overview statistics |

#### `GET /workspaces/`

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `per_page` | int | 25 | Items per page (max 100) |

**Response `200`:** Paginated list of workspace objects.

#### `POST /workspaces/`

**Request:**
```json
{
  "name": "Knowledge OS",
  "description": "Company workspace",
  "settings": { "default_view": "graph" }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | ✅ | Workspace display name (1-160 chars) |
| `description` | — | Brief description |
| `settings` | — | Arbitrary key-value config dict |

**Response `201`:** Created workspace object with `id`.

#### `GET /workspaces/<id>`

**Response `200:`**
```json
{
  "data": {
    "id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "name": "Knowledge OS",
    "description": "Company workspace",
    "owner_id": "d9b23b3f-1d86-4e5a-a5f1-3cf93f9ef294",
    "deployment_mode": "local",
    "settings": { "default_view": "graph" },
    "created_at": "2026-06-07T12:00:00Z",
    "updated_at": "2026-06-21T08:30:00Z"
  }
}
```

Note: `deployment_mode` is `"local"` for local mode and `"cloud"` for cloud mode.

#### `PATCH /workspaces/<id>`

**Request:**
```json
{
  "name": "Knowledge OS Pro",
  "description": null
}
```

Setting `description` to `null` clears it.

**`settings`:** Replaces the entire settings dict — any omitted keys are lost. Set a key to `null` to clear it.

#### `DELETE /workspaces/<id>`

Delete the workspace permanently. All associated entities, blocks, relations, tags, files, comments, and notifications are deleted.

#### `GET /workspaces/<id>/stats`

Delegates to `DashboardService.overview()`. Returns raw response (unwrapped `data`).

**Response `200:**
```json
{
  "data": {
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "entity_count": 42,
    "block_count": 215,
    "relation_count": 18,
    "comment_count": 7,
    "archived_count": 5,
    "member_count": 1,
    "recent_entities": [
      { "id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3", "title": "Research Notes", "updated_at": "2026-06-21T08:30:00Z" }
    ]
  }
}
```

---

### Entities

The fundamental unit of knowledge — pages, documents, databases, or any typed object.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/entities/` | Access | List entities |
| POST | `/entities/` | Access | Create an entity |
| GET | `/entities/<id>` | Access | Get entity details |
| PATCH | `/entities/<id>` | Access | Update entity |
| DELETE | `/entities/<id>` | Access | Delete entity permanently |
| POST | `/entities/<id>/restore` | Access | Restore a deleted entity |
| POST | `/entities/<id>/archive` | Access | Archive (hide without deleting) |
| POST | `/entities/<id>/duplicate` | Access | Duplicate entity + contents |
| GET | `/entities/<id>/children` | Access | List child entities |
| POST | `/entities/<id>/children` | Access | Create a child entity |
| GET | `/entities/<id>/versions` | Access | **Cloud-only.** List version history |
| POST | `/entities/types` | Access | Create an entity type |
| GET | `/entities/types` | Access | List entity types |
| POST | `/entities/properties` | Access | Create a custom property |
| GET | `/entities/properties` | Access | List custom properties |

#### Core CRUD

**`POST /entities/`**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "entity_type_id": "8cb385bc-223d-4c3e-8c38-dfa22026d36e",
  "title": "Research Notes",
  "icon": "note",
  "cover_image": null,
  "properties": { "status": "active", "priority": "high" }
}
```

**Response `201`:** Returns the created entity with its `id`.

**`PATCH /entities/<id>`**
```json
{
  "title": "Research Notes v2",
  "icon": "doc",
  "properties": { "status": "review" }
}
```

All fields are optional. Send only what changed.

**`DELETE /entities/<id>`** — Delete the entity permanently. Cascades to all blocks, property values, relations, tags, file links, comments, embeddings, and notifications.

**`POST /entities/<id>/restore`** — Undo the deletion and restore the entity with all its associated data.

**`POST /entities/<id>/archive`** — Mark as archived (doesn't delete, just hides from default views).

**`POST /entities/<id>/duplicate`** — Deep copy of the entity and its blocks. Returns `201`.

#### Children

**`GET /entities/<id>/children`** — Paginated list of child entities.

**`POST /entities/<id>/children`** — Create a child entity under this parent. `workspace_id` and `entity_type_id` are both required in the body — they are NOT inferred from the parent.

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "entity_type_id": "8cb385bc-223d-4c3e-8c38-dfa22026d36e",
  "title": "Child Page",
  "icon": "doc"
}
```

**Error responses:**

| Status | Reason |
|--------|--------|
| `400` | `workspace_id` missing |
| `400` | `entity_type_id` missing |

#### Entity Types

**`POST /entities/types`**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "name": "Document",
  "icon": "doc",
  "config": { "color": "blue" }
}
```

**`GET /entities/types`** — List entity types. Optional filter: `?workspace_id=uuid`.

#### Custom Properties

**`POST /entities/properties`**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "entity_type_id": "8cb385bc-223d-4c3e-8c38-dfa22026d36e",
  "name": "Status",
  "property_type": "select",
  "config": { "options": ["active", "review", "archived"] }
}
```

| `property_type` | Description |
|----------------|-------------|
| `text` | Free-form text |
| `number` | Numeric value |
| `select` | Single-select from options |
| `multi_select` | Multiple selections |
| `date` | Date value |
| `boolean` | True/false |
| `url` | URL link |

**`GET /entities/properties`** — List custom properties. Optional filter: `?workspace_id=uuid`.

#### Entity Versions

**`GET /entities/<id>/versions`** — **Cloud-only.** Returns 404 in local mode.
Paginated list of entity version history.

---

### Blocks

The building blocks of entity content — text, headings, lists, code, and more.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/blocks/` | Access | List blocks for an entity |
| POST | `/blocks/` | Access | Create a block |
| GET | `/blocks/<id>` | Access | Get block details |
| PATCH | `/blocks/<id>` | Access | Update block content |
| POST | `/blocks/<id>/move` | Access | Move block to new parent/position |
| DELETE | `/blocks/<id>` | Access | Delete block permanently |
| POST | `/blocks/reorder` | Access | Batch reorder blocks |
| GET | `/blocks/entity/<entity_id>` | Access | List blocks for an entity (shorthand) |

#### Append-Only Design (Local Mode)

In **local mode**, blocks use an **append-only** storage pattern:
- Every update creates a **new row** with the same `id` but a new `created_at`
- Composite primary key: `(id, branch_id, created_at)`
- No separate entity_versions or block_versions tables needed
- Full edit history is preserved natively
- `GET /blocks/?entity_id=<id>` returns only **current (non-deleted) blocks** — finds the latest row per block id, then filters out deleted ones
- Deleting a block creates a new row with `is_deleted=True` as the latest version, which excludes the block from all current views
- Historical versions remain in the database; use `GET /blocks/<id>` (returns latest) or query the table directly for audit trails

In **cloud mode**, blocks are mutable with versioning handled via changesets and snapshots.

#### `POST /blocks/`

**Request:**
```json
{
  "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "parent_block_id": null,
  "block_type": "paragraph",
  "position": null,
  "content": { "text": "This is a paragraph block." }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `entity_id` | ✅ | Parent entity |
| `parent_block_id` | — | For nested blocks |
| `block_type` | ✅ | See block types below |
| `position` | — | Sort order (float, defaults to next available) |
| `content` | — | JSON object with block-type-specific data |

**Block types:** `text`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list`, `numbered_list`, `to_do`, `code`, `quote`, `callout`, `image`, `divider`, `table`

**`content` structure by block type:**

| Block Type | Content Shape |
|-----------|--------------|
| `text` | `{"text": "..."}` |
| `heading_1` | `{"text": "..."}` |
| `heading_2` | `{"text": "..."}` |
| `heading_3` | `{"text": "..."}` |
| `bulleted_list` | `{"text": "..."}` |
| `numbered_list` | `{"text": "..."}` |
| `to_do` | `{"text": "...", "checked": false}` |
| `code` | `{"text": "...", "language": "python"}` |
| `quote` | `{"text": "..."}` |
| `callout` | `{"text": "...", "icon": "💡"}` |
| `image` | `{"url": "...", "alt": "..."}` |
| `divider` | `{}` |
| `table` | `{"rows": [...], "columns": [...]}` |

#### `PATCH /blocks/<id>`

**Request:**
```json
{
  "block_type": "heading_2",
  "content": { "text": "Overview" }
}
```

#### `POST /blocks/reorder`

Batch update block positions in a single call.

**Response `200`:**
```json
{
  "data": [
    { "id": "block-uuid-1", "position": 100, ... },
    { "id": "block-uuid-2", "position": 200, ... },
    { "id": "block-uuid-3", "position": 300, ... }
  ]
}
```

**Request:**
```json
{
  "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "blocks": [
    { "id": "4ef014a4-569d-4cf9-98fe-d2784860b263", "position": 100 },
    { "id": "5a3978e0-dfeb-475d-911e-5451dd808dad", "position": 200 }
  ]
}
```

#### `POST /blocks/<id>/move`

Move a block to a different parent or position.

**Request:**
```json
{
  "parent_block_id": "uuid-or-null",
  "position": 500
}
```

---

### Relations

Connect entities to form a knowledge graph.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/relations/` | Access | List relations |
| POST | `/relations/` | Access | Create a relation |
| GET | `/relations/<id>` | Access | Get relation details |
| DELETE | `/relations/<id>` | Access | Delete relation permanently |
| GET | `/relations/entity/<entity_id>` | Access | Get outgoing relations |
| GET | `/relations/backlinks/<entity_id>` | Access | Get incoming relations (backlinks) |
| GET | `/relations/neighbors/<entity_id>` | Access | Get graph neighbors |
| GET | `/relations/path` | Access | Find shortest path between entities |

#### `POST /relations/`

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "source_entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "target_entity_id": "2cf8e8f8-b3d2-430c-883a-d68a2bf6cb8b",
  "relation_type": "refers_to",
  "metadata": { "confidence": 0.95 }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `workspace_id` | ✅ | |
| `source_entity_id` | ✅ | Origin entity |
| `target_entity_id` | ✅ | Destination entity |
| `relation_type` | ✅ | Any string — `refers_to`, `depends_on`, `part_of`, `related_to`, `implements`, `extends`, or custom |
| `metadata` | — | Arbitrary JSON dict |

**Response `201`:**
```json
{
  "data": {
    "id": "63ed9d0f-4a67-4cdf-8df5-ee166567f38a",
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "source_entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
    "target_entity_id": "2cf8e8f8-b3d2-430c-883a-d68a2bf6cb8b",
    "relation_type": "refers_to",
    "relation_metadata": {},
    "created_by": null,
    "created_at": "2026-06-21T08:30:00Z"
  }
}
```

#### `GET /relations/entity/<entity_id>`

Returns all relations where this entity is the **source**. Response is a plain array of relation objects wrapped in `{"data": [...]}`.

#### `GET /relations/backlinks/<entity_id>`

Returns all relations where this entity is the **target** — the "who links to me" view. Response is a plain array wrapped in `{"data": [...]}`.

#### `GET /relations/neighbors/<entity_id>`

Returns all connected entities with their relation types — used by the graph renderer. Response wrapped in `{"data": {...}}`.

#### `GET /relations/path`

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `source_entity_id` | ✅ | Start entity |
| `target_entity_id` | ✅ | End entity |

Finds the shortest path between two entities in the relation graph.

---

### Comments

Threaded discussions on entities and blocks.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/comments/` | Access | List comments |
| POST | `/comments/` | Access | Create a comment |
| GET | `/comments/<id>` | Access | Get comment |
| PATCH | `/comments/<id>` | Access | Update comment |
| DELETE | `/comments/<id>` | Access | Delete comment permanently |

#### `POST /comments/`

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "block_id": null,
  "parent_comment_id": null,
  "content": "Looks good."
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `workspace_id` | ✅ | Must match the entity's workspace |
| `entity_id` | — | Attach to an entity |
| `block_id` | — | Attach to a specific block |
| `parent_comment_id` | — | Reply to an existing comment |
| `content` | ✅ | Minimum 1 character |

At least one of `entity_id` or `block_id` must be provided.

**Response `201`:** Created comment object with `id`.

#### `PATCH /comments/<id>`

```json
{
  "content": "Looks good after review."
}
```

---

### Tags

Lightweight labels for entities — simpler than relations but equally powerful.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/tags/` | Access | List tags |
| POST | `/tags/` | Access | Create a tag |
| GET | `/tags/<id>` | Access | Get tag details |
| PATCH | `/tags/<id>` | Access | Update tag |
| DELETE | `/tags/<id>` | Access | Delete tag |
| POST | `/tags/<tag_id>/entities/<entity_id>` | Access | Tag an entity |
| DELETE | `/tags/<tag_id>/entities/<entity_id>` | Access | Untag an entity |

#### `POST /tags/`

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "name": "important",
  "color": "#ff4444"
}
```

#### `POST /tags/<tag_id>/entities/<entity_id>`

Apply a tag to an entity. No request body needed.

**Response `201`:**
```json
{ "data": { "tag_id": "c3d7e8f1-4a2b-4c5d-8e6f-7a8b9c0d1e2f", "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3", "created_at": "2026-06-21T08:30:00Z" } }
```

#### `DELETE /tags/<tag_id>/entities/<entity_id>`

Remove a tag from an entity.

---

### Branches

Git-inspired branching for fearless experimentation.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/branches/` | Access | List branches |
| POST | `/branches/` | Access | Create a branch |
| GET | `/branches/<id>` | Access | Get branch details |
| DELETE | `/branches/<id>` | Access | Delete branch |
| POST | `/branches/<id>/merge` | Access | Merge into another branch |
| POST | `/branches/merge` | Access | Merge two branches by ID |

#### `POST /branches/`

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "parent_branch_id": "2a49ccf9-f02e-4b68-8de9-b1d6837130a1",
  "name": "experiment",
  "description": "Alternative architecture exploration",
  "is_default": false
}
```

#### `POST /branches/<id>/merge`

Merge the branch identified by `<id>` (source) into another branch.

```json
{
  "target_branch_id": "2a49ccf9-f02e-4b68-8de9-b1d6837130a1"
}
```

#### `POST /branches/merge`

Merge two branches by specifying both explicitly.

```json
{
  "source_branch_id": "b5a2bf83-1282-4df3-8cb3-1a22bcf291a1",
  "target_branch_id": "2a49ccf9-f02e-4b68-8de9-b1d6837130a1"
}
```

---

### Versions (Cloud-Only)

> Architectural specification in [`gnovium_mvp_context.md#4--versioning-system`](../gnovium_mvp_context.md#4--versioning-system). This section documents the API endpoints only.

Workspace versioning — snapshots, changesets, and entity history. **Only available in cloud mode.**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/versions/changesets` | Access | List changesets |
| POST | `/versions/changesets` | Access | Create a changeset |
| GET | `/versions/snapshots` | Access | List snapshots |
| POST | `/versions/snapshots` | Access | Create a snapshot |
| POST | `/versions/entities/<entity_id>/snapshot` | Access | Snapshot a single entity |
| GET | `/versions/entities/<entity_id>` | Access | List entity versions |
| GET | `/versions/blocks/<block_id>` | Access | List block versions |
| GET | `/versions/compare` | Access | Compare two versions |
| POST | `/versions/restore/<version_id>` | Access | Restore an entity to a version |

#### `POST /versions/changesets`

```json
{
  "branch_id": "2a49ccf9-f02e-4b68-8de9-b1d6837130a1",
  "snapshot_id": null,
  "message": "Capture entity edits"
}
```

#### `POST /versions/snapshots`

```json
{
  "branch_id": "2a49ccf9-f02e-4b68-8de9-b1d6837130a1",
  "name": "Before launch",
  "description": "Stable state before production launch"
}
```

#### `POST /versions/entities/<entity_id>/snapshot`

Take a point-in-time snapshot of a single entity.

```json
{
  "changeset_id": "0b7c95b2-8eb6-4ca4-aa04-420fd68cbb0c"
}
```

#### `GET /versions/compare`

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `left_version_id` | ✅ | Earlier version |
| `right_version_id` | ✅ | Later version |

**Response:** Structured diff showing added, removed, and changed blocks.

#### `POST /versions/restore/<version_id>`

Restore an entity to a previous version. No request body required — the target entity is identified from the version record.

**Response `200`:**
```json
{
  "data": {
    "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
    "restored_version_id": "70fdad5c-2e3b-49a2-9146-fbd84d61f27a",
    "restored_at": "2026-06-21T08:30:00Z",
    "blocks_restored": 12
  }
}
```

---

### Diffs (Cloud-Only)

Visual comparison between versions, snapshots, and branches. **Only available in cloud mode.**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/diffs/compare` | Access | Compare two snapshots or branches |

**Request — compare two versions/snapshots:**
```json
{
  "left_version_id": "109518f4-4e1b-43b2-9640-f8da24e0e1d5",
  "right_version_id": "36fa4408-9cf7-41a8-920e-adc42c91a1d9"
}
```

Or compare branches:
```json
{
  "left_branch_id": "2a49ccf9-f02e-4b68-8de9-b1d6837130a1",
  "right_branch_id": "0b7c95b2-8eb6-4ca4-aa04-420fd68cbb0c"
}
```

`left_version_id`/`right_version_id` and `left_snapshot_id`/`right_snapshot_id` are interchangeable (snapshot IDs resolve to version IDs internally).

**Response `200`:**
```json
{
  "data": [
    {
      "type": "added",
      "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "block_id": "4ef014a4-569d-4cf9-98fe-d2784860b263",
      "after": { "text": "New section" }
    },
    {
      "type": "removed",
      "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "block_id": "5a3978e0-dfeb-475d-911e-5451dd808dad",
      "before": { "text": "Old section" }
    },
    {
      "type": "modified",
      "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "block_id": "4ef014a4-569d-4cf9-98fe-d2784860b263",
      "field": "content",
      "before": { "text": "Before" },
      "after": { "text": "After" }
    }
  ]
}
```

No `meta` envelope — the response is a plain array wrapped in `{"data": [...]}`.

---

### Search

Full-text, semantic, and hybrid search across workspace content.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search/` | Access | Search workspace content |

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `workspace_id` | UUID | — | ✅ **Required.** Scope search to a workspace |
| `q` | string | — | ✅ **Required.** Search query (minimum 1 char) |
| `mode` | enum | `hybrid` | `keyword` · `full_text` · `hybrid` · `semantic` |
| `limit` | int | `20` | Results per page (1–50) |

**Search modes:**

| Mode | Description |
|------|-------------|
| `keyword` | LIKE-based text match on `search_documents` title and content |
| `full_text` | FTS5 on materialized `search_documents_fts` (page-level) |
| `hybrid` | Merged block-level (`blocks_fts`) + page-level (`search_documents_fts`) results with ranking (default) |
| `semantic` | Embedding-based vector similarity — requires configured inference runtime / pgvector |

**Local mode** uses SQLite FTS5 with two search indexes:
- **`blocks_fts`** — real-time block-level search, auto-synced via triggers on the `blocks` table
- **`search_documents_fts`** — materialized page-level index, one row per entity, rebuilt by `BlockService` after each block change via `SearchService.rebuild_entity_index()`

The hybrid mode queries both indexes and merges results with score ranking.

**Cloud mode** uses PostgreSQL `tsvector` with `pg_trgm` for fuzzy matching and `pgvector` for semantic search.

**Response `200` (hybrid mode):**
```json
{
  "data": [
    {
      "id": "c7ad2e49-6322-4214-8cbd-8ec8a1dcdb8f",
      "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "block_id": null,
      "title": "Research Notes",
      "content": "Authentication strategy notes",
      "match_type": "page",
      "score": 0.95
    },
    {
      "id": "4ef014a4-569d-4cf9-98fe-d2784860b263",
      "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "block_id": "4ef014a4-569d-4cf9-98fe-d2784860b263",
      "title": "Authentication Flow",
      "content": "The system uses JWT tokens...",
      "match_type": "block",
      "score": 0.87
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Result ID (block ID for `block` matches, search_document ID for `page` matches) |
| `entity_id` | string | Parent entity UUID |
| `block_id` | string or null | Block UUID for `block` matches, `null` for `page` matches |
| `title` | string | Entity title |
| `content` | string | Block content (JSON) for `block` matches; concatenated block text for `page` matches |
| `match_type` | enum | `"block"` (real-time block FTS) or `"page"` (materialized entity-level) |
| `score` | float | Relevance score 0.0–1.0 |

> The response wraps in `{"data": [ ... ]}` — no `meta` envelope since pagination is controlled via the `limit` parameter only.

---

### AI Assistant

Ask questions about your workspace and get answers grounded in your knowledge.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ai/query` | Access | Ask a question about workspace content |

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "question": "Summarize the architecture of Research Notes",
  "limit": 8
}
```

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `workspace_id` | ✅ | — | Scope to this workspace |
| `question` | ✅ | — | Natural language question (min 1 char) |
| `limit` | — | 8 | Number of context documents to retrieve (1–20) |

**How it works — Safety-First Multi-Agent Pipeline:**

```
Question
   │
   ▼
┌──────────────────────────────────────────────────┐
│ Supervisor Agent                                 │
│  • Routes the task to the appropriate planner    │
│  • Decides local vs cloud execution              │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Planner Agent                                    │
│  • Breaks down complex questions into sub-tasks  │
│  • Coordinates Worker Agents                     │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Worker Agents (parallel execution)               │
│                                                   │
│  Knowledge Agent: semantic + graph-aware search   │
│  Editor Agent: entity/block lookups (via tools)   │
│  Governance Agent: health context if needed       │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Safety Layer (6-stage)                           │
│  1. Policy Validation — matches agent action     │
│     against workspace policies                   │
│  2. Permission Validation — RBAC + ownership     │
│  3. Simulation/Dry-Run — previews outcome        │
│     without committing                           │
│  4. Diff Generation — shows exact changeset      │
│  5. User Approval — required for destructive     │
│     writes; read-only tools (search, graph       │
│     queries) bypass this stage                   │
│  6. Execution — approved changes committed       │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ Inference Runtime                                 │
│  • Generates final answer grounded in context     │
│  • Practical MVP backends: llama.cpp, ONNX       │
│    Runtime, TensorRT-LLM provide working AI      │
│    day one; custom GPU-native runtime is the      │
│    long-term strategic differentiator            │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
                  Answer + Sources
```

**Retrieval is graph-aware.** The retriever combines semantic vector search with graph traversal — finding related entities via typed relations (`refers_to`, `depends_on`, `part_of`, etc.) to enrich the context assembly. This means questions like *"What depends on Project Alpha?"* naturally pull in connected knowledge.

**Mode-specific execution:**

| Mode | Inference | Agents | Storage |
|------|-----------|--------|---------|
| **Local** | Gnovium GPU-native runtime (CUDA, on-device) — practical MVP backends (llama.cpp, ONNX Runtime, TensorRT-LLM) supported day one | All agents run locally | SQLite + local vector store |
| **Cloud** | Cloud inference runtime (managed GPU) | Agents can coordinate across users | PostgreSQL + pgvector |

**Response `200`:**
```json
{
  "data": {
    "answer": "Project Alpha uses a microservices architecture with…",
    "sources": [
      { "title": "Architecture Overview", "content": "..." },
      { "title": "Project Alpha README", "content": "..." }
    ]
  }
}
```

> **Note:** Each source `content` is truncated to 2000 characters. The configured inference runtime is used for answer generation (see mode table above).

---

### Files

Upload, manage, and link files to entities.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/files/` | Access | List files |
| POST | `/files/upload` | Access | Upload a file (multipart) |
| POST | `/files/` | Access | Register file metadata |
| GET | `/files/<id>` | Access | Get file details |
| GET | `/files/<id>/download` | Access | Download file content |
| DELETE | `/files/<id>` | Access | Delete file permanently (removes from disk) |
| POST | `/files/presign` | Access | **Cloud-only.** Get a presigned S3 upload URL |
| POST | `/files/<file_id>/entities/<entity_id>` | Access | Link file to entity |
| POST | `/files/cleanup-orphans` | Access | Remove unlinked file records from disk |

#### Upload Pipeline

```
POST /files/upload
  → 1. Validate extension & MIME type (allowlist)
  → 2. Read bytes, compute SHA-256 hash
  → 3. Check storage quota (500 MB default)
  → 4. Dedup: skip save if same hash + workspace exists
  → 5. Save to disk (local) or S3 (cloud)
  → 6. Create File record in database
```

**Validation allowlists:**

| Scope | Entries |
|-------|---------|
| Extensions | `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `pdf`, `doc`, `docx`, `txt`, `md`, `json`, `csv`, `mp4`, `mp3`, `zip` and ~30 more |
| MIME types | `image/jpeg`, `image/png`, `application/pdf`, `text/plain`, `video/mp4`, `audio/mpeg` and ~15 more |

#### `POST /files/upload`

Upload a file using multipart form data.

**Form fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | binary | ✅ | The file to upload |
| `workspace_id` | string | ✅ | Target workspace |

**Response `201` (new upload):**
```json
{
  "data": {
    "id": "f5da7c75-283d-47b7-82bd-3f2dfb8d1b01",
    "file_name": "diagram.png",
    "mime_type": "image/png",
    "file_size": 204800,
    "public_url": "/uploads/workspaces_50e50f55_diagram.png",
    "object_key": "workspaces/50e50f55/diagram.png",
    "deduplicated": false
  }
}
```

**Response `200` (duplicate detected):**
```json
{
  "data": {
    "id": "f5da7c75-283d-47b7-82bd-3f2dfb8d1b01",
    "file_name": "diagram.png",
    "mime_type": "image/png",
    "file_size": 204800,
    "public_url": "/uploads/workspaces_50e50f55_diagram.png",
    "object_key": "workspaces/50e50f55/diagram.png",
    "deduplicated": true
  }
}
```

When a file with the same `content_hash` already exists in the workspace, the existing record is returned and no new bytes are stored.

**Error responses:**

| Status | Reason |
|--------|--------|
| `400` | Unsupported file extension or MIME type |
| `400` | Storage quota exceeded |
| `400` | `file` or `workspace_id` missing |

#### `GET /files/<id>/download`

Serve the file content directly.

- **Local mode:** Streams from `instance/uploads/` via `send_from_directory`
- **Cloud mode:** Redirects to the S3 `public_url`

**Response `200`:** Binary file stream with original filename and `Content-Type`.

#### `DELETE /files/<id>`

Delete the file record permanently and **remove the bytes from disk** (local mode). Returns `200` with the deleted record.

#### `POST /files/`

Register file metadata without uploading (e.g. for pre-uploaded cloud files).

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "file_name": "diagram.png",
  "mime_type": "image/png",
  "file_size": 204800,
  "object_key": "uploads/diagram.png",
  "public_url": "https://cdn.gnovium.com/uploads/diagram.png"
}
```

#### `POST /files/presign` (Cloud-Only)

Get a presigned URL for direct browser-to-S3 upload. Returns `404` in local mode.

```json
{
  "object_key": "uploads/diagram.png",
  "content_type": "image/png"
}
```

**Response `200`:**
```json
{
  "data": {
    "enabled": true,
    "upload_url": "https://s3.amazonaws.com/gnovium/uploads/diagram.png?AWSAccessKeyId=...&Signature=...",
    "object_key": "uploads/diagram.png"
  }
}
```

#### `POST /files/<file_id>/entities/<entity_id>`

Attach an existing file to an entity.

```json
{
  "block_id": null
}
```

Optionally link to a specific block within the entity.

#### `POST /files/cleanup-orphans`

Find all active `File` records with zero active `EntityFile` links and hard-delete them (DB record + disk bytes removed).

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579"
}
```
Omitting `workspace_id` cleans up orphans across all workspaces.

**Response `200`:**
```json
{
  "data": {
    "deleted": 5
  }
}
```

---

### Graph

The visual knowledge graph — materialized, queryable, traversable. Graph materialization uses incremental/cached updates — full rebuilds occur only on first materialization or schema changes; subsequent requests apply incremental diffs.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/graph/` | Access | Get the latest materialized graph |
| POST | `/graph/materialize` | Access | Materialize the graph snapshot |
| POST | `/graph/query` | Access | Query graph nodes and edges |
| POST | `/graph/traverse` | Access | BFS traversal from a center node |
| POST | `/graph/paths` | Access | Find shortest path between two nodes |

#### `GET /graph/`

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `workspace_id` | ✅ | Scope to workspace |

Returns the latest materialized graph snapshot with nodes and edges. Returns `404` if no graph has been materialized yet — call `POST /graph/materialize` first.

**Response `200`:**
```json
{
  "data": {
    "id": "c61ba51e-5e52-4f68-8b35-4c74f6928d06",
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "graph_snapshot": {
      "nodes": [
        { "id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3", "title": "Research Notes", "type": "8cb385bc-223d-4c3e-8c38-dfa22026d36e", "icon": null }
      ],
      "edges": [
        { "id": "63ed9d0f-4a67-4cdf-8df5-ee166567f38a", "source": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3", "target": "2cf8e8f8-b3d2-430c-883a-d68a2bf6cb8b", "type": "refers_to" }
      ],
      "generated_at": "2026-06-21T08:30:00Z"
    },
    "version_hash": "sha256-hex",
    "generated_at": "2026-06-21T08:30:00Z"
  }
}
```

#### `POST /graph/materialize`

Trigger a fresh materialization of the graph from current entities and relations.

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579"
}
```

**Response `201`:** New graph materialization object.

#### `POST /graph/query`

Filtered graph query.

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "relation_types": ["refers_to", "depends_on"],
  "entity_type_ids": ["8cb385bc-223d-4c3e-8c38-dfa22026d36e"],
  "limit": 100
}
```

All filter fields are optional — omit to get the full graph.

**Response `200`:**
```json
{
  "data": {
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "nodes": [ ... ],
    "edges": [ ... ],
    "node_count": 42,
    "edge_count": 18
  }
}
```

#### `POST /graph/traverse`

Breadth-first traversal from a center node.

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "center_node": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "depth": 2,
  "relation_types": ["refers_to"]
}
```

| Field | Default | Max |
|-------|---------|-----|
| `depth` | 2 | 5 |

#### `POST /graph/paths`

Find the shortest path between two entities.

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "source_entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "target_entity_id": "2cf8e8f8-b3d2-430c-883a-d68a2bf6cb8b"
}
```

**Response:** Shortest path with nodes, edges, and distance. Returns `distance: -1` if no path exists.

---

### Governance

Workspace health — detect duplicates, orphans, stale content, and calculate a health score. All governance analysis runs as background jobs with tiered processing: cheap checks (duplicate title detection) execute inline; expensive analysis (full content similarity, stale detection) is delegated to async job workers.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/governance/health` | Access | Get workspace health score |
| GET | `/governance/duplicates` | Access | Find duplicate entities |
| GET | `/governance/orphans` | Access | Find orphaned entities |
| GET | `/governance/stale` | Access | Find stale entities |
| POST | `/governance/health-score` | Access | Recalculate health score |

#### `GET /governance/health`

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `workspace_id` | ✅ | Scope to workspace |

**Response `200`:** Latest governance report.

```json
{
  "data": {
    "id": "9cbef023-ffaa-45cc-ba1e-faef266bc39e",
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "health_score": 82,
    "duplicate_count": 2,
    "orphan_count": 5,
    "stale_count": 3,
    "report": {
      "duplicates": [
        { "title": "Untitled", "count": 3 },
        { "title": "Meeting Notes", "count": 2 }
      ],
      "orphans": [ ... ],
      "stale": [ ... ],
      "entity_count": 42
    },
    "created_at": "2026-06-21T08:30:00Z"
  }
}
```

**Health score formula:**

```
score = max(0, 100 - penalty)
penalty = min(70, duplicates × 5 + orphans × 2 + stale)
```

- **90–100:** Excellent (green)
- **70–89:** Needs attention (yellow)
- **Below 70:** Requires cleanup (red)

#### `GET /governance/duplicates`

Returns entities with identical (case-insensitive) titles.

#### `GET /governance/orphans`

Returns entities with zero relations — no incoming or outgoing connections.

#### `GET /governance/stale`

Returns entities not updated in 90+ days.

#### `POST /governance/health-score`

Force a recalculation and store a new report. Expects `?workspace_id=uuid` as query parameter.

---

### Dashboard

At-a-glance workspace overview.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/overview` | Access | Workspace overview dashboard |

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `workspace_id` | ✅ | Scope to workspace |

**Response `200`:**
```json
{
  "data": {
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "entity_count": 42,
    "block_count": 215,
    "relation_count": 18,
    "comment_count": 7,
    "member_count": 3,
    "archived_count": 5,
    "recent_entities": [
      { "id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3", "title": "Research Notes", "updated_at": "2026-06-21T08:30:00Z" }
    ]
  }
}
```

> `member_count` reflects the actual workspace member count in cloud mode. In local mode, returns `1` (single-user desktop).

---

### Notifications

User notifications for workspace events.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications/` | Access | List notifications |
| POST | `/notifications/` | Access | Create a notification |
| POST | `/notifications/<id>/read` | Access | Mark notification as read |

#### `POST /notifications/`

**Request:**
```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "user_id": "d9b23b3f-1d86-4e5a-a5f1-3cf93f9ef294",
  "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "type": "mention",
  "title": "Mentioned in Research Notes",
  "message": "You were mentioned in a comment."
}
```

**Notification types:** `mention`, `comment`, `update`, `invite`, `system`.

#### `POST /notifications/<id>/read`

Mark a single notification as read. No request body needed.

---

### Jobs (Cloud-Only)

Asynchronous job tracking for long-running operations. **Only available in cloud mode.**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/jobs/` | Access | List jobs |
| POST | `/jobs/` | Access | Create a job |
| POST | `/jobs/<id>/running` | Access | Mark job as running |
| POST | `/jobs/<id>/completed` | Access | Mark job as completed |

#### `POST /jobs/`

```json
{
  "workspace_id": null,
  "job_type": "embedding_refresh",
  "payload": { "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3" }
}
```

#### `POST /jobs/<id>/completed`

```json
{
  "result": { "processed": 24, "failed": 0 }
}
```

---

### Sync (Cloud-Only)

Offline sync operations — queue, ingest, and acknowledge changes. **Only available in cloud mode.** Uses a Git-style operation log (ordered append-only changesets with server-side conflict resolution) rather than CRDTs — chosen for simplicity and predictable merge semantics in a workspace-oriented data model.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/sync/` | Access | List sync operations |
| POST | `/sync/` | Access | Ingest a sync operation |
| GET | `/sync/<id>` | Access | Get sync operation details |
| POST | `/sync/<op_id>/ack` | Access | Acknowledge sync complete |

#### `POST /sync/`

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "operation_type": "entity_update",
  "entity_type": "entity",
  "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
  "payload": { "title": "Research Notes v2" },
  "device_id": "web-01",
  "client_clock": 42
}
```

**Operation types:** `entity_create`, `entity_update`, `entity_delete`, `block_create`, `block_update`, `block_delete`, `relation_create`, `relation_delete`.

#### `POST /sync/<op_id>/ack`

Mark a sync operation as processed. Conflicts are resolved server-side.

---

### Activity

Audit trail of workspace events.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/activity/` | Access | List activity log |

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `workspace_id` | ✅ | Scope to workspace |
| `page` | — | Page number |
| `per_page` | — | Items per page (default 25) |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
      "user_id": "d9b23b3f-1d86-4e5a-a5f1-3cf93f9ef294",
      "entity_id": "fa82a0b1-12c8-47fb-ba2e-ff6a39226cb3",
      "block_id": null,
      "action": "entity.create",
      "details": { "title": "Research Notes", "entity_type_id": "8cb385bc-223d-4c3e-8c38-dfa22026d36e" },
      "created_at": "2026-06-21T08:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 25,
    "total": 42,
    "pages": 2
  }
}
```

Returns most recent first. `user_id` may be `null` for system-generated events.

---

### Backups

Export and import workspace data for migration and safekeeping.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/backups/export` | Access | Export workspace as JSON (in-memory) |
| POST | `/backups/export-to-disk` | Access | Export workspace to disk (`instance/backups/`) |
| POST | `/backups/import` | Access | Import workspace from JSON |

#### `POST /backups/export`

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579"
}
```

**Response `200`:**
```json
{
  "data": {
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "exported_at": "2026-06-21T12:30:00Z",
    "entity_types": [ ... ],
    "entities": [ ... ],
    "blocks": [ ... ],
    "relations": [ ... ],
    "tags": [ ... ],
    "comments": [ ... ],
    "properties": [ ... ],
    "files": [ ... ]
  }
}
```

Full workspace dump including entities, blocks, relations, tags, comments, properties, and **files metadata**. The export format is compatible with the import endpoint.

#### `POST /backups/export-to-disk`

Same payload as `/backups/export` but writes the JSON to `instance/backups/workspace_{id}_{timestamp}.json` on the server instead of returning it inline.

**Response `200`:**
```json
{
  "data": {
    "path": "/path/to/instance/backups/workspace_50e50f55_20260621_123000.json"
  }
}
```

Useful for automated local backups or pre-migration snapshots.

#### `POST /backups/import`

```json
{
  "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
  "entity_types": [ ... ],
  "entities": [ ... ],
  "blocks": [ ... ],
  "relations": [ ... ],
  "tags": [ ... ],
  "comments": [ ... ],
  "properties": [ ... ],
  "files": [ ... ]
}
```

**Response `201`:**
```json
{
  "data": {
    "workspace_id": "50e50f55-27a3-4927-90c7-0e6d5eb72579",
    "imported": {
      "entity_types": 3,
      "entities": 15,
      "properties": 6,
      "blocks": 120,
      "relations": 8,
      "tags": 5,
      "comments": 2
    }
  }
}
```

`files` in the request body are **not imported** — file data is informational only and included for archive completeness.

Confirmation with counts of imported items.

> **Tip:** Use export to create portable workspace archives. Works across local and cloud modes.

---

## Quick Reference

### Route Count by Module

| Module | Routes | Available |
|--------|:------:|-----------|
| System | 1 | Both |
| Auth | 8 | Cloud only |
| Workspaces | 6 | Both |
| Entities | 15 | Both (versions endpoint cloud-only) |
| Blocks | 8 | Both |
| Relations | 8 | Both |
| Comments | 5 | Both |
| Tags | 7 | Both |
| Branches | 6 | Both |
| Versions | 9 | Cloud only |
| Diffs | 1 | Cloud only |
| Search | 1 | Both |
| AI | 1 | Both |
| Files | 9 | Both (presign endpoint cloud-only) |
| Graph | 5 | Both |
| Governance | 5 | Both |
| Dashboard | 1 | Both |
| Notifications | 3 | Both |
| Jobs | 4 | Cloud only |
| Sync | 4 | Cloud only |
| Activity | 1 | Both |
| Backups | 3 | Both |
| **Total** | **111** | **83 shared + 28 cloud-only** |

### Essential Endpoints

| What | Method | Endpoint | Notes |
|------|--------|----------|-------|
| Health check | `GET` | `/health` | |
| Register | `POST` | `/auth/register` | Cloud-only |
| Login | `POST` | `/auth/login` | Cloud-only |
| My profile | `GET` | `/auth/me` | |
| List workspaces | `GET` | `/workspaces/` | |
| Create workspace | `POST` | `/workspaces/` | |
| Create entity | `POST` | `/entities/` | |
| Create block | `POST` | `/blocks/` | Append-only in local mode |
| Block current list | `GET` | `/blocks/?entity_id=<id>` | Returns only non-deleted blocks |
| Get block latest | `GET` | `/blocks/<id>` | Returns latest version of block |
| Create relation | `POST` | `/relations/` | |
| Create tag | `POST` | `/tags/` | |
| Search | `GET` | `/search/` | |
| AI query | `POST` | `/ai/query` | |
| Dashboard | `GET` | `/dashboard/overview` | |
| Graph query | `POST` | `/graph/query` | |
| Graph materialize | `POST` | `/graph/materialize` | |
| Health score | `GET` | `/governance/health` | |
| Download file | `GET` | `/files/<id>/download` | Streams file content |
| Cleanup orphans | `POST` | `/files/cleanup-orphans` | Removes unlinked files from disk |
| Upload file | `POST` | `/files/upload` | Multipart; validates ext + MIME, dedup, quota |
| Backup export | `POST` | `/backups/export` | |
| Backup to disk | `POST` | `/backups/export-to-disk` | Writes to `instance/backups/` |

### Common Patterns

**Pagination:**
```
GET /endpoint?page=2&per_page=50
```

**Delete → restore:**
```
DELETE /entities/<id>       # deletes permanently
POST   /entities/<id>/restore  # restores if within retention window
```

**Auth flow (cloud → local/desktop):**
```
POST https://api.gnovium.com/auth/register  →  access_token + refresh_token
     ↳ Pass access_token as Bearer token to localhost:5001
     ↳ Local Flask verifies JWT cryptographically — no network call
```

**Chain knowledge:**
```
POST /entities/                 → entity A
POST /entities/                 → entity B
POST /relations/                → A → B
POST /graph/materialize         → snapshot the graph
GET  /graph/query               → see the connection
POST /search/?q=keyword         → find related content
POST /ai/query                  → ask about the relationship
POST /backups/export            → backup everything
```

---

## Best Practices

### 1. Use pagination for list endpoints
Always pass `page` and `per_page` to list endpoints. The default `per_page` is 25 — increase to 50 for batch operations.

### 2. Exploit partial updates
`PATCH` endpoints accept any subset of fields. Don't send the full object — only include what changed.

### 3. Chain relations for rich knowledge
A typical workflow: create entities → link with relations → view graph → query with AI.

```
POST /entities/         → entity A
POST /entities/         → entity B
POST /relations/        → A → B
GET  /graph/query       → see the connection
POST /ai/query          → ask about the relationship
```

### 4. Use branches for experiments
Before making significant changes, create a branch:

```
POST /branches/       → new branch
... make changes ...
POST /branches/<id>/merge → merge back
```

### 5. Monitor workspace health
Regularly check `/governance/health` to identify duplicates, orphans, and stale content. A score above 90 is healthy.

### 6. Backup before migrations
```
POST /backups/export → save the JSON
... make changes ...
POST /backups/import → restore if needed
```

### 7. Restore deleted content
Deleted entities and workspaces can be restored via `POST /<resource>/<id>/restore` within the retention window.

### 8. Use hybrid search
For the best results, use `mode=hybrid` in search queries — it combines keyword matching with full-text search.

### 9. Desktop auth flow
For electron/desktop apps, open a browser to the cloud API's `/auth/login`, capture the returned JWT, and pass it to the local Flask API. Both use the same `JWT_SECRET_KEY` — no extra config needed.

### 10. Share JWT_SECRET_KEY
Ensure `.env`, `.env.local`, and `.env.cloud` all define the same `JWT_SECRET_KEY`. Without this, tokens issued by the cloud API will be rejected by the local instance.

---

## Appendix: Schema Reference

> **Type note:** `UUID` refers to a v4 UUID string (36 chars with hyphens). In local SQLite mode, these are stored as `TEXT` columns — the wire format is identical.

### Pagination

| Field | Type | Default | Range |
|-------|------|---------|-------|
| `page` | int | 1 | min 1 |
| `per_page` | int | 25 | min 1, max 100 |

### Auth Schemas

| Schema | Fields |
|--------|--------|
| `RegisterSchema` | `email` (Email, req), `password` (Str, req, min 8), `name` (Str, opt) |
| `LoginSchema` | `email` (Email, req), `password` (Str, req) |

### Workspace Schemas

| Schema | Fields |
|--------|--------|
| `WorkspaceCreateSchema` | `name` (Str, req, 1-160), `description` (Str, opt), `settings` (Dict, opt) |
| `WorkspaceUpdateSchema` | `name` (Str, opt, 1-160), `description` (Str, nullable), `settings` (Dict) |

### Entity Schemas

| Schema | Fields |
|--------|--------|
| `EntityTypeCreateSchema` | `workspace_id` (UUID, req), `name` (Str, req), `icon` (Str, opt), `config` (Dict, opt) |
| `EntityCreateSchema` | `workspace_id` (UUID, req), `entity_type_id` (UUID, req), `title` (Str, opt), `icon` (Str, opt), `cover_image` (Str, opt), `properties` (Dict, opt) |
| `EntityUpdateSchema` | `title` (Str, nullable), `icon` (Str, nullable), `cover_image` (Str, nullable), `is_archived` (Bool), `properties` (Dict) |
| `PropertyCreateSchema` | `workspace_id` (UUID, req), `entity_type_id` (UUID, opt, nullable), `name` (Str, req), `property_type` (Str, req), `config` (Dict, opt) |

### Block Schemas

| Schema | Fields |
|--------|--------|
| `BlockCreateSchema` | `entity_id` (UUID, req), `parent_block_id` (UUID, opt, nullable), `block_type` (Str, req), `position` (Decimal, opt, nullable), `content` (Dict, opt) |
| `BlockUpdateSchema` | `parent_block_id` (UUID, nullable), `block_type` (Str), `position` (Decimal), `content` (Dict) |
| `MoveBlockSchema` | `parent_block_id` (UUID, opt, nullable), `position` (Decimal, req) |

### Relation Schema

| Schema | Fields |
|--------|--------|
| `RelationCreateSchema` | `workspace_id` (UUID, req), `source_entity_id` (UUID, req), `target_entity_id` (UUID, req), `relation_type` (Str, req), `metadata` (Dict, opt) |

### Branch Schemas

| Schema | Fields |
|--------|--------|
| `BranchCreateSchema` | `workspace_id` (UUID, req), `parent_branch_id` (UUID, opt, nullable), `name` (Str, req), `description` (Str, opt), `is_default` (Bool, opt, default=false) |
| `MergeBranchSchema` | `source_branch_id` (UUID, req), `target_branch_id` (UUID, req) |

### Search / AI Schemas

| Schema | Fields |
|--------|--------|
| `SearchQuerySchema` | `workspace_id` (UUID, req), `q` (Str, req, min 1), `mode` (Str, opt, oneOf: `keyword`/`full_text`/`hybrid`/`semantic`, default=`hybrid`), `limit` (Int, opt, 1-50, default=20) |
| `AIQuerySchema` | `workspace_id` (UUID, req), `question` (Str, req, min 1), `limit` (Int, opt, 1-20, default=8) |

### File Schemas

| Schema | Fields |
|--------|--------|
| `FileCreateSchema` | `workspace_id` (UUID, req), `file_name` (Str, req), `mime_type` (Str, opt), `file_size` (Int, opt, nullable), `object_key` (Str, req), `public_url` (Str, opt) |

### Comment Schemas

| Schema | Fields |
|--------|--------|
| `CommentCreateSchema` | `workspace_id` (UUID, req), `entity_id` (UUID, opt, nullable), `block_id` (UUID, opt, nullable), `parent_comment_id` (UUID, opt, nullable), `content` (Str, req, min 1) |
| `CommentUpdateSchema` | `content` (Str, req, min 1) |

### Tag Schemas

| Schema | Fields |
|--------|--------|
| `TagCreateSchema` | `workspace_id` (UUID, req), `name` (Str, req), `color` (Str, opt, nullable) |
| `TagUpdateSchema` | `name` (Str), `color` (Str, nullable) |

### Notification Schema

| Schema | Fields |
|--------|--------|
| `NotificationCreateSchema` | `workspace_id` (UUID, req), `user_id` (UUID, req), `entity_id` (UUID, opt, nullable), `type` (Str, req), `title` (Str, req), `message` (Str, opt) |

### Cloud-Only Schemas

| Schema | Fields |
|--------|--------|
| `SnapshotCreateSchema` | `branch_id` (UUID, req), `name` (Str, opt), `description` (Str, opt) |
| `ChangesetCreateSchema` | `branch_id` (UUID, req), `snapshot_id` (UUID, opt, nullable), `message` (Str, opt) |
| `JobCreateSchema` | `workspace_id` (UUID, opt, nullable), `job_type` (Str, req), `payload` (Dict, req) |
| `SyncOperationCreateSchema` | `workspace_id` (UUID, req), `operation_type` (Str, req), `entity_type` (Str, opt, nullable), `entity_id` (UUID, opt, nullable), `payload` (Dict, req), `device_id` (Str, opt, nullable), `client_clock` (Int, opt, nullable) |

---

### Response Helpers

| Helper | Output | When Used |
|--------|--------|-----------|
| `item_response(item, status=200)` | `{"data": { serialized_model }}` | Single resource response |
| `list_response(pagination, status=200)` | `{"data": [items], "meta": {page, per_page, total, pages}}` | Paginated collection |
| `raw_response(data, status=200)` | `{"data": <raw_json> }` | Non-model responses — graph snapshots, backup data, governance reports, block lists with `?entity_id=` filter, search results |

---

### Auth Decorator Legend

| Decorator | Meaning |
|-----------|---------|
| `@secured` | JWT access token required; `current_user_id()` returns the user UUID |
| `@jwt_required(refresh=True)` | JWT refresh token required (for `/auth/refresh`, `/auth/logout`) |
| _(none)_ | **Public** — no authentication required |

---

*Gnovium API — v1 — 111 endpoints — Built for connected, versioned, evolvable knowledge.*
*Dual-mode: SQLite (local desktop) / PostgreSQL (cloud SaaS) — one contract, any deployment.*
