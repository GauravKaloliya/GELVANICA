# GNOVIUM KNOWLEDGE OS — COMPLETE API REFERENCE

> **Version:** 1.0.0  
> **Base URL:** `/api/v1`  
> **Deployment Modes:** `local` (SQLite) | `cloud` (PostgreSQL)  
> **Auth:** JWT Bearer tokens (access + refresh)  
> **Total Endpoints:** 223

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Deployment Modes](#2-deployment-modes)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [API Endpoints Reference](#4-api-endpoints-reference)
   - 4.1 [Auth](#41-auth)
   - 4.2 [Workspaces](#42-workspaces)
   - 4.3 [Workspace Members](#43-workspace-members)
   - 4.4 [Entities](#44-entities)
   - 4.5 [Entity Types](#45-entity-types)
   - 4.6 [Blocks](#46-blocks)
   - 4.7 [Branches](#47-branches)
   - 4.8 [Versions / Changesets / Snapshots](#48-versions--changesets--snapshots)
   - 4.9 [Diffs](#49-diffs)
   - 4.10 [Relations](#410-relations)
   - 4.11 [Tags](#411-tags)
   - 4.12 [Properties](#412-properties)
   - 4.13 [Files](#413-files)
   - 4.14 [Search](#414-search)
   - 4.15 [Graph](#415-graph)
   - 4.16 [Backups & Export](#416-backups--export)
   - 4.17 [Sync](#417-sync)
   - 4.18 [Activity](#418-activity)
   - 4.19 [Comments](#419-comments)
   - 4.20 [Notifications](#420-notifications)
   - 4.21 [Settings](#421-settings)
   - 4.22 [Dashboard](#422-dashboard)
   - 4.23 [AI](#423-ai)
   - 4.24 [Admin](#424-admin)
   - 4.25 [Jobs](#425-jobs)
   - 4.26 [Governance](#426-governance)
   - 4.27 [Docs](#427-docs)
   - 4.28 [Root Endpoints](#428-root-endpoints)
5. [Request/Response Format](#5-requestresponse-format)
6. [Error Codes](#6-error-codes)
7. [Rate Limiting](#7-rate-limiting)
8. [Data Models — Domain (PostgreSQL)](#8-data-models--domain-postgresql)
9. [Data Models — Local (SQLite)](#9-data-models--local-sqlite)
10. [SQL Schemas](#10-sql-schemas)
11. [Pydantic/Marshmallow Schemas](#11-pydanticmarshmallow-schemas)
12. [Service Layer](#12-service-layer)
13. [Repository Layer](#13-repository-layer)
14. [Configuration Reference](#14-configuration-reference)
15. [Middleware & Security](#15-middleware--security)
16. [Monitoring & Metrics](#16-monitoring--metrics)
17. [File Storage Architecture](#17-file-storage-architecture)
18. [Sync Mechanism](#18-sync-mechanism)
19. [Background Jobs & Processing](#19-background-jobs--processing)
20. [Testing](#20-testing)
21. [Scripts & Utilities](#21-scripts--utilities)

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
│  │  Domain (29 tables)  │  Local (29 tables)           │     │
│  └────────────────────────────────────────────────────┘     │
│              │                    │                         │
│              ▼                    ▼                         │
│        PostgreSQL              SQLite                       │
└─────────────────────────────────────────────────────────────┘
```

### Key File Structure

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
| `app/core/errors.py` | 20+ error code constants + 14 ApiError subclasses |
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
| `POSTGRESQL_SCHEMA.sql` | Complete PostgreSQL schema (29 tables, extensions, triggers) |

---

## 2. Deployment Modes

### Local Mode (`GNOVIUM_MODE=local`)
- **Database:** SQLite via `SQLITE_SCHEMA.sql`
- **Auth:** Local JWT (`LOCAL_AUTH_ENABLED=true`)
- **File Storage:** Local filesystem via `LocalProvider`
- **Port:** `5000` (default)
- **Testing:** Uses SQLite in-memory

### Cloud Mode (`GNOVIUM_MODE=cloud`)
- **Database:** PostgreSQL via `POSTGRESQL_SCHEMA.sql`
- **Auth:** Full auth stack (Google OAuth, password, JWT)
- **File Storage:** AWS S3 via `S3Provider`
- **Port:** `5000` (via `wsgi.py`)
- **Features:** Workspace members, jobs (cloud-only); comments, governance, admin (hybrid)

### Mode Selection
```python
# app/core/config.py
# 1. Load base .env
# 2. Check GNOVIUM_MODE
# 3. Load .env.cloud or .env.local on top
# 4. get_config() returns CloudConfig or LocalConfig
```

### Conditional Model Loading (`app/models/__init__.py`)
- `cloud` mode → imports from `app.models.domain` (all 29 tables)
- `local` mode → imports from `app.models.local` (25 tables + 4 cloud-only stubs)
- Cloud-only models get `_CloudOnlyStub` metaclass that raises `NotImplementedError` on `.query`
- Stub classes: `BranchMerge`, `Comment`, `CommentReaction`, `FileVariant`, `GovernanceReport`, `Invite`, `Job`, `MergeConflict`, `WorkspaceMember`

---

## 3. Authentication & Authorization

### 3.1 JWT Token System

| Token | Duration | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | 30 min (configurable) | `Authorization: Bearer <token>` | API auth |
| Refresh Token | 30 days (configurable) | `refresh_jti` in DB | Token refresh |

### 3.2 Endpoint Security Decorators

| Decorator | Source | Behavior |
|-----------|--------|----------|
| `@secured` | `app/services/security.py` | Wraps `@jwt_required()`, handles JWT errors |
| `@cloud_only` | `app/api/v1/helpers.py` | Returns 400 `cloud_only` in local mode |
| `@require_local_auth` | `app/api/v1/auth/routes.py` | Returns 400 if `LOCAL_AUTH_ENABLED=False` |
| `@require_admin` | `app/api/v1/admin/routes.py` | Checks admin/owner role in at least 1 workspace |
| `check_workspace_access(ws_id)` | `app/api/v1/helpers.py` | Validates user owns workspace (local) or is member (cloud) |
| `check_workspace_role(ws_id, roles)` | `app/api/v1/helpers.py` | Cloud only: checks minimum role level |
| `_require_settings_access(ws_id)` | `app/api/v1/settings/routes.py` | Access check + cloud admin |
| `_require_member(ws_id, roles)` | `app/api/v1/workspace_members/routes.py` | Cloud-only membership + optional role check |
| `_require_admin(ws_id)` | `app/api/v1/properties/routes.py` | Cloud-only admin/owner role |
| `transactional` | `app/services/decorators.py` | Wraps function in DB transaction (commit/rollback) |
| `feature_flag(flag)` | `app/services/decorators.py` | Returns 501 if `FEATURE_{flag}_ENABLED` is false |
| `@limiter.limit(...)` | Flask-Limiter | Rate limiting on each endpoint |

### 3.3 JWT Callbacks (`app/__init__.py`)

| Callback | Handler |
|----------|---------|
| `token_in_blocklist_loader` | Checks `SessionRepository.find_by_any_jti(jti)` and `revoked_at` |
| `user_lookup_loader` | Loads user via `UserRepository().get(identity)` |
| `expired_token_loader` | Returns 401 `token_expired` |
| `invalid_token_loader` | Returns 401 `invalid_token` |
| `unauthorized_loader` | Returns 401 `unauthorized` |
| `revoked_token_loader` | Returns 401 `token_revoked` |

### 3.4 Brute Force Protection (`app/services/auth_service.py`)

| Mechanism | Details |
|-----------|---------|
| Max attempts | 5 (`MAX_LOGIN_ATTEMPTS`) |
| Window | 300 seconds (`LOGIN_WINDOW_SECONDS`) |
| Storage | In-memory dict (module-level) |
| Lockout error | `AccountLockedError` (code: `account_locked`) |
| Attempt tracking | `_get_login_attempts()`, `_record_login_attempt()`, `_clear_login_attempts()` |

### 3.5 Password Policy

| Rule | Detail |
|------|--------|
| Min length | 8 characters |
| Max length | 128 characters |
| Uppercase | Required (`(?=.*[A-Z])`) |
| Lowercase | Required (`(?=.*[a-z])`) |
| Digit | Required (`(?=.*\d)`) |
| Special char | Required (`(?=.*[@$!%*?&])`) |
| Allowed chars | `[A-Za-z\d@$!%*?&]` |

### 3.6 OAuth 2.0 Auth Code Flow

Used by the desktop Electron app (`gnovium://`, `gnovium-dev://`, `gnovium-auth://` schemes):

1. `POST /auth/authorize` — Generate one-time code (valid 5 min)
2. `GET /auth/authorize?redirect_uri=...` — Web view redirect
3. `POST /auth/exchange` — Exchange code for JWT tokens
4. Code validation: single-use, expiry, redirect_uri match

### 3.7 Session Management

| Feature | Implementation |
|---------|---------------|
| Token storage | `sessions` table with `jti`, `refresh_jti`, `revoked_at` |
| Refresh | Issues new access token, revokes old refresh token |
| Logout | Revokes current session (`revoked_at = now()`) |
| Cleanup | `_cleanup_expired_sessions` (scheduled task) |

---

## 4. API Endpoints Reference

> **URL Prefix:** All endpoints under `/api/v1/...` (exceptions: `/health`, `/metrics` at root; `/admin/...` under `/api/v1/admin`; `/docs` under `/api/v1/docs`)  
> **Response Format:** `{"data": ...}` on success, `{"error": {"code": ..., "message": ...}}` on error  
> **Pagination:** `?page=1&per_page=30` (max `per_page`: 100)  
> **Response meta:** `{"page": int, "per_page": int, "total": int, "pages": int}`  
> **Table shorthand:** All table sections use shorthand rate limits: `STANDARD` = `RATE_LIMIT_STANDARD` (120/min), `STRICT` = `RATE_LIMIT_STRICT` (30/min), `DESTRUCTIVE` = `RATE_LIMIT_DESTRUCTIVE` (10/min), `LENIENT` = `RATE_LIMIT_LENIENT` (300/min), `AUTH_WRITE` = `RATE_LIMIT_AUTH_WRITE` (5/min), `FILE_UPLOAD` = `RATE_LIMIT_FILE_UPLOAD` (10/min), `FILE_DOWNLOAD` = `RATE_LIMIT_FILE_DOWNLOAD` (60/min), `PASSWORD_RESET` = `RATE_LIMIT_PASSWORD_RESET` (3/min)  
> **`secured`:** The `secured` decorator (from `app/services/security.py`) wraps `@jwt_required()` with error handling, used on all authenticated endpoints unless noted otherwise  
> **Mode column in section headers:** `@cloud_only` = endpoint returns 400 in local mode; `hybrid` = works in both modes  
> **Deployment Mode column:** `cloud_only` = endpoint returns 400 in local mode; `hybrid` = works in both local and cloud modes

---

### 4.1 Auth

**Blueprint:** `auth` | **Prefix:** `/auth` | **Mode:** `@cloud_only` | **Permission:** Varies per endpoint

| Method | Path | Decorators | Body/Params | Permission | Mode |
|--------|------|------------|-------------|------------|------|
| POST | `/auth/register` | `AUTH_WRITE`, `cloud_only`, `require_local_auth` | `RegisterSchema` | Public (local auth gate) | cloud_only |
| POST | `/auth/login` | `AUTH_WRITE`, `cloud_only`, `require_local_auth` | `LoginSchema` | Public (local auth gate) | cloud_only |
| GET | `/auth/check-email` | `STRICT`, `cloud_only` | Query: `email` | Public | cloud_only |
| POST | `/auth/google` | `AUTH_WRITE`, `cloud_only` | `GoogleLoginSchema` | Public | cloud_only |
| POST | `/auth/refresh` | `STANDARD`, `cloud_only` | Cookie: refresh token | Public (cookie) | cloud_only |
| POST | `/auth/logout` | `STANDARD`, `cloud_only` | — | Public (cookie) | cloud_only |
| GET | `/auth/me` | `STANDARD`, `cloud_only` | — | Manual `_verify_jwt()` | cloud_only |
| PATCH | `/auth/me` | `STRICT`, `cloud_only` | `UserUpdateSchema` | Manual `_verify_jwt()` | cloud_only |
| POST | `/auth/avatar` | `STRICT`, `cloud_only`, `secured` | Multipart: `file` | `@secured` | cloud_only |
| POST | `/auth/change-password` | `STRICT`, `secured`, `cloud_only` | `ChangePasswordSchema` | `@secured` | cloud_only |
| POST | `/auth/forgot-password` | `PASSWORD_RESET`, `cloud_only`, `require_local_auth` | `ForgotPasswordSchema` | Public | cloud_only |
| POST | `/auth/reset-password` | `PASSWORD_RESET`, `cloud_only`, `require_local_auth` | `ResetPasswordSchema` | Public | cloud_only |
| POST | `/auth/exchange-code` | `DESTRUCTIVE`, `cloud_only`, `secured` | — | `@secured` | cloud_only |
| POST | `/auth/authorize` | `AUTH_WRITE`, `cloud_only`, `secured`, `require_local_auth` | `AuthorizeSchema` | `@secured` + local auth gate | cloud_only |
| GET | `/auth/authorize` | `STANDARD`, `cloud_only` | Query: `redirect_uri`, `state?`, `workspace_id?` | Public | cloud_only |
| POST | `/auth/profile-changed` | `STANDARD`, `cloud_only`, `secured`, `require_local_auth` | `ProfileChangedSchema` | `@secured` + local auth gate | cloud_only |
| POST | `/auth/exchange` | `DESTRUCTIVE`, `cloud_only`, `require_local_auth` | `ExchangeCodeSchema` | Public (local auth gate) | cloud_only |

**Proxy Helper:** `proxy_to_cloud(method, path, json_data=None)` — validates against `ALLOWED_CLOUD_HOSTS`, forwards request. Used by: `refresh`, `logout`, `forgot_password`, `reset_password`, `exchange_code`.

---

### 4.2 Workspaces

**Blueprint:** `workspaces` | **Prefix:** `/workspaces` | **Permission:** Authenticated for list/create; `check_workspace_access` + role check for others

| Method | Path | Decorators | Body/Params | Permission | Notes |
|--------|------|------------|-------------|------------|-------|
| GET | `/workspaces/` | `STANDARD`, `secured` | `search?`, `page?`, `per_page?` | Authenticated | Lists by membership |
| POST | `/workspaces/` | `STRICT`, `secured` | `WorkspaceCreateSchema` | Authenticated | — |
| GET | `/workspaces/<ws>` | `STANDARD`, `secured` | — | `check_workspace_access` | — |
| PATCH | `/workspaces/<ws>` | `STRICT`, `secured` | `WorkspaceUpdateSchema` (partial) | `check_workspace_access` + admin/owner | — |
| DELETE | `/workspaces/<ws>` | `DESTRUCTIVE`, `secured` | — | `check_workspace_access` + admin/owner | — |
| POST | `/workspaces/<ws>/restore` | `STRICT`, `secured` | — | `check_workspace_access` + owner | — |
| GET | `/workspaces/<ws>/stats` | `STANDARD`, `secured` | — | `check_workspace_access` | Entity/block/relation/file counts |

---

### 4.3 Workspace Members

**Blueprint:** `workspace_members` | **Prefix:** `/workspaces` | **Mode:** `@cloud_only` | **Permission:** `_require_member` (varies by role)

| Method | Path | Decorators | Body/Params | Permission | Notes |
|--------|------|------------|-------------|------------|-------|
| GET | `/workspaces/<ws>/members` | `STANDARD`, `secured`, `cloud_only` | `search?`, `page?`, `per_page?` | `_require_member` | List members |
| GET | `/workspaces/<ws>/members/<user_id>` | `STANDARD`, `secured`, `cloud_only` | — | `_require_member` | Get member |
| POST | `/workspaces/<ws>/members/invite` | `STRICT`, `secured`, `cloud_only` | `WorkspaceMemberInviteSchema` | Owner/admin | Invite by email |
| PATCH | `/workspaces/<ws>/members/<user_id>` | `STRICT`, `secured`, `cloud_only` | `WorkspaceMemberUpdateSchema` | Owner only | Update role |
| DELETE | `/workspaces/<ws>/members/<user_id>` | `STRICT`, `secured`, `cloud_only` | — | Owner/admin | Remove member |

---

### 4.4 Entities

**Blueprint:** `entities` | **Prefix:** `/workspaces` | **Permission:** All endpoints use `check_workspace_access`

| Method | Path | Decorators | Body/Params | Permission | Notes |
|--------|------|------------|-------------|------------|-------|
| GET | `/workspaces/<ws>/entities/` | `STANDARD`, `secured` | `type`/`entity_type_id`, `search`, `tags`, `deleted`, `sort`, `order`, `page`, `per_page` | `check_workspace_access` | Paginated list |
| POST | `/workspaces/<ws>/entities/` | `STRICT`, `secured` | `EntityCreateSchema` | `check_workspace_access` | Creates + property values, parent relation, event, search doc |
| GET | `/workspaces/<ws>/entities/<entity_id>` | `STANDARD`, `secured` | — | `check_workspace_access` | — |
| PATCH | `/workspaces/<ws>/entities/<entity_id>` | `STRICT`, `secured` | `EntityUpdateSchema` (partial) | `check_workspace_access` | — |
| DELETE | `/workspaces/<ws>/entities/<entity_id>` | `STRICT`, `secured` | — | `check_workspace_access` | Soft-delete cascade: blocks, values, tags, files, comments, notifications, search, relations |
| DELETE | `/workspaces/<ws>/entities/<entity_id>/permanent` | `DESTRUCTIVE`, `secured` | — | `check_workspace_access` | Hard delete (must be soft-deleted first) |
| POST | `/workspaces/<ws>/entities/<entity_id>/restore` | `STRICT`, `secured` | — | `check_workspace_access` | Cascade-restore related records |
| POST | `/workspaces/<ws>/entities/<entity_id>/archive` | `STRICT`, `secured` | — | `check_workspace_access` | Toggle archive flag |
| POST | `/workspaces/<ws>/entities/<entity_id>/duplicate` | `STRICT`, `secured` | — | `check_workspace_access` | Deep copy with "Copy" suffix |
| GET | `/workspaces/<ws>/entities/<entity_id>/children` | `STANDARD`, `secured` | `page?`, `per_page?` | `check_workspace_access` | List children |
| POST | `/workspaces/<ws>/entities/<entity_id>/children` | `STRICT`, `secured` | `EntityCreateSchema` (with `parent_id`) | `check_workspace_access` | Create child |
| GET | `/workspaces/<ws>/entities/<entity_id>/versions` | `STANDARD`, `secured` | `page?`, `per_page?` | `check_workspace_access` | List entity versions |
| GET | `/workspaces/<ws>/entities/properties` | `STANDARD`, `secured` | `page?`, `per_page?` | `check_workspace_access` | Alias for `/properties/` list (no admin gate) |
| POST | `/workspaces/<ws>/entities/properties` | `STRICT`, `secured` | `PropertyCreateSchema` | `check_workspace_access` | Alias for `/properties/` create (no `_require_admin`) |
| POST | `/workspaces/<ws>/entities/bulk-delete` | `STRICT`, `secured` | `{entity_ids: [...]}` | `check_workspace_access` | Soft-delete multiple |
| POST | `/workspaces/<ws>/entities/bulk-archive` | `STRICT`, `secured` | `{entity_ids: [...]}` | `check_workspace_access` | Archive multiple |
| POST | `/workspaces/<ws>/entities/bulk-restore` | `STRICT`, `secured` | `{entity_ids: [...]}` | `check_workspace_access` | Restore multiple soft-deleted |
| POST | `/workspaces/<ws>/entities/bulk-tag` | `STRICT`, `secured` | `{entity_ids: [...], tag_id}` | `check_workspace_access` | Apply tag to multiple |
| POST | `/workspaces/<ws>/entities/bulk-move` | `STRICT`, `secured` | `{entity_ids: [...], target_workspace_id}` | `check_workspace_access` | Move to another workspace |

---

### 4.5 Entity Types

**Blueprint:** `entities` | **Prefix:** `/workspaces` | **Permission:** All endpoints use `check_workspace_access`

| Method | Path | Decorators | Body/Params | Notes |
|--------|------|------------|-------------|-------|
| POST | `/workspaces/<ws>/entities/types` | `STRICT`, `secured` | `EntityTypeCreateSchema` | Create |
| GET | `/workspaces/<ws>/entities/types` | `STANDARD`, `secured` | `page?`, `per_page?` | List |
| GET | `/workspaces/<ws>/entities/types/<type_id>` | `STANDARD`, `secured` | — | Get |
| PATCH | `/workspaces/<ws>/entities/types/<type_id>` | `STRICT`, `secured` | `EntityTypeUpdateSchema` (partial) | Update |
| DELETE | `/workspaces/<ws>/entities/types/<type_id>` | `STRICT`, `secured` | — | Delete |

---

### 4.6 Blocks

**Blueprint:** `blocks` | **Prefix:** `/workspaces` | **Permission:** All endpoints use `check_workspace_access` (via entity)

| Method | Path | Decorators | Body/Params | Notes |
|--------|------|------------|-------------|-------|
| GET | `/workspaces/<ws>/blocks/` | `STANDARD`, `secured` | Query: `entity_id` (required), `page?`, `per_page?` | List blocks |
| POST | `/workspaces/<ws>/blocks/` | `STRICT`, `secured` | `BlockCreateSchema` | Sanitizes content, auto-position, event, search |
| GET | `/workspaces/<ws>/blocks/<block_id>` | `STANDARD`, `secured` | — | Get block |
| PATCH | `/workspaces/<ws>/blocks/<block_id>` | `STRICT`, `secured` | `BlockUpdateSchema` (partial) | Circular ref check, versioning, event, search |
| POST | `/workspaces/<ws>/blocks/<block_id>/move` | `STRICT`, `secured` | `MoveBlockSchema` | Circular ref check, reindex old+new entity |
| DELETE | `/workspaces/<ws>/blocks/<block_id>` | `STRICT`, `secured` | — | Soft-delete, event, search |
| POST | `/workspaces/<ws>/blocks/reorder` | `STRICT`, `secured` | `{entity_id, blocks: [{id, position}]}` | Batch reorder |
| POST | `/workspaces/<ws>/blocks/<block_id>/restore` | `STRICT`, `secured` | — | Sets `is_deleted=False` |
| GET | `/workspaces/<ws>/blocks/entity/<entity_id>` | `STANDARD`, `secured` | — | 308 redirect to `/blocks/?entity_id=` |

**Block Types (21):** `text`, `heading`, `bulleted_list`, `numbered_list`, `to-do`, `toggle`, `code`, `quote`, `callout`, `divider`, `image`, `video`, `file`, `bookmark`, `equation`, `table_of_contents`, `column_list`, `column`, `breadcrumb`, `heading1`, `heading2`, `heading3`

---

### 4.7 Branches

**Blueprint:** `branches` | **Prefix:** `/workspaces` | **Permission:** All endpoints use `check_workspace_access`

| Method | Path | Decorators | Body/Params | Notes |
|--------|------|------------|-------------|-------|
| GET | `/workspaces/<ws>/branches` | `STANDARD`, `secured` | `page?`, `per_page?` | List branches |
| POST | `/workspaces/<ws>/branches` | `STRICT`, `secured` | `BranchCreateSchema` | Create branch |
| GET | `/workspaces/<ws>/branches/<branch_id>` | `STANDARD`, `secured` | — | Get branch |
| PATCH | `/workspaces/<ws>/branches/<branch_id>` | `STRICT`, `secured` | `BranchUpdateSchema` | Update |
| DELETE | `/workspaces/<ws>/branches/<branch_id>` | `DESTRUCTIVE`, `secured` | — | Delete |
| POST | `/workspaces/<ws>/branches/<branch_id>/restore` | `STRICT`, `secured` | — | Restore |
| POST | `/workspaces/<ws>/branches/<branch_id>/merge` | `DESTRUCTIVE`, `secured` | `{target_branch_id}` | Cloud-only (stub in local) |
| POST | `/workspaces/<ws>/branches/merge` | `DESTRUCTIVE`, `secured` | `MergeBranchSchema` | Merge by source+target IDs |
| GET | `/workspaces/<ws>/branches/merge-conflicts` | `STANDARD`, `secured` | `merge_id?`, `page?`, `per_page?` | Cloud-only |
| PATCH | `/workspaces/<ws>/branches/merge-conflicts/<conflict_id>/resolve` | `STRICT`, `secured` | `{resolution: "source"\|"target"\|"manual", merged_content?}` | Cloud-only |

---

### 4.8 Versions / Changesets / Snapshots

**Blueprint:** `versions` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

#### Changesets

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/versions/changesets` | `STANDARD`, `secured` | `branch_id?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/versions/changesets` | `STRICT`, `secured` | `ChangesetCreateSchema` |
| GET | `/workspaces/<ws>/versions/changesets/<cs_id>` | `STANDARD`, `secured` | — |
| DELETE | `/workspaces/<ws>/versions/changesets/<cs_id>` | `DESTRUCTIVE`, `secured` | — |

#### Snapshots

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/versions/snapshots` | `STANDARD`, `secured` | `branch_id?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/versions/snapshots` | `STRICT`, `secured` | `SnapshotCreateSchema` |
| GET | `/workspaces/<ws>/versions/snapshots/<snap_id>` | `STANDARD`, `secured` | — |
| DELETE | `/workspaces/<ws>/versions/snapshots/<snap_id>` | `DESTRUCTIVE`, `secured` | — |
| POST | `/workspaces/<ws>/versions/entities/<entity_id>/snapshot` | `STRICT`, `secured` | `EntitySnapshotSchema` |

#### Entity & Block Versions

| Method | Path | Decorators | Params |
|--------|------|------------|--------|
| GET | `/workspaces/<ws>/versions/entities/<entity_id>` | `STANDARD`, `secured` | `page?`, `per_page?` |
| GET | `/workspaces/<ws>/versions/blocks/<block_id>` | `STANDARD`, `secured` | `page?`, `per_page?` |
| GET | `/workspaces/<ws>/versions/compare` | `STANDARD`, `secured` | `left_version_id`, `right_version_id` |
| POST | `/workspaces/<ws>/versions/<version_id>/restore` | `DESTRUCTIVE`, `secured` | — |

---

### 4.9 Diffs

**Blueprint:** `diffs` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Params | Body |
|--------|------|------------|--------|------|
| GET | `/workspaces/<ws>/diffs/compare` | `STANDARD`, `secured` | `left_version_id`/`right_version_id` or `left_snapshot_id`/`right_snapshot_id` or `left_branch_id`/`right_branch_id` or `entity_id` | — |
| POST | `/workspaces/<ws>/diffs/blocks` | `STRICT`, `secured` | — | `left_block_id`+`right_block_id` or `left_version_id`+`right_version_id` |

**Schema:** `DiffQuerySchema` — validates version/snapshot mutual exclusivity

---

### 4.10 Relations

**Blueprint:** `relations` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/relations/` | `STANDARD`, `secured` | `entity_id?`, `target_id?`, `type?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/relations/` | `STRICT`, `secured` | `RelationCreateSchema` |
| GET | `/workspaces/<ws>/relations/<relation_id>` | `STANDARD`, `secured` | — |
| PATCH | `/workspaces/<ws>/relations/<relation_id>` | `STRICT`, `secured` | `RelationUpdateSchema` (partial) |
| DELETE | `/workspaces/<ws>/relations/<relation_id>` | `STRICT`, `secured` | — |
| POST | `/workspaces/<ws>/relations/<relation_id>/restore` | `STRICT`, `secured` | — |
| GET | `/workspaces/<ws>/relations/entity/<entity_id>` | `STANDARD`, `secured` | `page?`, `per_page?` |
| GET | `/workspaces/<ws>/relations/backlinks/<entity_id>` | `STANDARD`, `secured` | `page?`, `per_page?` |
| GET | `/workspaces/<ws>/relations/neighbors/<entity_id>` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/relations/path` | `STANDARD`, `secured` | `source_entity_id`, `target_entity_id` |
| POST | `/workspaces/<ws>/relations/batch` | `STRICT`, `secured` | Body: list of relation objects |

**Validation:** `no_self_relation` (source != target), `generated_by IN ('manual', 'ai')`

---

### 4.11 Tags

**Blueprint:** `tags` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/tags/` | `STANDARD`, `secured` | `page?`, `per_page?` |
| POST | `/workspaces/<ws>/tags/` | `STRICT`, `secured` | `TagCreateSchema` |
| GET | `/workspaces/<ws>/tags/<tag_id>` | `STANDARD`, `secured` | — |
| PATCH | `/workspaces/<ws>/tags/<tag_id>` | `STRICT`, `secured` | `TagUpdateSchema` (partial) |
| DELETE | `/workspaces/<ws>/tags/<tag_id>` | `STRICT`, `secured` | — |
| POST | `/workspaces/<ws>/tags/<tag_id>/restore` | `STRICT`, `secured` | — |
| POST | `/workspaces/<ws>/tags/<tag_id>/entities/<entity_id>` | `STRICT`, `secured` | — (tag_entity) |
| DELETE | `/workspaces/<ws>/tags/<tag_id>/entities/<entity_id>` | `STRICT`, `secured` | — (untag_entity) |

---

### 4.12 Properties

**Blueprint:** `properties` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access` + `_require_admin` (POST/PATCH/DELETE/restore)

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/properties/` | `STANDARD`, `secured` | `page?`, `per_page?` |
| POST | `/workspaces/<ws>/properties/` | `STRICT`, `secured` | `PropertyCreateSchema` — Admin only |
| GET | `/workspaces/<ws>/properties/<property_id>` | `STANDARD`, `secured` | — |
| PATCH | `/workspaces/<ws>/properties/<property_id>` | `STRICT`, `secured` | `PropertyUpdateSchema` (partial) — Admin only |
| DELETE | `/workspaces/<ws>/properties/<property_id>` | `STRICT`, `secured` | — Admin only |
| POST | `/workspaces/<ws>/properties/<property_id>/restore` | `STRICT`, `secured` | — Admin only |

**Property Types:** `text`, `number`, `date`, `select`, `multi_select`, `checkbox`, `url`, `email`, `phone`, `rich_text`, `boolean`, `entity_ref`

**Alias:** `POST + GET /workspaces/<ws>/entities/properties` also exist (same schemas, but POST lacks `_require_admin` check).

---

### 4.13 Files

**Blueprint:** `files` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Params/Body | Notes |
|--------|------|------------|-------------|-------|
| GET | `/workspaces/<ws>/files` | `STANDARD`, `secured` | `uploaded_by?`, `page?`, `per_page?` | List files |
| POST | `/workspaces/<ws>/files/upload` | `FILE_UPLOAD`, `secured` | Multipart `file` | Local upload with validation |
| POST | `/workspaces/<ws>/files` | `STRICT`, `secured` | `FileCreateSchema` | Create metadata only |
| GET | `/workspaces/<ws>/files/<file_id>` | `STANDARD`, `secured` | — | Get file metadata |
| GET | `/workspaces/<ws>/files/<file_id>/download` | `FILE_DOWNLOAD`, `secured` | — | Returns `{"presigned_url": "..."}` — S3 URL in cloud, `?direct=1` local URL in local mode |
| GET | `/workspaces/<ws>/files/<file_id>/thumbnail` | `STANDARD`, `secured` | — | Returns `{"presigned_url": "..."}` — same cloud/local pattern |
| GET | `/workspaces/<ws>/files/<file_id>/preview` | `STANDARD`, `secured` | — | Returns `{"presigned_url": "..."}` — same cloud/local pattern |
| GET | `/workspaces/<ws>/files/<file_id>/optimized` | `STANDARD`, `secured` | — | Returns `{"presigned_url": "..."}` — same cloud/local pattern |
| GET | `/workspaces/<ws>/files/<file_id>/content` | `STANDARD`, `secured` | — | Returns raw file text content (UTF-8) as JSON string |
| DELETE | `/workspaces/<ws>/files/<file_id>` | `STRICT`, `secured` | — | Soft-delete |
| GET | `/workspaces/<ws>/files/<file_id>/variants/<variant_type>` | `STANDARD`, `secured` | — | Get variant |
| GET | `/workspaces/<ws>/files/<file_id>/variants` | `STANDARD`, `secured` | — | List variants |
| POST | `/workspaces/<ws>/files/<file_id>/entities/<entity_id>` | `STRICT`, `secured` | `{block_id?}` | Link file to entity |
| DELETE | `/workspaces/<ws>/files/<file_id>/entities/<entity_id>` | `STRICT`, `secured` | — | Unlink file |
| POST | `/workspaces/<ws>/files/presign` | `STRICT`, `secured` | `PresignUploadSchema` | Cloud presigned URL |
| POST | `/workspaces/<ws>/files/presign-multipart` | `FILE_UPLOAD`, `secured` | `PresignMultipartSchema` | Cloud multipart start |
| POST | `/workspaces/<ws>/files/presign-multipart/complete` | `STRICT`, `secured` | `PresignMultipartCompleteSchema` | Cloud multipart complete |
| POST | `/workspaces/<ws>/files/<file_id>/confirm` | `STRICT`, `secured` | — | Confirm cloud upload |
| POST | `/workspaces/<ws>/files/quarantine/<file_id>/resolve` | `STRICT`, `secured` | `QuarantineResolveSchema` | Cloud quarantine |
| POST | `/workspaces/<ws>/files/cleanup-orphans` | `STRICT`, `secured` | — | Remove orphan files |
| POST | `/workspaces/<ws>/files/cleanup-quarantine` | `STRICT`, `secured` | — | Cloud cleanup |
| POST | `/workspaces/<ws>/files/cleanup-deleted` | `STRICT`, `secured` | — | Cloud cleanup |
| GET | `/workspaces/<ws>/files/storage-info` | `STANDARD`, `secured` | — | Storage usage stats |

**File Validation:**
- Extension checked against `ALLOWED_EXTENSIONS` (safe set — no executables)
- MIME type checked against `ALLOWED_MIMETYPES`
- Magic bytes validated against `MAGIC_BYTE_MAP`
- Malware scan via `_scan_file_for_malware()` (clamscan)
- Content hash deduplication (SHA-256)
- Storage quota check

**Variant Types:** `thumbnail` (≤256px), `preview` (≤1024px), `optimized`

**Download/Variant URL Pattern:**
- **Cloud mode:** Returns `{"presigned_url": "https://s3-bucket.s3.amazonaws.com/..."}` — the frontend uses `window.open(res.data.presigned_url)` to navigate to the S3 URL directly
- **Local mode:** Returns `{"presigned_url": ".../download?direct=1"}` — when the browser navigates there with `?direct=1`, the backend serves the local file via `send_from_directory`
- This applies to `/download`, `/thumbnail`, `/preview`, and `/optimized` endpoints
- The frontend `getDownloadUrl()` / `getThumbnailUrl()` / `getPreviewUrl()` / `getOptimizedUrl()` methods call `apiClient.get()` → expects `{ data: { presigned_url: string } }`

---

### 4.14 Search

**Blueprint:** `search` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Params |
|--------|------|------------|--------|
| GET | `/workspaces/<ws>/search` | `STANDARD`, `secured` | `q` (required), `entity_type_id?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/search/rebuild-index` | `STRICT`, `secured` | — |
| GET | `/workspaces/<ws>/search/history` | `STANDARD`, `secured` | `page?`, `per_page?` (stub — empty) |
| GET | `/workspaces/<ws>/search/suggest` | `STANDARD`, `secured` | `q` (required) |

**Search Architecture:**
- **Local mode:** SQLite FTS5 on `blocks_fts` + `search_documents_fts` virtual tables
- **Cloud mode:** PostgreSQL `tsvector` on `search_documents.search_vector` with GIN index
- **Rebuild:** Repopulates FTS tables (SQLite) or updates tsvector columns (PostgreSQL)
- **Deduplication:** Results grouped by entity_id

---

### 4.15 Graph

**Blueprint:** `graph` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Params/Body |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/graph/` | `STANDARD`, `secured` | `entity_id?`, `depth?`, `filter_type?`, `include_tags?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/graph/materialize` | `STRICT`, `secured` | — |
| POST | `/workspaces/<ws>/graph/query` | `STRICT`, `secured` | `{relation_types?}, {entity_type_ids?}, {limit?}` |
| POST | `/workspaces/<ws>/graph/cleanup` | `STRICT`, `secured` | `{keep?}` (default 10, max 100) |
| POST | `/workspaces/<ws>/graph/traverse` | `STRICT`, `secured` | `{center_node, depth? (max 5), relation_types?}` |
| POST | `/workspaces/<ws>/graph/paths` | `STRICT`, `secured` | `{source_id, target_id}` |
| GET | `/workspaces/<ws>/graph/search` | `STANDARD`, `secured` | `q`, `type?` |

**BFS Parameters:** `GRAPH_MAX_ITERATIONS = 10000`, `GRAPH_DEFAULT_DEPTH = 2`

---

### 4.16 Backups & Export

**Blueprint:** `backups` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params | Description |
|--------|------|------------|-------------|-------------|
| GET | `/workspaces/<ws>/backups` | `STANDARD`, `secured` | `page?`, `per_page?` | List backup files |
| POST | `/workspaces/<ws>/backups/export` | `STRICT`, `secured` | — | Export workspace JSON |
| POST | `/workspaces/<ws>/backups/create` | `DESTRUCTIVE`, `secured` | — | Create encrypted .gnv backup |
| POST | `/workspaces/<ws>/backups/<path:filename>/restore` | `DESTRUCTIVE`, `secured` | — | Restore from .gnv or .json |
| POST | `/workspaces/<ws>/backups/export-to-disk` | `STRICT`, `secured` | — | Write JSON to disk |
| POST | `/workspaces/<ws>/backups/import` | `DESTRUCTIVE`, `secured` | JSON body | Import workspace data |
| POST | `/workspaces/<ws>/backups/export-markdown` | `STRICT`, `secured` | — | Export as markdown files |
| POST | `/workspaces/<ws>/backups/export-zip` | `STRICT`, `secured` | — | Export as ZIP archive |
| POST | `/workspaces/<ws>/backups/export-html` | `STRICT`, `secured` | `{entity_id}` | Export entity as HTML |
| POST | `/workspaces/<ws>/backups/export-pdf` | `STRICT`, `secured` | `{entity_id, block_id?}` | Export as PDF |
| POST | `/workspaces/<ws>/backups/export-zip-encrypted` | `STRICT`, `secured` | — | Export encrypted .gnv |
| POST | `/workspaces/<ws>/backups/import-zip` | `DESTRUCTIVE`, `secured` | Multipart `file` (.gnv) | Import encrypted backup |
| GET | `/workspaces/<ws>/backups/download-zip/<path:filename>` | `STRICT`, `secured` | — | Download ZIP file |

**Export Formats:**
- **JSON:** Full workspace serialization (all tables)
- **Markdown:** Per-entity markdown files with YAML front-matter
- **HTML:** Standalone HTML page with inline CSS
- **PDF:** Via wkhtmltopdf/chromium/WeasyPrint fallback
- **ZIP:** Bundled markdown + assets
- **Encrypted .gnv:** AES encrypted ZIP with HMAC verification

---

### 4.17 Sync

**Blueprint:** `sync` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body | Description |
|--------|------|------------|------|-------------|
| GET | `/workspaces/<ws>/sync` | `STANDARD`, `secured` | `pending?`, `page?`, `per_page?` | List sync operations |
| POST | `/workspaces/<ws>/sync` | `STRICT`, `secured` | `SyncOperationCreateSchema` | Create sync operation |
| GET | `/workspaces/<ws>/sync/devices` | `STANDARD`, `secured` | — | List device IDs that have pushed operations |
| GET | `/workspaces/<ws>/sync/<op_id>` | `STANDARD`, `secured` | — | Get sync operation |
| POST | `/workspaces/<ws>/sync/<op_id>/ack` | `STRICT`, `secured` | — | Acknowledge (mark synced) |
| POST | `/workspaces/<ws>/sync/diff` | `STRICT`, `secured` | `{export_data}` | Diff local vs remote |
| POST | `/workspaces/<ws>/sync/apply-diff` | `STRICT`, `secured` | `{diff}` | Apply diff to local |
| POST | `/workspaces/<ws>/sync/sync-from-export` | `STRICT`, `secured` | `{export_data}` | Full import from export |
| POST | `/workspaces/<ws>/sync/push` | `STRICT`, `secured` | `{changes, device_id}` | Push changes to cloud |
| POST | `/workspaces/<ws>/sync/pull` | `STANDARD`, `secured` | — | Pull pending operations |
| POST | `/workspaces/<ws>/sync/full-sync` | `STRICT`, `secured` | `{export_data?}` | Bidirectional full sync |
| GET | `/workspaces/<ws>/sync/status` | `STANDARD`, `secured` | — | Sync status |
| GET | `/workspaces/<ws>/sync/changes` | `STANDARD`, `secured` | — | Local diff |
| POST | `/workspaces/<ws>/sync/conflicts/<conflict_id>/resolve` | `STRICT`, `secured` | `{resolution, merged_content}` | Resolve conflict |
| POST | `/workspaces/<ws>/sync/resolve-conflict` | `STRICT`, `secured` | `{conflict_id, resolution, merged_content}` | Alternative resolve |

**Conflict Detection:** Tombstone checks, staleness checks (client_clock vs updated_at), field-level conflict detection.

**Sync Fields:**
- `entity_types`: name, description, icon, color, config
- `tags`: name, color, description
- `properties`: name, type, description, required, options, metadata
- `entities`: name, entity_type_id, icon, cover_image, is_archived, metadata
- `relations`: source_id, target_id, type, properties
- `blocks`: entity_id, type, content, parent_block_id, position, branch_id, metadata
- `comments`: entity_id, content, block_id, parent_id

---

### 4.18 Activity

**Blueprint:** `activity` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Params |
|--------|------|------------|--------|
| GET | `/workspaces/<ws>/activity` | `STANDARD`, `secured` | `entity_id?`, `action?`, `user_id?`, `start_date?`, `end_date?`, `page?`, `per_page?` |
| GET | `/workspaces/<ws>/activity/events` | `STANDARD`, `secured` | `entity_id?`, `changeset_id?`, `page?`, `per_page?` |

---

### 4.19 Comments

**Blueprint:** `comments` | **Prefix:** `/workspaces` | **Mode:** `hybrid` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/comments/` | `STANDARD`, `secured` | `entity_id?`, `parent_id?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/comments/` | `STRICT`, `secured` | `CommentCreateSchema` |
| GET | `/workspaces/<ws>/comments/<comment_id>` | `STANDARD`, `secured` | — |
| PATCH | `/workspaces/<ws>/comments/<comment_id>` | `STRICT`, `secured` | `CommentUpdateSchema` |
| DELETE | `/workspaces/<ws>/comments/<comment_id>` | `STRICT`, `secured` | — |
| POST | `/workspaces/<ws>/comments/<comment_id>/restore` | `STRICT`, `secured` | — |

---

### 4.20 Notifications

**Blueprint:** `notifications` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/notifications` | `STANDARD`, `secured` | `unread_only?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/notifications` | `STRICT`, `secured` | `NotificationCreateSchema` |
| GET | `/workspaces/<ws>/notifications/<notification_id>` | `STANDARD`, `secured` | — |
| POST | `/workspaces/<ws>/notifications/<notification_id>/read` | `STRICT`, `secured` | — |
| PATCH | `/workspaces/<ws>/notifications/<notification_id>` | `STRICT`, `secured` | — (delegates to mark_read) |
| POST | `/workspaces/<ws>/notifications/<notification_id>/dismiss` | `STRICT`, `secured` | — |
| POST | `/workspaces/<ws>/notifications/read-all` | `STRICT`, `secured` | — |
| GET | `/workspaces/<ws>/notifications/unread-count` | `LENIENT`, `secured` | — |

**Notification Types:** `mention`, `comment`, `update`, `entity_update`, `invite`, `relation_created`, `backup_complete`, `sync_conflict`, `system`, `share`, `version_created`, `export_complete`, `import_complete`, `governance_report_ready`, `system_alert`

---

### 4.21 Settings

**Blueprint:** `settings` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access` (GET no admin check); PUT/reset use `_require_settings_access`, PATCH uses inline admin check

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/settings/<category>` | `STANDARD`, `secured` | — |
| PUT | `/workspaces/<ws>/settings/<category>` | `STRICT`, `secured` | JSON body (merge) |
| PATCH | `/workspaces/<ws>/settings` | `STRICT`, `secured` | JSON body (multi-category) |
| GET | `/workspaces/<ws>/settings` | `STANDARD`, `secured` | `flat?`, `page?`, `per_page?` |
| POST | `/workspaces/<ws>/settings/reset` | `STRICT`, `secured` | `{category}` or `"all"` |

**Valid Categories (11):** `general`, `editor`, `appearance`, `ai`, `governance`, `performance`, `backups`, `privacy`, `sync`, `keyboard_shortcuts`, `advanced`

**Settings Security:** Uses marshmallow schema with `unknown = RAISE` to reject unknown fields. Admin role required in cloud mode.

---

### 4.22 Config Reference

**Blueprint:** `config` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

Returns reference enum lists used across the frontend (property types, member roles, etc.). These are static server-side constants, not workspace-specific.

| Method | Path | Decorators | Response |
|--------|------|------------|----------|
| GET | `/workspaces/<ws>/config` | `STANDARD`, `secured` | Full config object |

**Response fields:**
- `property_types` (12): `text`, `number`, `date`, `select`, `multi_select`, `checkbox`, `url`, `email`, `phone`, `rich_text`, `boolean`, `entity_ref`
- `member_roles` (4): `owner`, `admin`, `editor`, `viewer`
- `relation_types` (8): `refers_to`, `depends_on`, `part_of`, `related_to`, `implements`, `extends`, `blocks`, `follows`
- `block_types` (22): all valid `BlockType` union values
- `sync_intervals` (5): `[{value, label}]` for sync interval options
- `conflict_strategies` (4): `[{value, label, description}]` for merge conflict resolution
- `export_formats` (6): `[{id, label, description, scope}]` where scope is `workspace` or `entity`
- `search_modes` (4): `[{id, label, description}]` for search mode options
- `notification_prefs` (7): `[{key, label, description}]` for notification preference items
- `governance_categories` (3): `[{id, label}]` for governance report categories
- `governance_thresholds`: `{excellent: 90, needs_attention: 70}`
- `sync_frequencies` (4): `[{value, label}]` for sync frequency options

---

### 4.23 Dashboard

**Blueprint:** `dashboard` | **Prefix:** `/workspaces` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Description |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/dashboard/overview` | `LENIENT`, `secured` | Entity/block/relation counts + recent entities |
| GET | `/workspaces/<ws>/dashboard/storage` | `STANDARD`, `secured` | File count, total size, entity count |

**Cache:** TTLCache with 60-second TTL, 100 max entries

---

### 4.23 AI

**Blueprint:** `ai` | **Prefix:** `/workspaces` | **All 501 Not Implemented** — most endpoints return 501 regardless of mode (bulk route returns 200)

| Method | Path | Decorators |
|--------|------|------------|
| POST | `/workspaces/<ws>/ai/query` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/suggest-relations` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/summarize` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/chat` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/complete` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/embed` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/semantic-search` | `STRICT`, `secured` |
| POST | `/workspaces/<ws>/ai/bulk` | `STRICT`, `secured` |

---

### 4.24 Admin

**Blueprint:** `admin` | **Prefix:** `/admin` | **Mode:** `hybrid` | **Permission:** `@require_admin`

| Method | Path | Decorators | Body |
|--------|------|------------|------|
| GET | `/admin/users` | `STANDARD`, `secured`, `require_admin` | `search?`, `page?`, `per_page?` |
| GET | `/admin/users/<user_id>` | `STANDARD`, `secured`, `require_admin` | — |
| PATCH | `/admin/users/<user_id>` | `STRICT`, `secured`, `require_admin` | `UserUpdateSchema` |
| DELETE | `/admin/users/<user_id>` | `DESTRUCTIVE`, `secured`, `require_admin` | — |
| GET | `/admin/system/status` | `STANDARD`, `secured`, `require_admin` | 501 |
| GET | `/admin/system/logs` | `STANDARD`, `secured`, `require_admin` | 501 |
| POST | `/admin/system/cleanup` | `DESTRUCTIVE`, `secured`, `require_admin` | 501 |

---

### 4.25 Jobs

**Blueprint:** `jobs` | **Prefix:** `/workspaces` | **Mode:** `@cloud_only` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/jobs` | `STANDARD`, `secured`, `cloud_only` | `status?`, `type?`, `page?`, `per_page?` |
| GET | `/workspaces/<ws>/jobs/<job_id>` | `STANDARD`, `secured`, `cloud_only` | — |
| POST | `/workspaces/<ws>/jobs` | `STRICT`, `secured`, `cloud_only` | `JobCreateSchema` |
| POST | `/workspaces/<ws>/jobs/<job_id>/running` | `STRICT`, `secured`, `cloud_only` | — |
| POST | `/workspaces/<ws>/jobs/<job_id>/completed` | `STRICT`, `secured`, `cloud_only` | `{result}` |
| POST | `/workspaces/<ws>/jobs/<job_id>/fail` | `STRICT`, `secured`, `cloud_only` | `{error}` |
| POST | `/workspaces/<ws>/jobs/<job_id>/cancel` | `STRICT`, `secured`, `cloud_only` | — |

**Job Statuses:** `pending`, `running`, `completed`, `failed`, `cancelled`, `dead_letter`
**Job Priorities:** `critical`, `high`, `medium`, `low`

---

### 4.26 Governance

**Blueprint:** `governance` | **Prefix:** `/workspaces` | **Mode:** `hybrid` | **Permission:** `check_workspace_access`

| Method | Path | Decorators | Body/Params |
|--------|------|------------|-------------|
| GET | `/workspaces/<ws>/governance/reports` | `STANDARD`, `secured` | `page?`, `per_page?` |
| GET | `/workspaces/<ws>/governance/health` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/duplicates` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/orphans` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/stale` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/health-score` | `STANDARD`, `secured` | — | Return historical health-score records for trend display |
| POST | `/workspaces/<ws>/governance/health-score` | `STRICT`, `secured` | — | Recalculate and persist health score |
| POST | `/workspaces/<ws>/governance/reports` | `STRICT`, `secured` | `GovernanceReportCreateSchema` |
| GET | `/workspaces/<ws>/governance/reports/<report_id>` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/broken-links` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/naming-issues` | `STANDARD`, `secured` | — |
| GET | `/workspaces/<ws>/governance/size-warnings` | `STANDARD`, `secured` | — |

**Health Score:** Calculates duplicates, orphans, stale entities (90 days). Score = 100 − penalties. Persists to `governance_reports` with type `health_check`.

**`GET /workspaces/<ws>/governance/health` response:**
```json
{
  "data": {
    "entity_count": 0,
    "block_count": 0,
    "relation_count": 0,
    "duplicate_count": 0,
    "orphan_count": 0,
    "stale_count": 0,
    "health_score": 100
  }
}
```

---

### 4.27 Docs

**Blueprint:** `docs` | **Prefix:** `/docs` | **Permission:** Public

| Method | Path | Decorators | Description |
|--------|------|------------|-------------|
| GET | `/docs/` | `STANDARD` (public) | Returns full API documentation JSON with 222 endpoints |

---

### 4.28 Root Endpoints

**Defined in:** `app/__init__.py`

| Method | Path | Decorators | Permission | Description |
|--------|------|------------|------------|-------------|
| GET | `/metrics` | `STANDARD` | Public | Prometheus metrics (text/plain) |
| GET | `/health` | `STANDARD` | Public | Health check (DB, Redis, pool status) |

---

## 5. Request/Response Format

### Success Responses

```json
// Single item
{"data": {...}}

// List with pagination
{"data": [...], "meta": {"page": 1, "per_page": 30, "total": 100, "pages": 4}}

// No content
{"data": null}
```

### Error Responses

```json
{
  "error": {
    "code": "validation_error",
    "message": "Validation failed",
    "details": {"email": ["Not a valid email address"]},
    "request_id": "abc-123-def"
  }
}
```

### Pagination

- Query params: `?page=1&per_page=30`
- Default `per_page`: 30 (`DEFAULT_PAGE_SIZE`)
- Max `per_page`: 100 (`MAX_PAGE_SIZE`)
- Response meta: `{"page": int, "per_page": int, "total": int, "pages": int}`

### Input Sanitization

All JSON body strings are recursively sanitized via `sanitize_request_input` (before_request handler):
- Control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F, 0x7F) stripped
- HTML content: dangerous tags/elements/event handlers stripped
- URLs: only http/https allowed, dangerous protocols rejected
- Filenames: path traversal rejection, special chars replaced

---

## 6. Error Codes

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
| 405 | `method_not_allowed` | HTTP method not allowed |
| 404 | `not_found` | Resource not found |
| 409 | `conflict` | Resource already exists |
| 413 | `payload_too_large` | Request body exceeds limit (100MB max) |
| 415 | `unsupported_media_type` | Unsupported content type |
| 422 | `validation_error` | Schema validation failed |
| 429 | `rate_limit_exceeded` | Rate limit hit |
| 500 | `internal_error` | Unexpected server error |
| 501 | `not_implemented` | Feature not yet implemented |
| 502 | `bad_gateway` | Upstream service error |
| 503 | `service_degraded` | Dependency unavailable |

### Custom Exception Classes (`app/core/errors.py`)

| Exception | HTTP | Code |
|-----------|------|------|
| `ApiError` | 400+ | configurable |
| `NotFoundError` | 404 | `not_found` |
| `ForbiddenError` | 403 | `forbidden` |
| `ConflictError` | 409 | `conflict` |
| `UnauthorizedError` | 401 | `unauthorized` |
| `ValidationError` | 422 | `validation_error` |
| `RateLimitError` | 429 | `rate_limit_exceeded` |
| `UnsupportedMediaTypeError` | 415 | `unsupported_media_type` |
| `NotImplementedError` | 501 | `not_implemented` |
| `BadGatewayError` | 502 | `bad_gateway` |
| `PayloadTooLargeError` | 413 | `payload_too_large` |
| `InternalError` | 500 | `internal_error` |
| `ServiceDegradedError` | 503 | `service_degraded` |
| `AccountLockedError` | 401 | `account_locked` |
| `WrongTokenError` | 401 | `wrong_token` |

---

## 7. Rate Limiting

Defined in `app/core/constants.py`:

| Constant | Value | Endpoints |
|----------|-------|-----------|
| `RATE_LIMIT_STRICT` | `30/minute` | Writes, mutations |
| `RATE_LIMIT_STANDARD` | `120/minute` | General reads |
| `RATE_LIMIT_LENIENT` | `300/minute` | Dashboard, unread count |
| `RATE_LIMIT_DESTRUCTIVE` | `10/minute` | Deletes, permanent deletes |
| `RATE_LIMIT_AUTH_WRITE` | `5/minute` | Register, login |
| `RATE_LIMIT_FILE_UPLOAD` | `10/minute` | File uploads |
| `RATE_LIMIT_PASSWORD_RESET` | `3/minute` | Forgot/reset password |
| `RATE_LIMIT_FILE_DOWNLOAD` | `60/minute` | File downloads |
| `RATELIMIT_DEFAULT` (local) | `1200/minute` | Flask-Limiter default ceiling (local mode) |
| `RATELIMIT_DEFAULT` (cloud) | `600/minute` | Flask-Limiter default ceiling (cloud mode) |

**Storage:** Local mode uses `memory://`, cloud mode uses Redis.

---

## 8. Data Models — Domain (PostgreSQL)

All 36 domain models with their PostgreSQL table names:

| # | Model | Table | Key Features |
|---|-------|-------|-------------|
| 1 | `User` | `users` | email (unique), google_id (unique), password_hash |
| 2 | `Session` | `sessions` | refresh_jti (unique), revoked_at, expires_at |
| 3 | `AuthCode` | `auth_codes` | code (unique), consumed_at, expires_at |
| 4 | `Workspace` | `workspaces` | owner_id (FK), deployment_mode CHECK, sync_enabled |
| 5 | `WorkspaceMember` | `workspace_members` | role CHECK (owner/admin/editor/viewer) |
| 6 | `EntityType` | `entity_types` | workspace_id, name, slug, config JSON |
| 7 | `Entity` | `entities` | entity_type_id (FK), parent_id, version, block_count |
| 8 | `Block` | `blocks` | entity_id, branch_id, position, type, content JSON |
| 9 | `EntityProperty` | `entity_properties` | type CHECK (12 types), workspace+name+type unique |
| 10 | `EntityPropertyValue` | `entity_property_values` | entity_id+property_id unique, value JSON |
| 11 | `Relation` | `relations` | no_self_relation CHECK, generated_by CHECK |
| 12 | `Tag` | `tags` | workspace+name unique, entity_count |
| 13 | `EntityTag` | `entity_tags` | entity_id+tag_id unique |
| 14 | `Branch` | `branches` | workspace_id, parent_branch_id, version |
| 15 | `Snapshot` | `snapshots` | branch_id (FK), metadata JSON |
| 16 | `Changeset` | `changesets` | branch_id, snapshot_id |
| 17 | `EntityVersion` | `entity_versions` | snapshot JSON, content_hash |
| 18 | `BlockVersion` | `block_versions` | block_id (FK), snapshot JSON |
| 19 | `EntityBranchHead` | `entity_branch_heads` | branch+entity unique, current_version_id |
| 20 | `BranchMerge` | `branch_merges` | no_self_merge CHECK, status CHECK |
| 21 | `MergeConflict` | `merge_conflicts` | conflict_type, details JSON |
| 22 | `EntityEvent` | `entity_events` | event_type, payload JSON |
| 23 | `File` | `file_records` | state, object_key, content_hash, object_lock |
| 24 | `EntityFile` | `entity_files` | entity_id+file_id unique, block_id |
| 25 | `FileVariant` | `file_variants` | file_id+variant_type unique, metrics |
| 26 | `Invite` | `invites` | token (unique), status CHECK, expires_at |
| 27 | `Comment` | `comments` | entity_id, block_id, parent_id, content |
| 28 | `CommentReaction` | `comment_reactions` | comment+user+reaction unique |
| 29 | `Notification` | `notifications` | type CHECK (15 types), is_read |
| 30 | `Embedding` | `embeddings` | model, VECTOR(1024), content_hash |
| 31 | `SearchDocument` | `search_documents` | TSVECTOR search_vector, content_hash |
| 32 | `SyncOperation` | `sync_operations` | operation_type, payload JSON, client_clock |
| 33 | `Job` | `jobs` | status/priority CHECK, idempotency_key |
| 34 | `ActivityLog` | `activity_entries` | action, details JSON, BRIN index on created_at |
| 35 | `GovernanceReport` | `governance_reports` | type CHECK (`access_audit`,`change_log`,`storage_summary`,`activity_summary`,`compliance`,`health_check`), status CHECK (`pending`,`running`,`completed`,`failed`), data JSON |
| 36 | `GraphMaterialization` | `graph_materializations` | graph_snapshot JSON, version_hash |

### Common Mixins

```python
class UUIDPrimaryKeyMixin:     # id = UUID, gen_random_uuid() default
class TimestampMixin:          # created_at, updated_at (auto-updated)
class CreatedOnlyMixin:        # created_at only
class SoftDeleteMixin:         # is_deleted, deleted_at, deleted_by (FK users)
```

---

## 9. Data Models — Local (SQLite)

**29 local tables + 9 cloud-only stubs** (29 unique models with real tables)

| # | Model | Table | Differences from Domain |
|---|-------|-------|----------------------|
| 1 | `User` | `users` | No google_id, password_hash |
| 2 | `Session` | `sessions` | No deleted_by FK |
| 3 | `AuthCode` | `auth_codes` | Same structure |
| 4 | `Workspace` | `workspaces` | No cloud_workspace_id, JSON CHECK via json_valid() |
| 5 | `EntityType` | `entity_types` | Same structure |
| 6 | `Entity` | `entities` | No created_by FK |
| 7 | `Block` | `blocks` | Composite PK (id, branch_id, created_at), lft/rgt for nested sets |
| 8 | `Property` | `properties` | Table named `properties` (not `entity_properties`) |
| 9 | `EntityPropertyValue` | `entity_property_values` | Same structure |
| 10 | `Relation` | `relations` | No created_by FK |
| 11 | `Tag` | `tags` | Same structure |
| 12 | `EntityTag` | `entity_tags` | Same structure |
| 13 | `Branch` | `branches` | version has no server_default in local |
| 14 | `Snapshot` | `snapshots` | Same structure |
| 15 | `Changeset` | `changesets` | Same structure |
| 16 | `EntityVersion` | `entity_versions` | Same structure |
| 17 | `BlockVersion` | `block_versions` | Same structure |
| 18 | `EntityBranchHead` | `entity_branch_heads` | Uses block_id/block_created_at instead of version_id |
| 19 | `EntityEvent` | `entity_events` | Same structure |
| 20 | `File` | `file_records` | storage_provider defaults to 'local', no object_lock |
| 21 | `EntityFile` | `entity_files` | Same structure |
| 22 | `Embedding` | `embeddings` | embedding stored as TEXT (not VECTOR) |
| 23 | `SearchDocument` | `search_documents` | search_vector stored as TEXT (not TSVECTOR) |
| 24 | `SyncOperation` | `sync_operations` | No entity_id as FK |
| 25 | `GraphMaterialization` | `graph_materializations` | Same structure |
| 26 | `Notification` | `notifications` | Type CHECK limited to 6 types (not 15) |
| 27 | `ActivityLog` | `activity_entries` | Extra block_id column |
| 28 | `AuthCode` | `auth_codes` | Same structure |
| 29 | `WorkspaceMember` | `workspace_members` | Cloud-only stub in local mode |

**Cloud-only stubs in local mode:** `BranchMerge`, `Comment`, `CommentReaction`, `FileVariant`, `GovernanceReport`, `Invite`, `Job`, `MergeConflict`, `WorkspaceMember`

---

## 10. SQL Schemas

### SQLite (`SQLITE_SCHEMA.sql` — 828 lines)

**29 Tables** (29 local + 9 cloud-only stubs) + extended features:

```
┌─────────────────────────────────────────────────────────┐
│ Users & Auth                                             │
│   users ──┐                                             │
│   sessions│ (FK user_id)                                 │
│   auth_codes (FK user_id)                                │
├─────────────────────────────────────────────────────────┤
│ Workspaces                                               │
│   workspaces (FK owner_id→users, deployment_mode CHECK)  │
├─────────────────────────────────────────────────────────┤
│ Entity System                                            │
│   entity_types (FK workspace_id)                         │
│   entities (FK entity_type_id, parent_id)                │
│   properties (FK workspace_id, entity_type_id)           │
│   entity_property_values (FK entity_id, property_id)     │
├─────────────────────────────────────────────────────────┤
│ Block System                                             │
│   blocks (Composite PK: id+branch_id+created_at)         │
│     lft/rgt nested set columns                           │
│     FTS5 virtual tables: blocks_fts, search_documents_fts│
│   block_versions (FK block_id, changeset_id)             │
├─────────────────────────────────────────────────────────┤
│ Knowledge Graph                                          │
│   relations (no_self_relation CHECK, workspace_id)       │
│   tags, entity_tags                                      │
├─────────────────────────────────────────────────────────┤
│ Versioning & Branching                                    │
│   branches, snapshots, changesets                        │
│   entity_versions, entity_branch_heads                   │
├─────────────────────────────────────────────────────────┤
│ Files                                                    │
│   file_records, entity_files                             │
├─────────────────────────────────────────────────────────┤
│ AI / Search                                              │
│   embeddings (TEXT column for vector)                    │
│   search_documents                                       │
├─────────────────────────────────────────────────────────┤
│ Sync & Events                                            │
│   sync_operations, entity_events, activity_entries       │
├─────────────────────────────────────────────────────────┤
│ Notifications & Graph                                    │
│   notifications, graph_materializations                  │
└─────────────────────────────────────────────────────────┘
```

**FTS5 Virtual Tables:**
- `blocks_fts(entity_id, type, content, text)` — content-synced with `blocks` table
- `search_documents_fts(entity_id, title, content)` — content-synced with `search_documents`

**Triggers (7 total):**
- `blocks_ai` — INSERT → index block text
- `blocks_ad` — DELETE → remove from FTS
- `blocks_au` — UPDATE (is_deleted=1) → remove from FTS
- `blocks_au_content` — UPDATE (is_deleted=0) → re-index block text
- `search_documents_ai`, `search_documents_ad`, `search_documents_au` — same pattern for search docs

**Seed Data:**
- User: `local@gnovium.local` (id: `local`)
- Workspace: "My Workspace" (id: `00000000-0000-0000-0000-000000000001`)
- Entity Type: "Page" (id: `00000000-0000-0000-0000-000000000002`)
- Branch: "main" (id: `00000000-0000-0000-0000-000000000003`)

### PostgreSQL (`POSTGRESQL_SCHEMA.sql` — 1182 lines)

**36 Tables** (29 core + 7 cloud-only) + extended features:

**Extensions:** `uuid-ossp`, `vector` (pgvector), `pg_trgm`, `pgcrypto`

**Key differences from SQLite:**
- UUID primary keys with `gen_random_uuid()`
- `VECTOR(1024)` column on `embeddings` table
- `TSVECTOR` column on `search_documents` with GIN-indexable `search_vector`
- `deleted_by` FK columns on all tables
- Full `updated_at` triggers on 18 tables
- `update_search_vector()` trigger on `search_documents` for auto-population
- Additional indexes: `idx_entities_created_by`, `idx_entity_versions_branch_id/snapshot_id/created_by`, etc.
- BRIN index on `activity_entries.created_at`
- `file_records` has S3-specific columns: `object_lock_mode`, `object_lock_retain_until`, `legal_hold_status`, `storage_class`
- Cloud-only tables: `workspace_members`, `branch_merges`, `merge_conflicts`, `file_variants`, `invites`, `comments`, `comment_reactions`, `governance_reports`, `jobs`

---

## 11. Pydantic/Marshmallow Schemas

All schemas use `marshmallow` with `unknown = EXCLUDE` to reject extra fields.

### Auth Schemas (`app/schemas/auth.py`)

| Schema | Fields |
|--------|--------|
| `RegisterSchema` | email (Email, required), password (String, 8-128, regex), name (Str?) |
| `LoginSchema` | email (Email), password (Str) |
| `AuthorizeSchema` | redirect_uri (Str, required), state (Str?), workspace_id (UUID?) |
| `ExchangeCodeSchema` | code (Str, min 10), redirect_uri (Str?) |
| `ChangePasswordSchema` | old_password (Str), new_password (Str, min 8) |
| `ForgotPasswordSchema` | email (Email) |
| `ResetPasswordSchema` | token (Str), new_password (Str, min 8) |
| `GoogleLoginSchema` | credential (Str) |
| `ProfileChangedSchema` | since (Str) |

### Domain Schemas (`app/schemas/domain.py`)

**Input Schemas (Create/Update):**

| Schema | Purpose | Fields |
|--------|---------|--------|
| `WorkspaceCreateSchema` | Create workspace | name, description?, settings?, icon?, color? |
| `WorkspaceUpdateSchema` | Update workspace | name?, description?, settings?, icon?, color? |
| `EntityTypeCreateSchema` | Create entity type | workspace_id, name, slug?, icon?, description?, color?, config? |
| `EntityTypeUpdateSchema` | Update entity type | name?, slug?, icon?, description?, color?, config? |
| `PropertyCreateSchema` | Create property | workspace_id, entity_type_id?, name, type (OneOf 12), description?, required?, options?, config?, default_value? |
| `PropertyUpdateSchema` | Update property | name?, type?, entity_type_id?, description?, required?, options?, config?, default_value? |
| `EntityCreateSchema` | Create entity | workspace_id, entity_type_id, parent_id?, name?, icon?, cover_image?, sort_order?, summary?, properties?, is_favorite?, color?; validates property keys exist |
| `EntityUpdateSchema` | Update entity | name?, icon?, cover_image?, parent_id?, sort_order?, summary?, properties?, is_favorite?, color?, is_archived? |
| `BlockCreateSchema` | Create block | entity_id, branch_id, parent_block_id?, type, position, indent?, content?, properties?; validates content by block type |
| `BlockUpdateSchema` | Update block | parent_block_id?, type?, position?, indent?, content?, properties? |
| `MoveBlockSchema` | Move block | parent_block_id?, position, indent?, entity_id?, properties? |
| `RelationCreateSchema` | Create relation | workspace_id, source_id, target_id, type, generated_by?, verified?, confidence?, ai_model?, properties?, label? |
| `RelationUpdateSchema` | Update relation | type?, generated_by?, verified?, confidence?, ai_model?, properties?, label? |
| `BranchCreateSchema` | Create branch | workspace_id, parent_branch_id?, name, description?, is_default?, is_locked? |
| `BranchUpdateSchema` | Update branch | name?, description?, version?, is_locked? |
| `MergeBranchSchema` | Merge branches | source_branch_id, target_branch_id |
| `SnapshotCreateSchema` | Create snapshot | branch_id, name?, description?, metadata? |
| `ChangesetCreateSchema` | Create changeset | branch_id, snapshot_id?, message? |
| `EntitySnapshotSchema` | Entity snapshot | changeset_id? |
| `SearchQuerySchema` | Search | workspace_id, q, mode? (keyword/full_text/hybrid/semantic), entity_type_id?, relation_type?, tag_ids?, date_from?, date_to?, limit? |
| `FileCreateSchema` | Create file | workspace_id?, file_name, mime_type?, file_size?, object_key, content_hash?, has_extracted_text?, has_metadata? |
| `PresignUploadSchema` | Presign upload | workspace_id?, file_name, content_type, file_size, content_hash? |
| `PresignMultipartSchema` | Multipart start | workspace_id?, file_name, content_type, file_size, content_hash? |
| `PresignMultipartCompleteSchema` | Complete multipart | workspace_id?, file_id, upload_id, parts (list) |
| `QuarantineResolveSchema` | Quarantine | approve (Bool) |
| `NotificationCreateSchema` | Create notification | workspace_id?, user_id, entity_id?, type (OneOf 15), title, body?, data? |
| `JobCreateSchema` | Create job | workspace_id?, type, payload, priority?, idempotency_key? |
| `CommentCreateSchema` | Create comment | workspace_id?, entity_id?, block_id?, parent_id?, content, display_name, avatar_url?, resolved? |
| `CommentUpdateSchema` | Update comment | content, display_name?, avatar_url?, resolved? |
| `SyncOperationCreateSchema` | Create sync op | workspace_id, operation_type, entity_type?, entity_id?, payload, device_id?, client_clock?, synced? |
| `TagCreateSchema` | Create tag | workspace_id, name, color? |
| `TagUpdateSchema` | Update tag | name, color? |
| `WorkspaceMemberInviteSchema` | Invite member | email, role, display_name?, avatar_url? |
| `WorkspaceMemberUpdateSchema` | Update member | email, role, display_name?, avatar_url? |
| `GovernanceReportCreateSchema` | Create report | workspace_id, type, title, status?, data?, params?, created_by? |
| `DiffQuerySchema` | Diff query | workspace_id, left_version_id?/right_version_id?, left_snapshot_id?/right_snapshot_id?, left_branch_id?/right_branch_id?, entity_type_id?, limit? |
| `UserUpdateSchema` | Update user | name?, avatar_url?, profile_image_url? |

**Output Schemas (Serialization):**

| Schema | Fields |
|--------|--------|
| `UserSchema` | id, email, name, avatar_url (transformed: `v1/` keys → `/auth/avatar/{id}`), profile_image_url, timestamps, soft-delete fields |
| `SessionSchema` | id, user_id, jti, refresh_jti, user_agent, ip_address, revoked_at, expires_at |
| `AuthCodeSchema` | id, code, user_id, redirect_uri, expires_at, consumed_at |
| `WorkspaceSchema` | id, name, description, settings, owner_id, deployment_mode, sync_enabled, cloud_workspace_id |
| `InviteSchema` | id, workspace_id, email, role, invited_by, token, status, message, expires_at |
| `EntitySchema` | id, workspace_id, entity_type_id, name, icon, cover_image, parent_id, sort_order, summary, properties, is_favorite, color, is_archived, archived_at, version, block_count |
| `EntityPropertyValueSchema` | id, entity_id, property_id, value |
| `BlockSchema` | id, entity_id, parent_block_id, type, content, position, branch_id, content_hash, indent, properties, version |
| `CommentSchema` | id, workspace_id, entity_id, block_id, parent_id, user_id, content, display_name, avatar_url, resolved |
| `CommentReactionSchema` | id, comment_id, user_id, reaction |
| `RelationSchema` | id, workspace_id, source_id, target_id, type, generated_by, verified, confidence, ai_model, label |
| `EntityFileSchema` | id, entity_id, file_id, block_id |
| `FileVariantSchema` | id, file_id, variant_type, object_key, mime_type, width, height, file_size, algorithm, quality |
| `FileSchema` | id, workspace_id, file_name, mime_type, file_size, content_hash, state, storage_provider, object_key, extracted_text, metadata_json, object_lock fields |
| `EntityVersionSchema` | id, entity_id, branch_id, changeset_id, snapshot_id, version, message, snapshot, content_hash |
| `BlockVersionSchema` | id, block_id, changeset_id, snapshot, content_hash |
| `MergeConflictSchema` | id, merge_id, workspace_id, entity_id, conflict_type, details, resolved, resolution |
| `EntityBranchHeadSchema` | id, branch_id, entity_id, current_version_id, base_version_id |
| `EntityEventSchema` | id, workspace_id, entity_id, user_id, changeset_id, event_type, payload |
| `EmbeddingSchema` | id, workspace_id, entity_id, block_id, model, embedding, content_hash |
| `SearchDocumentSchema` | id, workspace_id, entity_id, block_id, title, content, content_hash, search_vector |
| `GraphMaterializationSchema` | id, workspace_id, graph_snapshot, version_hash, generated_at |
| `NotificationSchema` | id, workspace_id, user_id, entity_id, type, title, body, data, is_read |
| `TagSchema` | id, workspace_id, name, color, entity_count |
| `EntityTagSchema` | id, entity_id, tag_id |
| `EntityTypeSchema` | id, workspace_id, name, slug, icon, description, color, config |
| `PropertySchema` | id, workspace_id, entity_type_id, name, type, description, required, options, config, default_value |
| `BranchSchema` | id, workspace_id, parent_branch_id, name, description, is_default, is_locked, version |
| `SnapshotSchema` | id, branch_id, name, description, metadata |
| `ChangesetSchema` | id, branch_id, snapshot_id, message |
| `BranchMergeSchema` | id, source_branch_id, target_branch_id, merged_at, status, metadata |
| `JobSchema` | id, workspace_id, type, status, progress, message, priority, payload, result, error, retry_count, max_retries |
| `SyncOperationSchema` | id, workspace_id, operation_type, entity_type, entity_id, payload, device_id, client_clock, synced |
| `GovernanceReportSchema` | id, workspace_id, type, title, status, data, params |
| `WorkspaceMemberSchema` | id, workspace_id, user_id, role, email, display_name, avatar_url, joined_at |
| `ActivityEntrySchema` | id, workspace_id, entity_id, block_id, user_id, display_name, action, resource_type, resource_id, details |

---

## 12. Service Layer

### AuthService (`app/services/auth_service.py` — 429 lines)

| Method | Signature | Description |
|--------|-----------|-------------|
| `register(data)` | `dict → dict` | Email/password registration with validation, hashing, JWT creation |
| `login(data, ip_address?)` | `dict → dict` | Credential validation, brute-force check, session creation |
| `google_login(credential)` | `str → dict` | Google OAuth verification, auto-account creation |
| `refresh()` | `→ dict` | Rotate access token, revoke old refresh token |
| `logout()` | `→ dict` | Revoke current session |
| `get_profile(user_id)` | `str → dict` | User profile via UserSchema dump |
| `update_profile(user_id, data)` | `str, dict → dict` | Update name/avatar/profile image |
| `change_password(user_id, data)` | `str, dict → dict` | Password change (cloud only) |
| `generate_auth_code(user_id, redirect_uri?)` | `→ str` | One-time auth code for desktop exchange |
| `authorize(user_id, redirect_uri, state?, workspace_id?)` | `→ dict` | OAuth-like authorization with scheme validation |
| `exchange_code(code, redirect_uri?)` | `→ dict` | Code-for-tokens exchange |
| `get_profile_changed_since(user_id, since)` | `str, str → dict` | Profile change detection for desktop sync |

### BackupService (`app/services/backup_service.py` — 298 lines)

| Method | Description |
|--------|-------------|
| `create_backup(workspace_id)` | Create encrypted .gnv ZIP backup |
| `list_backups(workspace_id?)` | List .gnv and .json backup files on disk |
| `restore_backup(workspace_id, backup_path, expected_source?)` | Restore from .gnv (ZipService) or .json |
| `serialize(records)` | Serialize SQLAlchemy records to dicts |
| `import_workspace(workspace_id, data)` | Full workspace import with dedup and ID remapping |

### BlockService (`app/services/block_service.py` — 243 lines)

| Method | Description |
|--------|-------------|
| `list_by_entity(entity_id)` | List non-deleted blocks for entity, ordered by position |
| `create(data, user_id)` | Create block with sanitization, auto-position, event, search |
| `update(block_id, data, user_id)` | Update with circular ref check, versioning, event, search |
| `move(block_id, data, new_entity_id?, user_id?)` | Move with ref validation, search reindex for old+new entity |
| `reorder(entity_id, block_order)` | Batch reorder blocks |
| `delete(block_id, user_id?)` | Soft-delete, event, search update |
| `restore(block_id, user_id?)` | Restore soft-deleted block |

### CommentService (`app/services/comment_service.py` — 148 lines)

| Method | Description |
|--------|-------------|
| `create(data, user_id)` | Create comment with content validation, sanitization, dedup |
| `list_by_entity(entity_id, page, per_page)` | List non-deleted comments, ordered by created_at asc |
| `update(comment_id, data, user_id)` | Update with ownership validation |
| `delete(comment_id, user_id)` | Soft-delete with ownership validation |
| `restore(comment_id)` | Restore soft-deleted comment |

### DashboardService (`app/services/dashboard_service.py` — 136 lines)

| Method | Description |
|--------|-------------|
| `overview(workspace_id)` | Cached overview: counts of entities, blocks, relations, comments, recent items |
| `storage(workspace_id)` | Storage stats: file count, total size |

### EntityService (`app/services/entity_service.py` — 567 lines)

| Method | Description |
|--------|-------------|
| `create_type(data)` | Create entity type with duplicate check |
| `create_property(data)` | Create property with duplicate check |
| `create(data, user_id)` | Create entity with properties, parent relation, event, search |
| `update(entity_id, data, user_id)` | Update entity fields and properties |
| `soft_delete(entity_id, user_id?)` | Cascade soft-delete: blocks, values, tags, files, comments, notifications, search, relations |
| `restore(entity_id, user_id?)` | Cascade restore related records |
| `get_children(entity_id, page, per_page)` | Get children via "parent" relation |
| `archive(entity_id, archived, user_id?)` | Toggle archive flag |
| `duplicate(entity_id, user_id)` | Deep copy with "Copy" suffix |
| `permanent_delete(entity_id, user_id?)` | Hard delete (must be soft-deleted first) |
| `list_by_workspace(workspace_id, page, per_page, ...)` | List with type/archive filtering |
| `get_with_blocks(entity_id)` | Entity with nested blocks |
| `_upsert_properties(entity_id, values)` | Batch upsert property values |

### ExportService (`app/services/export_service.py` — 537 lines)

| Method | Description |
|--------|-------------|
| `export_workspace(workspace_id)` | Full workspace JSON serialization |
| `export_to_disk(workspace_id, output_dir?)` | Write workspace JSON to file |
| `export_markdown(workspace_id)` | Per-entity markdown with YAML front-matter |
| `export_zip(workspace_id)` | Markdown + assets bundled in ZIP |
| `export_secure_zip(workspace_id)` | Encrypted .gnv archive |
| `import_secure_zip(zip_path, workspace_id, expected_source?)` | Import encrypted backup |
| `export_html(workspace_id, entity_id, block_id?)` | Standalone HTML with inline CSS |
| `export_pdf(workspace_id, entity_id, block_id?)` | PDF via wkhtmltopdf/chromium/WeasyPrint |

### FileService (`app/services/file_service.py` — 1195 lines)

| Method | Description |
|--------|-------------|
| `upload(file_obj, workspace_id, user_id)` | Local upload: validate, scan, dedup, store, generate variants, extract metadata |
| `create_metadata(data, user_id)` | Create file record without storage |
| `download_file(file_record, expires_in)` | Presigned download URL (S3 in cloud, local path in local) |
| `get_file_content(file_record)` | Read and return raw text content (UTF-8) from storage |
| `delete_file(file_record, deleted_by?)` | Soft-delete |
| `link_entity(entity_id, file_id, block_id?)` | Create EntityFile link |
| `unlink_entity(entity_id, file_id)` | Soft-delete EntityFile link |
| `get_storage_info(workspace_id?)` | Storage usage stats |
| `presign_upload(workspace_id, file_name, content_type, file_size, user_id, content_hash?)` | S3 presigned URL |
| `presign_multipart_upload(...)` | S3 multipart start |
| `complete_multipart_upload(file_id, upload_id, parts, ...)` | S3 multipart complete |
| `confirm_upload(file_id, ...)` | Finalize single-part upload |
| `resolve_quarantine(file_id, approve, resolved_by?)` | Approve/reject quarantined file |
| `cleanup_orphans(workspace_id?)` | Remove DB + storage records without entity links |
| `cleanup_expired_pending()` | Remove stale PENDING records |

### GraphService (`app/services/graph_service.py` — 354 lines)

| Method | Description |
|--------|-------------|
| `materialize(workspace_id, force?)` | Generate graph snapshot (incremental or full) |
| `query_graph(workspace_id, relation_types?, entity_type_ids?, limit)` | Filtered node/edge query |
| `traverse_graph(workspace_id, center_node_id, depth, relation_types?)` | BFS traversal |
| `get_related_entities(entity_id, relation_type?, direction?, page, per_page)` | Directional relationship query |
| `find_shortest_path(workspace_id, source, target, max_iterations)` | BFS shortest path |
| `search(workspace_id, query, relation_type?)` | Search graph entities |

### RelationService (`app/services/relation_service.py` — 192 lines)

| Method | Description |
|--------|-------------|
| `create(data, user_id)` | Create with validation: type, self-relation, entity existence, duplicates |
| `list_by_workspace(workspace_id, page, per_page, type?)` | List with type filter |
| `outgoing(entity_id, page, per_page)` | Outgoing relations |
| `backlinks(entity_id, page, per_page)` | Incoming relations |
| `update(relation_id, data)` | Update fields |
| `delete(relation_id, user_id?)` | Soft-delete |
| `restore(relation_id)` | Restore |
| `bulk_create(data_list, user_id)` | Batch create with allow_duplicate flag |

### SearchService (`app/services/search_service.py` — 239 lines)

| Method | Description |
|--------|-------------|
| `search(workspace_id, query, entity_type_id?, page, per_page)` | FTS5 (local) or tsvector (cloud) full-text search |
| `rebuild_index(workspace_id)` | Rebuild search index (re-populate FTS or tsvector) |
| `update_entity_search_document(entity_id)` | Create/update search document from entity blocks |

### SyncService (`app/services/sync_service.py` — 1012 lines)

| Method | Description |
|--------|-------------|
| `ingest(data, user_id)` | Incoming sync operation recording with conflict detection |
| `mark_synced(operation_id)` | Mark operation as synced |
| `sync_from_export(workspace_id, export_data)` | Differential import from cloud export |
| `diff_workspaces(local_ws_id, remote_export)` | Compare local vs remote, return missing items |
| `apply_diff(workspace_id, diff)` | Apply diff to local workspace |
| `push(workspace_id, changes, device_id)` | Push local changes to cloud with conflict detection |
| `pull(workspace_id)` | Pull pending sync operations |
| `full_sync(workspace_id, remote_export?)` | Bidirectional full sync |
| `status(workspace_id)` | Sync status: pending ops, entity/block counts |
| `diff(workspace_id)` | Local diff between data and pending operations |

### TagService (`app/services/tag_service.py` — 176 lines)

| Method | Description |
|--------|-------------|
| `list_by_workspace(workspace_id, page, per_page)` | List tags |
| `get_entity_tags(entity_id)` | Get tags for entity via EntityTag join |
| `create(data)` | Create with duplicate check |
| `update(tag_id, data)` | Update fields |
| `delete(tag_id, user_id?)` | Soft-delete |
| `restore(tag_id)` | Restore |
| `tag_entity(entity_id, tag_id)` | Associate tag with entity |
| `untag_entity(entity_id, tag_id)` | Remove association |

### VersioningService (`app/services/versioning_service.py` — 609 lines)

| Method | Description |
|--------|-------------|
| `get_version(version_id)` | Get entity version |
| `list_versions(entity_id, page, per_page)` | List versions, newest first |
| `create_changeset(data, user_id)` | Create changeset |
| `create_snapshot(data, user_id)` | Create branch snapshot with version pointers |
| `snapshot_entity(entity_id, changeset_id?)` | Create entity version, update branch head |
| `merge(data, user_id)` | Branch merge with conflict detection (field-level) |
| `resolve_conflict(conflict_id, resolution, merged_content?, user_id?)` | Resolve merge conflict |
| `compare_versions(left_id, right_id)` | Semantic version diff |
| `compare_branches(source_id, target_id)` | Branch comparison |
| `compare_snapshots(left_id, right_id)` | Snapshot comparison |

### ZipService (`app/services/zip_service.py`)

| Method | Description |
|--------|-------------|
| `create_encrypted_zip(data, workspace_id)` | Create AES encrypted .gnv with HMAC |
| `extract_encrypted_zip(zip_path, expected_source?)` | Decrypt and validate .gnv |
| `encrypt_bytes(data, key)` | AES-GCM encryption |
| `decrypt_bytes(data, key)` | AES-GCM decryption |
| `compute_hmac(data)` | HMAC-SHA256 signature |

### StorageProvider (`app/services/storage_provider.py` — 530 lines)

**Abstract Base:** `StorageProvider` with abstract methods: `store`, `retrieve`, `delete`, `exists`, `size`, `presign_upload`, `presign_download`, `get_provider_name`; concrete mixin methods: `generate_object_key`, `generate_variant_key`, `has_variant`, `store_variant`, `retrieve_variant`, `delete_variant`, `delete_all_variants`

**LocalProvider:**
- Storage root: configurable directory
- Path traversal protection via `_validate_path()`
- Variant management: `store_variant`, `retrieve_variant`, `has_variant`, `delete_variant`, `delete_all_variants`
- Orphan cleanup: `cleanup_orphans()` — removes disk files without DB records
- Stats: `get_storage_stats()` — per-tier count/bytes

**S3Provider:**
- boto3 S3 client with lazy initialization
- Server-side encryption (AES256)
- Presigned URLs for upload/download
- Multipart upload support
- Variant management: `has_variant`, `store_variant`, `retrieve_variant`, `delete_variant`, `delete_all_variants` (uses `generate_derived_key` for S3 key layout)
- Object Lock (GOVERNANCE mode)
- Lifecycle rules: temp cleanup, quarantine, deleted objects, glacier transition
- Circuit breaker protection on `store()`
- Bucket versioning

### Other Services

| Service | File | Key Methods |
|---------|------|-------------|
| `ActivityService` | `activity_service.py` | create, list_by_workspace, list_by_entity, get_by_id |
| `JobService` | `job_service.py` | create, list, get_by_id, mark_running, mark_completed, mark_failed, cancel |
| `NotificationService` | `notification_service.py` | create, get_by_id, list_by_user, mark_read, mark_all_read, dismiss, get_unread_count |
| `GovernanceService` | `governance_service.py` | health, duplicates, orphans, stale, create_report, list_runs, get_run |
| `EmbeddingService` | `embedding_service.py` | generate_embeddings |

| `WorkspaceService` | `workspace_service.py` | CRUD for workspaces |
| `WorkspaceMemberService` | `workspace_member_service.py` | CRUD for workspace members |
| `Security` | `security.py` | `current_user_id()` helper, `secured` decorator |

### Processing Pipeline (`app/services/processing/`)

| Module | Key Contents |
|--------|-------------|
| `pipeline.py` | `ProcessingPipeline` class, `process_local_upload()` |
| `job_runner.py` | `JobRunner` class, `process_next_job()` |

### Events (`app/events/service.py`)

| Method | Description |
|--------|-------------|
| `EventService.create()` | Create entity event record |
| `EventService.list_by_entity()` | List events for entity |
| `EventService.list_by_workspace()` | List events for workspace |

### AI Service (`app/ai/`)

| Module | Description |
|--------|-------------|
| `agents.py` | AI agent definitions |
| `context_builder.py` | Build context from workspace data |
| `embedding_service.py` | Vector embedding generation |
| `inference.py` | AI inference engine |
| `memory.py` | Conversation memory management |
| `prompt_builder.py` | Prompt construction |
| `retriever.py` | Context retrieval |
| `safety.py` | Content safety checks |
| `service.py` | AI service orchestration |
| `tool_runtime.py` | Tool execution runtime |

---

## 13. Repository Layer

All repositories extend `BaseCRUDRepository` from `app/repositories/base.py`:

| Method | Description |
|--------|-------------|
| `get(id)` | Get by primary key |
| `list(filters, page, per_page, sort, order)` | Paginated list |
| `create(data)` | Create record |
| `update(id, data)` | Update record |
| `delete(id, soft=True)` | Delete (soft by default) |
| `query()` | Return base query |
| `paginate(query, page, per_page)` | Paginate query |
| `count(query)` | Count results |

**Repository files:**

| Repository | File | Model |
|-----------|------|-------|
| `UserRepository` | `domain.py` | User |
| `SessionRepository` | `domain.py` | Session |
| `AuthCodeRepository` | `domain.py` | AuthCode |
| `WorkspaceRepository` | `domain.py` | Workspace |
| `WorkspaceMemberRepository` | `domain.py` | WorkspaceMember |
| `EntityRepository` | `domain.py` | Entity |
| `EntityTypeRepository` | `domain.py` | EntityType |
| `BlockRepository` | `domain.py` | Block |
| `BlockVersionRepository` | `domain.py` | BlockVersion |
| `EntityVersionRepository` | `domain.py` | EntityVersion |
| `EntityPropertyValueRepository` | `domain.py` | EntityPropertyValue |
| `PropertyRepository` | `domain.py` | EntityProperty |
| `RelationRepository` | `domain.py` | Relation |
| `TagRepository` | `domain.py` | Tag |
| `EntityTagRepository` | `domain.py` | EntityTag |
| `EntityFileRepository` | `domain.py` | EntityFile |
| `FileRepository` | `domain.py` | FileRecord |
| `FileVariantRepository` | `domain.py` | FileVariant |
| `BranchRepository` | `domain.py` | Branch |
| `SnapshotRepository` | `domain.py` | Snapshot |
| `ChangesetRepository` | `domain.py` | Changeset |
| `EntityBranchHeadRepository` | `domain.py` | EntityBranchHead |
| `BranchMergeRepository` | `domain.py` | BranchMerge |
| `MergeConflictRepository` | `domain.py` | MergeConflict |
| `EntityEventRepository` | `domain.py` | EntityEvent |
| `NotificationRepository` | `domain.py` | Notification |
| `SearchDocumentRepository` | `domain.py` | SearchDocument |
| `EmbeddingRepository` | `domain.py` | Embedding |
| `GraphMaterializationRepository` | `domain.py` | GraphMaterialization |
| `ActivityLogRepository` | `domain.py` | ActivityLog |
| `SyncOperationRepository` | `domain.py` | SyncOperation |
| `JobRepository` | `domain.py` | Job |
| `InviteRepository` | `domain.py` | Invite |
| `CommentRepository` | `domain.py` | Comment |
| `GovernanceReportRepository` | `domain.py` | GovernanceReport |

**Mixins** (`app/repositories/mixins.py`): Soft-delete filtering, workspace scoping, user ownership checks

---

## 14. Configuration Reference

### Config Classes Hierarchy

```
Config (base)
├── LocalConfig (local mode defaults)
├── CloudConfig (cloud mode defaults)
└── TestingConfig (test mode, extends LocalConfig)
    └── CloudTestingConfig (extends CloudConfig)
```

### Base Config (`Config`)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GNOVIUM_MODE` | str | `"local"` | Deployment mode |
| `SECRET_KEY` | str | `""` | Flask secret key |
| `JWT_SECRET_KEY` | str | `""` | JWT signing key |
| `JWT_ACCESS_TOKEN_EXPIRES` | timedelta | 30 min | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRES` | timedelta | 30 days | Refresh token lifetime |
| `SQLALCHEMY_DATABASE_URI` | str | computed | Database URL |
| `CORS_ORIGINS` | list | `localhost:3000` | Allowed CORS origins |
| `ALLOWED_HOSTS` | list | `127.0.0.1,localhost` | Allowed hosts |
| `ALLOWED_CLOUD_HOSTS` | list | `""` | Allowed cloud proxy hosts |
| `MAX_CONTENT_LENGTH` | int | 100MB | Request body size limit |
| `GOOGLE_CLIENT_ID` | str | `""` | Google OAuth client ID |
| `CLOUD_API_URL` | str | `""` | Cloud API base URL |
| `WEB_APP_URL` | str | `https://app.gnovium.com` | Web app URL |
| `LOCAL_AUTH_ENABLED` | bool | `False` | Local auth toggle |
| `LOCAL_STORAGE_QUOTA` | int | 1GB | Local storage quota |
| `MAX_FILE_SIZE` | int | 100MB | Max upload file size |
| `ZIP_ENCRYPTION_KEY` | str | `""` | AES encryption key for .gnv |
| `ZIP_HMAC_KEY` | str | `""` | HMAC key for .gnv |
| `CLAMAV_ENABLED` | bool | `False` | ClamAV malware scanning |
| `IMAGE_PROCESSING_ENABLED` | bool | `True` | Image variant generation |
| `DOCUMENT_EXTRACTION_ENABLED` | bool | `True` | PDF/text extraction |
| `INLINE_FILE_PROCESSING` | bool | `True` | Inline processing toggle |
| `ORPHAN_CLEANUP_ENABLED` | bool | `True` | Orphan file cleanup |
| `TEMP_EXPIRATION_DAYS` | int | 7 | Temp file retention |
| `QUARANTINE_EXPIRATION_DAYS` | int | 30 | Quarantine retention |
| `BACKUP_RETENTION_DAYS` | int | 30 | Backup retention |
| `DB_POOL_SIZE` | int | 5 | Connection pool size |
| `DB_MAX_OVERFLOW` | int | 10 | Max pool overflow |
| `DB_POOL_TIMEOUT` | int | 30 | Pool timeout |
| `DB_POOL_RECYCLE` | int | 280 | Connection recycle |
| `AUTH_CODE_EXPIRY_MINUTES` | int | 5 | Auth code lifetime |
| `RATELIMIT_DEFAULT` | str | `"1200 per minute"` | Default rate limit |
| `CACHE_TYPE` | str | `"SimpleCache"` | Cache backend |
| `CACHE_DEFAULT_TIMEOUT` | int | 300 | Cache TTL |
| `AWS_REGION` | str | `us-east-1` | AWS region |
| `S3_BUCKET` | str | `""` | S3 bucket name |

### LocalConfig Overrides

| Variable | Local Default |
|----------|---------------|
| `GNOVIUM_MODE` | `"local"` |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///local.db` |
| `CORS_ORIGINS` | `http://localhost:3000` |
| `LOCAL_AUTH_ENABLED` | `True` |
| `SECRET_KEY` | `"gnovium-local-dev-secret-key-change-in-production!!"` |
| `JWT_SECRET_KEY` | `"gnovium-local-dev-key-change-in-production!!"` |
| `RATELIMIT_DEFAULT` | `"1200 per minute"` |
| `RATELIMIT_STORAGE_URI` | `memory://` |

### CloudConfig Overrides

| Variable | Cloud Default |
|----------|---------------|
| `GNOVIUM_MODE` | `"cloud"` |
| `CORS_ORIGINS` | `https://gnovium.com,https://www.gnovium.com,https://app.gnovium.com,https://api.gnovium.com` |
| `ALLOWED_HOSTS` | `gnovium.com,www.gnovium.com,app.gnovium.com,api.gnovium.com` |
| `RATELIMIT_DEFAULT` | `"600 per minute"` |
| `RATELIMIT_STORAGE_URI` | Redis URL |
| `PREFERRED_URL_SCHEME` | `https` |
| `SESSION_COOKIE_SECURE` | `True` |
| `CACHE_TYPE` | `RedisCache` |

### Environment Files

| File | Purpose |
|------|---------|
| `.env` | Base config loaded first |
| `.env.local` | Local mode overrides |
| `.env.cloud` | Cloud mode overrides (production CORS, WEB_APP_URL) |
| `.env.cloud.dev` | Cloud dev overrides |
| `.env.production` | Production overrides |
| `.env.example` | Reference template |

### Database URL Resolution

- PostgreSQL `postgres://` → auto-rewritten to `postgresql://`
- Neon.tech hosts → auto-rewritten to `postgresql+psycopg` with `sslmode=require`
- SQLite default path: `data/local.db`

---

## 15. Middleware & Security

### Request Context Middleware (`app/middleware/request_context.py`)

- Generates unique `request_id` (uuid4) per request
- Records request timing via `MetricsCollector`
- Adds security headers to response (CSP, HSTS, XSS)
- Tracks active connections

### Security Middleware (`app/middleware/security.py`)

| Header | Value | Description |
|--------|-------|-------------|
| `Content-Security-Policy` | `default-src 'self'` | CSP protection |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS |
| `X-XSS-Protection` | `1; mode=block` | XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer control |

### Input Validation & Sanitization

- **Global:** `before_request` handler strips control characters from all JSON body strings
- **Endpoint-level:** Marshmallow schemas with `unknown = EXCLUDE`
- **Settings:** `_SettingsUpdateSchema` with `unknown = RAISE`
- **HTML:** Stripped of dangerous tags: `script`, `iframe`, `object`, `embed`, `form`, `style`, `link`, `meta`, `base`, `applet`, `frame`, `frameset`, `ilayer`, `layer`, `bgsound`, `audio`, `video`, `canvas`, `svg`
- **Event handlers:** All `on*` attributes removed
- **Protocols:** Only `http://` and `https://` allowed; `javascript:`, `data:`, `vbscript:`, `file:`, etc. rejected
- **Filename:** Path traversal detection via `..` sequences; special chars replaced with `_`
- **Password:** Regex validates: uppercase, lowercase, digit, special char, 8-128 length

### Circuit Breaker (`app/core/circuit_breaker.py`)

- States: `CLOSED` → `OPEN` → `HALF_OPEN` → `CLOSED`
- Configurable: `failure_threshold` (default 5), `recovery_timeout` (default 60s)
- Thread-safe with `threading.Lock()`
- Decorator: `@circuit_breaker(failure_threshold=5, recovery_timeout=60)`
- Used for S3 operations to prevent cascading failures

### Security Logging (`app/core/security_logger.py`)

| Event | Level | Logged By |
|-------|-------|-----------|
| Authentication failure | WARNING | `SecurityLogger.log_auth_failure()` |
| Rate limit hit | INFO | `SecurityLogger.log_rate_limit_hit()` |
| CSRF failure | WARNING | `SecurityLogger.log_csrf_failure()` |
| Suspicious request | ERROR | `SecurityLogger.log_suspicious_request()` |
| Privilege escalation | CRITICAL | `SecurityLogger.log_privilege_escalation()` |

### Logging Configuration (`app/core/logging.py`)

- **Framework:** structlog
- **Format:** JSON (default) or console via `LOG_FORMAT`
- **Level:** Configurable via `LOG_LEVEL` (default INFO)
- **Processor chain:** merge_contextvars → add_log_level → TimeStamper(iso) → redact_sensitive → JSONRenderer
- **Sensitive data redaction:** Keys/values matching `password|secret|token|jwt|authorization|api_key|api_secret|access_key|private_key` are replaced with `***REDACTED***`

---

## 16. Monitoring & Metrics

### MetricsCollector (`app/monitoring.py`)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `gnovium_requests_total` | Counter | method, path, status | Request count |
| `gnovium_request_duration_seconds` | Histogram | le (buckets) | Request duration |
| `gnovium_errors_total` | Counter | type | Error count |
| `gnovium_active_connections` | Gauge | — | Active connections |
| `gnovium_uptime_seconds` | Gauge | — | Application uptime |

**Histogram buckets (s):** `0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10`

**Duration percentiles:** P50, P95, P99, min, max, avg

**DB Pool Status:** size, checked_in, checked_out, overflow

### Metrics Endpoint

**`GET /metrics`** — Prometheus text format at `/metrics`

### Health Endpoint

**`GET /health`** — Returns:
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

## 17. File Storage Architecture

### Providers

| Provider | Mode | Storage Backend | Key Features |
|----------|------|----------------|--------------|
| `LocalProvider` | Local | Filesystem | Path traversal protection, variant generation, orphan cleanup |
| `S3Provider` | Cloud | AWS S3 | Presigned URLs, multipart upload, variant management, object lock, lifecycle rules, versioning |

### Object Key Structure

```
v1/objects/{variant}/{prefix1}/{prefix2}/{content_hash}{ext}
v1/quarantine/{reason}/{content_hash}
```

- `{variant}`: `original`, `thumbnail`, `preview`, `optimized`
- `{prefix1}/{prefix2}`: First 2 chars of hash for sharding
- `{content_hash}`: SHA-256 hex digest

### File States

| State | Description |
|-------|-------------|
| `PENDING` | Upload in progress |
| `READY` | Upload complete, file available |
| `QUARANTINED` | Flagged by malware scan |
| `DELETED` | Soft-deleted |

### File Validation Pipeline

1. Extension check (`ALLOWED_EXTENSIONS`)
2. MIME type check (`ALLOWED_MIMETYPES`)
3. Magic byte validation (`_validate_magic_bytes`)
4. Malware scan (`_scan_file_for_malware()` → clamscan)
5. Content hash dedup (SHA-256)
6. Storage quota check (`_check_quota()`)
7. Post-upload: image variants (WebP), PDF text extraction, metadata extraction

### Image Processing

- **Input threshold:** `IMAGE_PROCESSING_THRESHOLD = 10MB`
- **Variants:** thumbnail (max 256px), preview (max 1024px), optimized
- **Format:** WebP
- **Library:** PIL (Pillow)

---

## 18. Sync Mechanism

### Architecture

```
┌──────────────────────┐       ┌──────────────────────┐
│    Local App         │       │    Cloud API         │
│  (SQLite + Electron) │       │  (PostgreSQL)        │
│                      │       │                      │
│  ┌────────────┐      │       │ ┌──────────────┐     │
│  │SyncService │◄─────┼───────┼►│SyncService   │     │
│  │ push/pull  │      │ HTTP  │ │ ingest/ack   │     │
│  │ full_sync  │      │       │ │ sync_from_   │     │
│  └────────────┘      │       │ │ export       │     │
└──────────────────────┘       └──────────────────────┘
```

### Operation Flow

1. **Push:** Local changes → `POST /sync/push` → creates `SyncOperation` records with `client_clock`
2. **Pull:** `GET /sync/pull` → returns pending operations
3. **Ack:** `POST /sync/<op_id>/ack` → marks operation as synced
4. **Full Sync:** `POST /sync/full-sync` → bidirectional diff + apply

### Conflict Detection

- **Tombstone:** Entity deleted after client's last sync
- **Staleness:** `client_clock < entity.updated_at`
- **Name collision:** Duplicate name+type detection
- **Resolution:** `source` / `target` / `manual` (with `merged_content`)

### Sync Fields

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

## 19. Background Jobs & Processing

### Worker (`worker.py`)
- Entry point for background job processing

### Scheduler (`scheduler.py`)
- Scheduled task runner
- Handles: backup cleanup, expired session cleanup, orphan file cleanup

### Job System (Cloud Only)

- **Table:** `jobs`
- **Statuses:** pending, running, completed, failed, cancelled, dead_letter
- **Priorities:** critical, high, medium, low
- **Idempotency:** `idempotency_key` unique index
- **Retries:** configurable `retry_count` / `max_retries`
- **Timeout:** `timeout_seconds` per job

### Processing Pipeline (`app/services/processing/`)

| Component | File | Description |
|-----------|------|-------------|
| `ProcessingPipeline` | `pipeline.py` | Orchestrates file processing workflows |
| `process_local_upload` | `pipeline.py` | Post-upload processing: variants, metadata, text extraction |
| `JobRunner` | `job_runner.py` | Executes job tasks (file validation, etc.) |
| `process_next_job` | `job_runner.py` | Dequeue and execute next pending job |

---

## 20. Testing

### Test Structure

```
tests/
├── conftest.py              — Shared fixtures (app, client, db)
├── test_auth.py             — Auth endpoint tests
├── test_blocks.py           — Block CRUD tests
├── test_dashboard.py        — Dashboard tests
├── test_entities.py         — Entity CRUD tests
├── test_files.py            — File upload/tests
├── test_misc.py             — Miscellaneous tests
├── test_models.py           — Model validation tests
├── test_notifications.py    — Notification tests
├── test_relations.py        — Relation tests
├── test_services.py         — Service layer tests
├── test_versions.py         — Versioning tests
├── test_workspaces.py       — Workspace tests
├── cloud/
│   ├── conftest.py          — Cloud-specific fixtures
│   ├── test_admin.py        — Admin endpoint tests
│   ├── test_comments.py     — Comment tests
│   ├── test_governance.py   — Governance tests
│   ├── test_jobs.py         — Job CRUD tests
│   ├── test_smoke.py        — Cloud smoke tests
│   └── test_workspace_members.py — Member management tests
```

### Test Configuration (`TestingConfig`)

- **Database:** SQLite in-memory (`sqlite://`)
- **Rate limiting:** Disabled
- **Cache:** NullCache
- **Zip keys:** Test-specific encryption/HMAC keys
- **Auth keys:** Test-specific JWT/secret keys

### Running Tests

```bash
cd backend
python -m pytest tests/ -x -q              # Standard run
python -m pytest tests/cloud/ -x -q        # Cloud-specific tests
python -m pytest tests/test_auth.py -x -v  # Single test file
```

---

## 21. Scripts & Utilities

| Script | Path | Purpose |
|--------|------|---------|
| `gen_api_doc.py` | `scripts/gen_api_doc.py` | Generate API documentation |
| `compare_api_specs.py` | `scripts/compare_api_specs.py` | Compare API specs |
| `compare_spec_vs_code.py` | `scripts/compare_spec_vs_code.py` | Compare spec vs code |
| `s3_create_folders.py` | `scripts/s3_create_folders.py` | Create S3 folder structure |
| `test_storage.py` | `scripts/test_storage.py` | Storage provider tests |
| `s3_migrate_prefix.py` | `s3_migrate_prefix.py` | S3 prefix migration |
| `pgadmin_connect.py` | `pgadmin_connect.py` | pgAdmin connection helper |
| `fk_cascade_audit_report.json` | `fk_cascade_audit_report.json` | FK cascade audit |

---

> **END OF API REFERENCE** — This document covers 208+ endpoints across 28 API modules, 36 database tables (29 core + 7 cloud-only), 100+ marshmallow schemas, 27 services, 33+ repositories, full configuration reference, error codes, rate limits, security model, storage architecture, and sync mechanism.
