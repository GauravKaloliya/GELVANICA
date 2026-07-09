# Gnovium Backend

> Flask API serving 111 endpoints across 22 modules — the core of the Gnovium Knowledge Operating System.

| | |
|---|---|
| Runtime | Python 3.11 |
| Framework | Flask 3.x + SQLAlchemy 2.x |
| Database | SQLite (local) / PostgreSQL 16 + pgvector (cloud) |
| Auth | JWT (access + refresh tokens) + OAuth2 PKCE + API keys |
| AI | Inference Runtime with retriever + context builder |
| Deploy | Vercel (serverless) or Docker |

---

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
flask --app run.py run --debug
```

Health check:

```bash
curl http://localhost:5001/health
```

Register and login (set `GNOVIUM_MODE=cloud` or use the cloud API at `https://api.gnovium.com`; auth endpoints are cloud-only):

```bash
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gnovium.dev","password":"change-me-123","name":"Admin User"}'

curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gnovium.dev","password":"change-me-123"}'
```

Use the returned access token:

```bash
curl http://localhost:5001/api/v1/workspaces/ \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## Project Structure

```
backend/
├── .env                          # Local env vars (secret)
├── .env.cloud                    # Cloud deployment env vars
├── .env.local                    # Local overrides
├── .gitignore                    # Ignores .venv, *.db, __pycache__
├── requirements.txt              # Python dependencies (prod)
├── pyproject.toml                # Project metadata (PEP 621)
├── run.py                        # Flask application entry point
├── SQLITE_SCHEMA.sql             # SQLite schema (local mode)
├── POSTGRESQL_SCHEMA.sql         # PostgreSQL + pgvector schema (cloud mode)
│
├── app/
│   ├── __init__.py               # Flask app factory (create_app)
│   ├── extensions.py             # SQLAlchemy, JWT, CORS, Limiter, Cache, Redis init
│   │
│   ├── api/
│   │   ├── __init__.py           # Blueprint registration
│   │   ├── v1/
│   │   │   ├── __init__.py       # v1 blueprint + route registration
│   │   │   ├── helpers.py        # Shared route utilities (pagination, error handling)
│   │   │   ├── activity/         # Activity audit trail
│   │   │   ├── ai/               # AI inference/chat/completion/agent endpoints
│   │   │   ├── auth/             # Register, login, OAuth, token refresh, logout
│   │   │   ├── backups/          # Export/import workspaces
│   │   │   ├── blocks/           # Block CRUD, reorder, search
│   │   │   ├── branches/         # Branch CRUD, merge, diff
│   │   │   ├── comments/         # Comment CRUD (threaded)
│   │   │   ├── dashboard/        # Workspace overview stats
│   │   │   ├── diffs/            # Version comparison (cloud only)
│   │   │   ├── entities/         # Entity CRUD, types, properties
│   │   │   ├── files/            # File upload, download, S3 presign
│   │   │   ├── governance/       # Health scoring, duplicates, orphans, stale
│   │   │   ├── graph/            # Knowledge graph — materialize, traverse, pathfinding
│   │   │   ├── jobs/             # Async job management (cloud only)
│   │   │   ├── notifications/    # Notification CRUD, mark read
│   │   │   ├── relations/        # Relation CRUD
│   │   │   ├── search/           # Full-text, semantic, hybrid search
│   │   │   ├── sync/             # Offline sync operations (cloud only)
│   │   │   ├── tags/             # Tag CRUD, merge
│   │   │   ├── versions/         # Version snapshots/changesets (cloud only)
│   │   │   └── workspaces/       # Workspace CRUD + stats
│   │   │
│   │   └── ... (v2, health, system routes)
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Flask config classes (Local/Cloud/Testing)
│   │   ├── errors.py             # Structured error classes
│   │   ├── logging.py            # Logging config (structlog)
│   │   ├── response.py           # Standard JSON response helpers
│   │   ├── serialization.py      # JSON serialization (datetime, UUID, Decimal)
│   │   └── validation.py         # Input validation utilities
│   │
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── request_context.py    # Request ID, timing, user context
│   │   └── security.py           # CORS, CSP, rate limiting, allowed hosts
│   │
│   ├── models/
│   │   ├── __init__.py           # Model registry
│   │   ├── base.py               # DeclarativeBase with common mixins
│   │   ├── types.py              # Custom SQLAlchemy types (JSON, DateTimeWithTZ)
│   │   ├── domain.py             # Cloud models (PostgreSQL): User, Workspace, Entity,
│   │   │                         #   Block, Tag, Relation, Comment, Branch, Version,
│   │   │                         #   Notification, File, Job, Session, ApiKey, etc.
│   │   ├── local.py              # Local models (SQLite): mirrors domain.py subset
│   │   └── local_base.py         # SQLite-specific base with auto-schema creation
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py             # Shared schemas: Pagination, Error, Messages
│   │   └── domain.py             # Request/response schemas for all modules
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth_service.py       # JWT creation/verification, OAuth, password hashing
│   │   ├── backup_service.py     # Export/import workspace data
│   │   ├── block_service.py      # Block CRUD, reorder, search
│   │   ├── comment_service.py    # Comment CRUD
│   │   ├── dashboard_service.py  # Dashboard statistics aggregation
│   │   ├── entity_service.py     # Entity CRUD, types, properties
│   │   ├── file_service.py       # File upload, S3 presign, local storage
│   │   ├── governance_service.py # Health scoring, duplicate/orphan detection
│   │   ├── graph_service.py      # Graph materialization, traversal, pathfinding
│   │   ├── job_service.py        # Async job orchestration
│   │   ├── notification_service.py # Notification dispatch
│   │   ├── relation_service.py   # Relation CRUD
│   │   ├── search_service.py     # Full-text, semantic, hybrid search
│   │   ├── security.py           # Rate limiting, audit logging
│   │   ├── sync_service.py       # Offline sync reconciliation
│   │   ├── tag_service.py        # Tag CRUD, merge
│   │   ├── versioning_service.py # Version snapshots, changesets, diff computation
│   │   └── workspace_service.py  # Workspace CRUD
│   │
│   ├── repositories/
│   │   ├── __init__.py
│   │   ├── base.py               # Abstract repository interface
│   │   ├── domain.py             # Cloud repository implementations
│   │   └── local.py              # SQLite repository implementations
│   │
│   ├── ai/
│   │   ├── __init__.py
│   │   └── service.py            # Inference Runtime pipeline + retriever + context builder
│   │
│   ├── events/
│   │   ├── __init__.py
│   │   └── service.py            # Event dispatch + activity log writer
│   │
│   ├── graph/
│   │   ├── __init__.py
│   │   └── service.py            # Graph engine — materialization, traversal algorithms
│   │
│   ├── jobs/
│   │   └── __init__.py           # Background job orchestration
│   │
│   └── sync/
│       └── __init__.py           # Sync engine — conflict resolution, changesets
│
└── tests/
    ├── conftest.py               # Pytest fixtures (app, client, db, auth headers)
    ├── test_app.py               # App factory, health check, configuration
    ├── test_api_routes.py        # All endpoint integration tests
    └── test_integration.py       # Cross-module integration scenarios
