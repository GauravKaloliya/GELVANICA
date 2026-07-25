# Gnovium Backend

> Flask API serving **189 endpoints** across **26 modules** — the core of the Gnovium Knowledge Operating System.

| | |
|---|---|
| Runtime | Python 3.11+ |
| Framework | Flask 3.x + SQLAlchemy 2.x |
| Database | SQLite (local) / PostgreSQL 16 + pgvector (cloud) |
| Auth | JWT (access + refresh tokens) + Google OAuth |
| Deploy | Vercel (serverless) or Docker |

---

## Quick Start

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.local .env  # or copy from .env.example
flask --app run.py run --debug
```

Health check:

```bash
curl http://localhost:5001/health
```

Register and login (requires cloud mode or cloud API):

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

## Architecture

### Layered Design

```
Route (app/api/v1/*/routes.py)
  │  HTTP handling, validation, auth, response formatting
  ▼
Service (app/services/*.py)
  │  Business logic, orchestration, cross-domain coordination
  ▼
Repository (app/repositories/*.py)
  │  Database access (abstracted for SQLite/PostgreSQL switching)
  ▼
Model (app/models/*.py)
     SQLAlchemy ORM — maps to SQLITE_SCHEMA.sql / POSTGRESQL_SCHEMA.sql
```

AI, graph, governance, events, jobs, and sync are isolated domains rather than being embedded in the service layer.

### Dual-Mode Database

| Mode | Database | Schema | Features |
|------|----------|--------|----------|
| Local | SQLite (WAL mode) | `SQLITE_SCHEMA.sql` (30 tables) | Full offline workspace; append-only block versioning |
| Cloud | PostgreSQL 16 + pgvector | `POSTGRESQL_SCHEMA.sql` (33 tables) | Changeset versioning, vector search, async jobs |

### Endpoint Summary (189 total)

| Module | Endpoints | Scope | Status |
|--------|:------:|-------|:------:|
| System (health) | 1 | Both | ✅ |
| Metrics (Prometheus) | 1 | Both | ✅ |
| Docs (API reference) | 1 | Both | ✅ |
| Admin (user mgmt) | 4 | Both | ✅ |
| Auth | 14 | Both (some cloud-only) | ✅ |
| Workspaces | 7 | Both | ✅ |
| Workspace Members | 5 | Cloud-only | ✅ |
| Entities | 18 | Both | ✅ |
| Properties | 6 | Both | ✅ |
| Blocks | 9 | Both | ✅ |
| Relations | 10 | Both | ✅ |
| Comments | 6 | Both | ✅ |
| Tags | 8 | Both | ✅ |
| Branches | 10 | Both | ✅ |
| Versions | 13 | Both | ✅ |
| Diffs | 2 | Both | ✅ |
| Search | 2 | Both | ⏳ pending (501) |
| AI | 3 | Both | ⏳ pending (501) |
| Settings | 4 | Both | ✅ |
| Files | 19 | Both (some cloud-only) | ✅ |
| Graph | 6 | Both | ✅ |
| Governance | 5 | Both | ⏳ pending (501) |
| Dashboard | 1 | Both | ✅ |
| Notifications | 7 | Both | ✅ |
| Jobs | 6 | Cloud-only | ✅ |
| Sync | 8 | Both | ✅ |
| Activity | 2 | Both | ✅ |
| Backups | 11 | Both | ✅ |
| **Total** | **189** | | **178 impl + 11 pending** |

---

## Configuration

### Environment Files

| File | Purpose |
|------|---------|
| `.env` | Active configuration (copied from one of the templates) |
| `.env.example` | All possible variables with documentation |
| `.env.local` | Local development (SQLite, in-memory cache, relaxed limits) |
| `.env.cloud` | Cloud production (PostgreSQL, Redis, S3, strict limits) |

### Key Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GNOVIUM_MODE` | `local` | Runtime mode (`local` or `cloud`) |
| `SECRET_KEY` | (random) | Flask secret key |
| `JWT_SECRET_KEY` | (random) | JWT signing key |
| `DATABASE_URL` | `sqlite:///data/local.db` | Database connection string |
| `REDIS_URL` | (empty) | Redis connection (in-memory fallback if unset) |
| `GOOGLE_CLIENT_ID` | (empty) | Google OAuth client ID |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed CORS origins |
| `ALLOWED_HOSTS` | `127.0.0.1,localhost` | Host header validation |

---

## API Reference

Full endpoint documentation is in [API.md](./API.md) — **189 endpoints, 26 modules**, with request/response schemas, deployment mode annotations, and error codes.

See the live docs endpoint: `GET /api/v1/docs` — returns a complete JSON catalog of all endpoints, auth requirements, error codes, and rate limits.

---

## Auth Flow

1. User registers or logs in at the **cloud API** (`/auth/register`, `/auth/login`, `/auth/google`)
2. Cloud returns `{ tokens: { access_token, refresh_token }, user }`
3. Both local and cloud modes verify the JWT using the shared `JWT_SECRET_KEY`
4. Access tokens expire in 30 minutes, refresh tokens in 30 days
5. Refresh tokens are stored server-side in the `sessions` table with JTI, IP, user-agent; revoked on logout

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

---

## Deployment

### Vercel (Serverless)

The backend is designed to run on Vercel as a serverless Python function via `@vercel/python`.

**Setup:**
1. Connect the repo to Vercel
2. Set the root directory to `backend/`
3. Configure the following environment variables in Vercel dashboard:
   ```
   GNOVIUM_MODE=cloud
   DATABASE_URL=postgresql+psycopg://...
   JWT_SECRET_KEY=<random-32-chars>
   REDIS_URL=redis://...
   SECRET_KEY=<random-32-chars>
   CORS_ORIGINS=https://app.gnovium.com,https://gnovium.com
   ```
4. Deploy — the API serves at `https://api.gnovium.com/api/v1/*`

**Domain structure:**
```
https://api.gnovium.com/api/v1/*      → Flask API
https://api.gnovium.com/api/v1/docs   → API documentation
https://app.gnovium.com/*              → Frontend (separate deploy)
https://gnovium.com/*                  → Landing page (separate deploy)
```

**vercel.json** handles routing, CORS headers, security headers, and caching.

### Docker

```bash
docker build -t gnovium-api .
docker run -p 5001:5001 \
  -e DATABASE_URL=sqlite:///data/local.db \
  gnovium-api
```

### Local Development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.local .env  # or .env.cloud for cloud-mode testing
flask --app run.py run --debug
```

The server starts at `http://localhost:5001` with the API available at `/api/v1/*`.

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
| Flask-Migrate | Alembic database migrations |
| marshmallow | Request/response schema validation |
| bcrypt | Password hashing |
| structlog | Structured logging |
| redis | Caching, job queue, rate limits |
| psycopg[binary] 3.x | PostgreSQL driver |
| boto3 | S3 presigned URLs |
| google-auth | Google OAuth token verification |
| requests | HTTP client |
| python-dotenv | .env loading |
| Pillow | Image processing (thumbnails, previews) |
| PyMuPDF | PDF text extraction |
| APScheduler | Background job scheduler |
| pytest + pytest-flask | Testing |

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py              # App factory, route/error registration
│   ├── api/v1/                  # API route blueprints (26 modules)
│   │   ├── __init__.py          # Blueprint registration
│   │   ├── activity/            # Activity log routes
│   │   ├── admin/               # Admin user management
│   │   ├── ai/                  # AI query/suggest/summarize (pending)
│   │   ├── auth/                # Auth endpoints (14 routes)
│   │   ├── backups/             # Export/import (JSON, ZIP, Markdown, HTML, PDF)
│   │   ├── blocks/              # Block CRUD + reorder/move
│   │   ├── branches/            # Branch CRUD + merge/conflict resolution
│   │   ├── comments/            # Threaded comments
│   │   ├── dashboard/           # Workspace overview stats
│   │   ├── diffs/               # Version/branch comparison
│   │   ├── docs/                # API documentation catalog
│   │   ├── entities/            # Entity CRUD + types/properties/children
│   │   ├── files/               # File upload/download/storage
│   │   ├── governance/          # Workspace health checks (pending)
│   │   ├── graph/               # Knowledge graph operations
│   │   ├── jobs/                # Async job tracking (cloud-only)
│   │   ├── notifications/       # User notifications
│   │   ├── properties/          # Custom property CRUD
│   │   ├── relations/           # Relation CRUD + graph traversal
│   │   ├── search/              # Full-text search (pending)
│   │   ├── settings/            # Workspace settings
│   │   ├── sync/                # Offline sync operations
│   │   ├── tags/                # Tag CRUD + entity tagging
│   │   ├── versions/            # Changesets, snapshots, versioning
│   │   ├── workspace_members/   # Member management (cloud-only)
│   │   └── workspaces/          # Workspace CRUD
│   ├── core/                    # Config, errors, logging, constants, serialization
│   ├── models/                  # SQLAlchemy ORM models
│   ├── services/                # Business logic layer
│   ├── repositories/            # Database access layer
│   ├── schemas/                 # Marshmallow validation schemas
│   ├── middleware/               # Request context, security
│   ├── monitoring.py            # MetricsCollector, Prometheus export
│   └── extensions.py            # Flask extension initialization
├── API.md                       # Full API reference (3893 lines)
├── README.md                    # This file
├── requirements.txt             # Pinned dependencies
├── pyproject.toml               # Project metadata
├── vercel.json                  # Vercel deployment config
├── wsgi.py                      # WSGI entry point (for Vercel)
├── run.py                       # Development server runner
├── .env.example                 # Environment variable reference
├── .env.local                   # Local development template
├── .env.cloud                   # Cloud production template
├── .gitignore
├── SQLITE_SCHEMA.sql            # SQLite schema
├── POSTGRESQL_SCHEMA.sql        # PostgreSQL schema
├── data/                        # SQLite database (local mode)
└── instance/                    # File uploads, backups
```