```

---

## Architecture

### Layered Design

```
Route (api/v1/*/routes.py)
  │  HTTP handling, validation, auth, response formatting
  ▼
Service (services/*.py)
  │  Business logic, orchestration, cross-domain coordination
  ▼
Repository (repositories/*.py)
  │  Database access (abstracted for SQLite/PostgreSQL switching)
  ▼
Model (models/*.py)
     SQLAlchemy ORM — maps to SQLITE_SCHEMA.sql / POSTGRESQL_SCHEMA.sql
```

AI, graph, governance, events, jobs, and sync are isolated domains rather than being embedded in the service layer — keeping the codebase modular as it grows. Notable design choices:
  - **Graph**: materialized on demand with incremental/cached updates (full rebuild only on first materialization or schema change)
  - **Governance**: health scoring is a background job (tiered — cheap checks run inline, expensive analysis runs asynchronously)
  - **Sync**: Git-style operation log (ordered append-only changesets with server-side conflict resolution), not CRDTs — chosen for simplicity and predictable merge semantics in a workspace-oriented data model

### Dual-Mode Database

| Mode | Database | Schema | Features |
|------|----------|--------|----------|
| Local | SQLite | `SQLITE_SCHEMA.sql` | Full offline workspace; append-only block versioning |
| Cloud | PostgreSQL 16 + pgvector | `POSTGRESQL_SCHEMA.sql` | Multi-user, changeset-based versioning, vector search, async jobs, sync |

Tables present in both schemas: workspaces, entity_types, entities, blocks, properties, entity_property_values, relations, tags, entity_tags, comments, branches, branch_merges, merge_conflicts, entity_branch_heads, entity_events, embeddings, search_documents, files, entity_files, snapshots, graph_materializations, governance_reports, notifications, activity_log/activity_logs.

Cloud-only tables: users, sessions, workspace_members, changesets, entity_versions, block_versions, sync_operations, jobs.

### AI Pipeline

```
User Query → Context Builder → Retriever → Inference Runtime → Multi-Agent Runtime → Safety Layer → Tool Runtime → Gnovium APIs → Workspace
```

| Component | Role |
|-----------|------|
| Context Builder | Assembles relevant context from current workspace, entities, blocks, and graph |
| Retriever | Keyword, full-text, hybrid, or semantic search to fetch supporting documents |
| Inference Runtime | GPU-native inference (CUDA on-device locally, cloud inference in cloud mode). Practical MVP backends (llama.cpp, ONNX Runtime, TensorRT-LLM) provide a working AI subsystem day one; custom GPU-native runtime is the long-term strategic differentiator. |
| Multi-Agent Runtime | Supervisor → Planner → Worker Agents (Editor, Knowledge, Governance). All modifications pass through a **staged safety pipeline**: Policy Validation → Permission Validation → Simulation/Dry-Run → Diff Generation → User Approval. |
| Tool Runtime | Registry → Policy + Permission Validator → Simulation + Diff → CRUD Execution (with User Approval). Read-only tools (search, graph queries) bypass the approval stage; destructive operations require explicit confirmation. |

---

## Configuration

Configuration is managed through Flask config classes in `app/core/config.py`:

| Class | Mode | Used For |
|-------|------|----------|
| `Config` | base | Shared settings across all environments |
| `LocalConfig` | `local` | Local dev with SQLite, auto-create tables |
| `CloudConfig` | `cloud` | Cloud production — PostgreSQL, Redis, S3 |
| `TestingConfig` | `testing` | Unit tests — in-memory SQLite, null cache |

Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GNOVIUM_MODE` | `local` | Runtime mode (`local` or `cloud`) |
| `SECRET_KEY` | (random) | Flask secret key |
| `JWT_SECRET_KEY` | (random) | JWT signing key |
| `DATABASE_URL` | `sqlite:///data/local.db` | Database connection string |
| `REDIS_URL` | *(empty)* | Redis connection (caching, jobs, rate limits) |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `ALLOWED_HOSTS` | `127.0.0.1,localhost` | Host header validation |
| `AUTO_CREATE_TABLES` | `true` | Auto-create tables on startup (dev only) |
| `REQUIRE_REDIS` | `false` | Fail if Redis unavailable (prod only) |
| `OLLAMA_BASE_URL` | *(empty)* | Inference Runtime base URL |
| `OLLAMA_MODEL` | `llama3.1` | Default model for inference |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Model for embeddings |

---

## API Reference

Full endpoint documentation is in [API.md](./API.md) — 111 endpoints, 80 routes, 22 modules, with request/response schemas and deployment mode annotations.

---

## Database Schemas

- **`SQLITE_SCHEMA.sql`** — Local mode schema with 26 tables (workspaces, entity_types, entities, blocks, properties, entity_property_values, relations, tags, entity_tags, entity_events, files, entity_files, branches, branch_heads, entity_branch_heads, branch_merges, merge_conflicts, snapshots, snapshot_blocks, embeddings, graph_materializations, comments, notifications, governance_reports, activity_log, search_documents) — includes FTS5 virtual tables for full-text search
- **`POSTGRESQL_SCHEMA.sql`** — Cloud mode schema with 32 tables (all of the above plus users, sessions, workspace_members, changesets, entity_versions, block_versions, sync_operations, jobs) — includes pgvector extension for vector search, pg_trgm for fuzzy text search, tsvector columns for full-text search, and soft-delete support

---

## Tests

```bash
# Run all tests
pytest

# With coverage
pytest --cov=app

# Specific test file
pytest tests/test_api_routes.py -v
```

| File | Coverage |
|------|----------|
| `test_app.py` | App factory, health endpoint, config loading |
| `test_api_routes.py` | All 22 module endpoints — auth, CRUD, search, graph, AI, sync |
| `test_integration.py` | Cross-module workflows (create entity → add blocks → tag → search → graph) |

---

## Deployment

### Vercel (Serverless)

The API deploys from the repository root. The root `vercel.json` rewrites all traffic to `api/index.py` which imports this Flask app. Production values belong in Vercel environment variables.

```bash
# Build command handled by Vercel
# vercel.json rewrites all routes to api/index.py
```

Required production variables:

```bash
GNOVIUM_MODE=cloud
SECRET_KEY=...
JWT_SECRET_KEY=...
DATABASE_URL=postgresql+psycopg://...
REDIS_URL=redis://...
CORS_ORIGINS=https://www.gnovium.com,https://*.vercel.app
ALLOWED_HOSTS=www.gnovium.com,*.vercel.app
AUTO_CREATE_TABLES=false
REQUIRE_REDIS=true
```

### Docker

```bash
docker build -t gnovium-api .
docker run -p 5001:5001 \
  -e DATABASE_URL=sqlite:///data/local.db \
  gnovium-api
```

---

## Dependencies

| Package | Purpose |
|---------|---------|
| Flask 3.x | Web framework |
| SQLAlchemy 2.x | ORM |
| Flask-SQLAlchemy | Flask ORM integration |
| Flask-CORS | Cross-origin requests |
| Flask-JWT-Extended | JWT encoding/decoding |
| Flask-Limiter | Rate limiting |
| Flask-Caching | Caching (SimpleCache local, Redis cloud) |
| marshmallow | Request/response schema validation |
| bcrypt | Password hashing |
| structlog | Structured logging |
| redis | Caching, job queue, rate limits |
| psycopg[binary] 3.x | PostgreSQL driver |
| boto3 | S3 presigned URLs |
| google-auth | Google OAuth verification |
| requests | HTTP client for AI inference calls |
| python-dotenv | .env loading |
| pytest + pytest-flask | Testing |
