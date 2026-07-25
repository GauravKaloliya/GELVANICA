<div align="center">

<br />

# GNOVIUM <sup style="font-size:1rem;font-weight:900;color:#09090b;background:#fff;padding:2px 10px;border:2px solid #09090b;margin-left:8px;">MVP</sup>

### KNOWLEDGE OS FOR HUMANS & MACHINES

<br />

[![Version](https://img.shields.io/badge/release-v1.0.1-000?style=for-the-badge&labelColor=fff)](https://github.com/GauravKaloliya/GNOVIUM/releases)
[![License](https://img.shields.io/badge/license-MIT-000?style=for-the-badge&labelColor=fff)](LICENSE)
[![Endpoints](https://img.shields.io/badge/endpoints-114-000?style=for-the-badge&labelColor=fff)](docs/public/openapi.json)
[![Routes](https://img.shields.io/badge/routes-83-000?style=for-the-badge&labelColor=fff)](docs/public/openapi.json)
[![Modules](https://img.shields.io/badge/modules-22-000?style=for-the-badge&labelColor=fff)](docs/src/data/modules)
[![AI](https://img.shields.io/badge/ai-Inference-000?style=for-the-badge&labelColor=fff)](#-ai-workspace-assistant)
[![Mode](https://img.shields.io/badge/mode-local+cloud-000?style=for-the-badge&labelColor=fff)](#-deployment-modes)
[![Build](https://img.shields.io/badge/build-passing-000?style=for-the-badge&labelColor=fff)]()
[![Monorepo](https://img.shields.io/badge/monorepo-npm%20workspaces-000?style=for-the-badge&labelColor=fff)](package.json)

<br />

```
╔══════════════════════════════════════════════════════════════════════════╗
║  LOCAL-FIRST · OFFLINE-CAPABLE · AI-NATIVE · PRIVACY-FIRST             ║
║                                                                          ║
║  Gnovium is a knowledge management platform that combines block-based   ║
║  editing, relational knowledge graphs, Git-inspired versioning, and     ║
║  AI-powered semantic search into one unified workspace.                 ║
║                                                                          ║
║  114 ENDPOINTS · 83 ROUTES · 22 MODULES · 2 DEPLOYMENT MODES           ║
╚══════════════════════════════════════════════════════════════════════════╝
```

<br />

[🚀 Quick Start](#-quick-start) •
[🏗 Monorepo Architecture](#-monorepo-architecture) •
[🖥 Proxy & Routing](#-proxy--routing) •
[🏗 System Architecture](#-system-architecture) •
[📖 API Reference](#-complete-api-routes) •
[📚 Docs](docs/README.md) •
[🐛 Issues](https://github.com/GauravKaloliya/GNOVIUM/issues)

<br />
</div>

---

<br />

## 👤 ABOUT THE CREATOR

<br />

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║                       GAURAV KALOLIYA                                ║
║                 FOUNDER & CREATOR OF GNOVIUM                          ║
║                                                                      ║
║   "I believe knowledge should be alive — connected, versioned, and   ║
║    evolvable. Not trapped in silos or scattered across folders.       ║
║    Gnovium is my answer to a decade of fighting knowledge chaos."     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

**A decade of experience. One mission: fix how humans and machines interact with knowledge.**

</div>

Gaurav Kaloliya isn't just building another note-taking app. He's reimagining what knowledge infrastructure looks like for the AI era. With a deep background in systems architecture, distributed databases, and machine learning, Gaurav identified a critical gap in the market — every knowledge tool today treats information as **dead documents** rather than **living systems**.

**His insight was simple but profound:** If we could give knowledge the same capabilities that Git gave code — versioning, branching, merging, diffing — and combine it with the relational power of a knowledge graph and the intelligence of modern AI, we could unlock entirely new ways of working with information.

Gnovium is the culmination of that vision. It's not a product. It's a **Knowledge Operating System** — and this MVP is just the beginning.

<br />

<div align="center">

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=for-the-badge&logo=linkedin&labelColor=fff)](https://www.linkedin.com/in/gaurav-kaloliya-b44569417)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-000?style=for-the-badge&logo=github&labelColor=fff)](https://github.com/GauravKaloliya)
[![Email](https://img.shields.io/badge/Email-Contact-red?style=for-the-badge&logo=gmail&labelColor=fff)](mailto:gauravkaloliya@example.com)

</div>

---

<br />

## 📋 PROJECT OVERVIEW

<br />

Gnovium MVP is a **knowledge management platform** that supports both **Local Mode** and **Cloud Mode** using the same knowledge model, workflows, and user experience.

By default, Gnovium runs entirely on the user's device with **offline-first** storage, **local AI** capabilities, and **complete data ownership**. When collaboration, synchronization, and managed infrastructure are needed, users can switch to Cloud Mode **without migrating their data or changing workflows**.

Gnovium combines:
- **Block-based editing** — rich text, headings, lists, checklists, code blocks, quotes, callouts, images, tables
- **Relational knowledge management** — custom properties, typed relations, backlinks, tags
- **Visual knowledge graphs** — interactive graph view with zoom, filters, and navigation
- **Workspace versioning** — Git-inspired snapshots, branches, diffs, and restore
- **AI-assisted knowledge discovery** — semantic search, Q&A, summarization, recommendations
- **Safety-First AI pipeline** — multi-agent runtime with staged safety gates (Policy → Permission → Simulation → Diff → Approval), read-only tools bypass approval, practical MVP backends (llama.cpp, ONNX Runtime, TensorRT-LLM) alongside the custom GPU-native runtime

all within a **unified workspace** that works offline-first by default.

<br />

---

<br />

## 🖥 DEPLOYMENT MODES

<br />

Gnovium operates in two deployment modes, both using **identical API contracts and data models**.

<table>
<tr>
<td width="50%" valign="top" style="border:3px solid #000;padding:20px;">

### LOCAL MODE *(Default)*

**Your knowledge stays yours.**

Run Gnovium entirely on your device with zero setup required.

**Storage:** SQLite
**AI:** Local Inference Runtime
**Operation:** Offline-first
**Data Ownership:** Complete

```
GNOVIUM_MODE=local
```

**Database:** `instance/gnovium.db` (SQLite)

**Backend Server:** `http://localhost:5001`

**Ideal For:**
- Personal knowledge bases
- Academic research
- Privacy-first workflows
- Offline environments
- Sensitive data

</td>
<td width="50%" valign="top" style="border:3px solid #000;padding:20px;">

### CLOUD MODE

**Transform personal knowledge into shared intelligence.**

Enable cloud infrastructure for collaboration and scale.

**Storage:** PostgreSQL (NeonDB)
**File Storage:** S3-compatible
**Cache:** Redis
**AI:** Cloud Inference Runtime
**Sync:** Bidirectional cloud sync

```
GNOVIUM_MODE=cloud
```

**API Endpoint:** `https://api.gnovium.com`

**Ideal For:**
- Team collaboration
- Cross-device access
- Managed backups
- Production deployments
- Enterprise workflows

</td>
</tr>
</table>

> **The Knowledge Model Never Changes.** Whether you run on SQLite locally or NeonDB in the cloud, every entity, block, relation, tag, version, branch, and graph operation works identically.

<br />

---

<br />

## 🚀 QUICK START

<br />

```bash
# Install all workspaces
npm install

# Start everything via unified proxy (landing + cloud-web + docs + backend)
npm run dev

# Or run individual apps:
npm run dev -w landing    # Landing page (port 3100 standalone → 3000 via proxy)
npm run dev -w cloud-web  # Cloud dashboard (port 3101)
npm run dev -w docs       # API docs portal (port 3102)
npm run dev:backend        # Flask API (port 5001)

# Build all three Next.js apps
npm run build:all

# Run the Flask backend (port 5001)
npm run dev:backend
```

| URL (via proxy) | App | Internal Port |
|---------------|-----|---------------|
| `http://localhost:3000/` | Landing page | 3100 |
| `http://localhost:3000/app` | Cloud dashboard | 3101 |
| `http://localhost:3000/api/v1/docs` | API documentation | 3102 |
| `http://localhost:3000/api/v1/` | Flask backend API | 5001 |

---

<br />

## 🏗 MONOREPO ARCHITECTURE

<br />

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GNOVIUM MONOREPO                             │
│                    npm workspaces · 5 packages                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  landing/          Landing page (Next.js 16, port 3100)              │
│  ├── src/components/*.tsx    — 17 sections + reveal animations       │
│  ├── src/app/page.tsx       — Single-page marketing site             │
│  └── packages: @gnovium/shared, framer-motion, lucide-react          │
│                                                                      │
│  cloud-web/        Cloud dashboard (Next.js 16, port 3101)           │
│  ├── src/app/signin|signup  — Auth gateway (Google OAuth + email)   │
│  ├── src/app/page.tsx       — Protected dashboard                    │
│  └── basePath: /app (behind proxy)                                   │
│                                                                      │
│  docs/             API docs portal (Next.js 16, port 3102)           │
│  ├── src/data/modules/*.ts  — 22 module files (114 endpoints)        │
│  ├── src/components/*.tsx   — 15 components + shared UniversalNavbar │
│  └── basePath: /api/v1/docs (behind proxy)                           │
│                                                                      │
│  local-app/        Desktop app (Electron + vanilla JS SPA)           │
│  ├── main/index.ts          — BrowserWindow + FlaskManager           │
│  ├── renderer/js/*.js       — 10 page modules + 8 components         │
│  └── basePath: N/A (standalone Electron app)                         │
│                                                                      │
│  packages/         Shared packages                                   │
│  └── shared/                — @gnovium/shared                        │
│       ├── components/                                                 │
│       │   ├── UniversalNavbar.tsx  — Navbar (landing/docs/cloud-web)  │
│       │   └── DownloadContent.tsx  — Download button component       │
│       ├── styles/                                                    │
│       │   └── base.css          — 832-line unified design system     │
│       └── index.ts              — Package exports                    │
│                                                                      │
│  backend/          Flask API (Python 3.11, port 5001)                │
│  ├── app/api/v1/*/routes.py   — 22 module route files                │
│  ├── app/services/*.py        — Business logic layer                 │
│  └── features: JWT auth, SQLAlchemy, SQLite/PostgreSQL, AI pipeline  │
│                                                                      │
│  tools/                                                              │
│  └── proxy.mjs     — Reverse proxy (Node.js, port 3000)              │
│                                                                      │
│  Docker deployment:                                                  │
│  ├── nginx.conf              — Route all apps behind nginx           │
│  └── docker-compose.yml      — 5 services (nginx + 4 apps)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Shared Package (`@gnovium/shared`)

The shared package at `packages/shared/` provides:

| Export | Description | Used By |
|--------|-------------|---------|
| `UniversalNavbar` | Variant-based responsive navbar with theme toggle, creator credit, API status, customizable right slot | docs, landing, (cloud-web uses its own) |
| `DownloadContent` | Download button with dropdown menu | docs, landing |
| `base.css` | 832-line unified design system: 6 themes, neo-brutalist tokens, custom utilities, component styles | docs, landing, cloud-web (via @import) |

All CSS is consolidated into `packages/shared/styles/base.css` — the source of truth for all design tokens, theme variables, and custom utility classes. Each app's `globals.css` is a thin importer (4 lines each), achieving a **58% reduction** in total CSS lines (2,117 → 882).

---

## 🖥 PROXY & ROUTING

<br />

The dev proxy (`tools/proxy.mjs`) is a Node.js reverse proxy that runs all apps behind a single port (3000).

### Proxy Features

- **WebSocket upgrade** — Required for Turbopack HMR in Next.js
- **Keep-alive agent** — `maxSockets: 64` for connection reuse
- **Host header preservation** — Original Host passed through (critical for basePath asset URLs)
- **Sequential startup** — Waits for each app's health check before launching the next
- **Graceful shutdown** — Kills all child processes on SIGINT/SIGTERM
- **Per-app health checks** — Each app gets its own health endpoint and timeout (30s)

### Internal Ports

| App | Internal Port |
|-----|---------------|
| Landing | 3100 |
| Cloud Web | 3101 |
| Docs | 3102 |
| Backend (Flask) | 5001 |

> **Note:** Backend runs on port **5001** (not 5000) because macOS AirPlay Receiver occupies port 5000 by default.

### Routing Table

| Incoming Path | Target App | Target URL |
|--------------|------------|------------|
| `/` (fallback) | Landing | `http://localhost:3100` |
| `/app*` | Cloud Web | `http://localhost:3101/app*` |
| `/api/v1/docs*` | Docs | `http://localhost:3102/api/v1/docs*` |
| `/api/v1/*` (strip prefix) | Backend | `http://localhost:5001/*` |

### BasePath Configuration

Frontend and docs use `NEXT_PUBLIC_BASE_PATH` env variable to set `basePath` in `next.config.ts`:

```env
# cloud-web/.env.local
NEXT_PUBLIC_BASE_PATH=/app

# docs/.env.local
NEXT_PUBLIC_BASE_PATH=/api/v1/docs
```

This ensures asset URLs (CSS, JS, images) are correct when served behind the proxy path prefix. When running standalone (without proxy), set `NEXT_PUBLIC_BASE_PATH` to empty or omit it.

---

## 🐳 Docker Deployment

<br />

Production deployment uses **nginx** as the reverse proxy:

```yaml
# docker-compose.yml — 5 services
nginx:80     → landing:3000  (/)
             → cloud-web:3000 (/app)
             → docs:3000     (/api/v1/docs)
             → backend:5000  (/api/v1/)
```

Each app has its own `Dockerfile` and is built as a standalone Next.js app (`output: "standalone"`). The backend runs Flask directly.

---

## 🎨 CSS CONSOLIDATION

<br />

All three Next.js apps share a single CSS foundation:

| File | Lines | Purpose |
|------|-------|---------|
| `packages/shared/styles/base.css` | 832 | **Source of truth** — 6 themes, design tokens, custom utilities, neo-brutalist components |
| `landing/src/app/globals.css` | 42 | Imports + smooth-scroll + scroll-snap overrides |
| `cloud-web/src/app/globals.css` | 4 | Imports only |
| `docs/src/app/globals.css` | 4 | Imports only |
| **Total** | **882** | **58% reduction from 2,117** |

Each app uses `@source` directives so Tailwind v4 scans the shared components directory for class usage:

```css
@import "tailwindcss";
@source "../../../packages/shared/components/";
@source "../../../packages/shared/index.ts";
@import "../../../packages/shared/styles/base.css";
```

### Landing Animation Alignment

Landing page animations are aligned to docs' exact patterns:

- `RevealSection` uses `whileInView` (not `useInView` + `animate`)
- Card springs: `stiffness: 150`, `damping: 20`, `y: 10`
- Stagger: `delayChildren: 0.05`, `staggerChildren: 0.03`
- Hover: `whileHover={{ scale: 1.02 }}` on all card motion.divs
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)`

### Merged Components

Two landing page components were consolidated:

| Before | After |
|--------|-------|
| `PositioningStrip.tsx` + `StatsStrip.tsx` | `PositioningStats.tsx` |
| `DualMode.tsx` + `SameModelStrip.tsx` | `DualModeSection.tsx` |

---

## 💾 DATA MODEL (Summary)

| Entity | Description |
|--------|-------------|
| **Entity (Page)** | Fundamental knowledge unit with type, properties, blocks |
| **Block** | Content unit within entities (13 types: text, heading, code, image, etc.) |
| **Relation** | Typed, directed edge between entities (forms the knowledge graph) |
| **Tag** | Lightweight label for cross-cutting classification |
| **Changeset** | Tracks changes to entities with point-in-time snapshots |
| **Snapshot** | Workspace-wide point-in-time capture |
| **Branch** | Independent line of development (Git-inspired) |
| **EntityType** | Custom type definitions with property schemas |
| **EntityProperty** | Property definitions per entity type (text, number, select, date, etc.) |

---

## 📚 COMPLETE API ROUTES

<br />

### Base URL

| Environment | URL | Mode |
|-------------|-----|------|
| **Local Development** | `http://localhost:5001/api/v1` | `GNOVIUM_MODE=local` |
| **Cloud Production** | `https://api.gnovium.com/api/v1` | `GNOVIUM_MODE=cloud` |
| **Health Check** | `GET /health` (no version prefix) | Both |

### Standard Response Envelope

All API responses follow a standardized envelope:

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 50,
    "total": 42,
    "pages": 2
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "not_found",
    "message": "Entity not found",
    "details": { "entity_id": "abc-123" }
  }
}
```

### Authentication

| Method | Header | Token Type | Lifespan |
|--------|--------|-----------|----------|
| Access | `Authorization: Bearer <token>` | JWT | 30 minutes |
| Refresh | `Authorization: Bearer <token>` | JWT | 30 days |
| API Key | `X-API-Key: <key>` | Static | Configurable |

---

### 🔐 Auth Module (8 endpoints)

Identity and session management. Register, login, refresh, logout, and profile management. **Cloud only.**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/auth/register` | — | Create a new account |
| `POST` | `/auth/login` | — | Sign in with email + password |
| `GET` | `/auth/check-email` | — | Check email availability |
| `POST` | `/auth/google` | — | Google OAuth sign-in |
| `POST` | `/auth/refresh` | Refresh | Get a new access token |
| `POST` | `/auth/logout` | Refresh | Revoke the current session |
| `GET` | `/auth/me` | Access | Get the authenticated user's profile |
| `PATCH` | `/auth/me` | Access | Update user profile (partial) |

**POST /auth/register**
```json
// Request
{ "email": "alice@example.com", "password": "SecurePass123!", "name": "Alice" }
// Response 201
{ "data": { "access_token": "eyJ...", "refresh_token": "eyJ...", "user": { "id": "uuid", "email": "...", "name": "Alice" } } }
```

**POST /auth/login**
```json
// Request
{ "email": "alice@example.com", "password": "SecurePass123!" }
// Response 200
{ "data": { "access_token": "eyJ...", "refresh_token": "eyJ...", "user": { "id": "uuid", "email": "...", "name": "Alice" } } }
```

**POST /auth/refresh** — Send refresh token in `Authorization: Bearer <token>` header
```json
// Response 200
{ "data": { "access_token": "eyJ...", "refresh_token": "eyJ..." } }
```

**POST /auth/logout** — Revokes refresh token server-side
```json
// Response 200
{ "data": { "message": "logged_out" } }
```

**GET /auth/me**
```json
// Response 200
{ "data": { "id": "uuid", "email": "alice@example.com", "name": "Alice", "avatar_url": null, "created_at": "...", "updated_at": "..." } }
```

**PATCH /auth/me** — Partial update
```json
// Request
{ "name": "Alice Smith", "avatar_url": "https://example.com/avatar.png" }
// Response 200
{ "data": { "id": "uuid", "email": "...", "name": "Alice Smith", ... } }
```

---

### 📂 Workspaces Module (6 endpoints)

Top-level containers that group knowledge, entities, and collaborators.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/workspaces/` | Access | Create a workspace |
| `GET` | `/workspaces/` | Access | List user's workspaces (paginated) |
| `GET` | `/workspaces/<id>` | Access | Get workspace details |
| `PATCH` | `/workspaces/<id>` | Access | Update workspace (partial) |
| `DELETE` | `/workspaces/<id>` | Access | Soft-delete workspace |
| `GET` | `/workspaces/<id>/stats` | Access | Workspace statistics |

**POST /workspaces/**
```json
// Request
{ "name": "My Knowledge Base", "description": "A workspace for research", "settings": { "theme": "dark" } }
// Response 201
{ "data": { "id": "uuid", "name": "My Knowledge Base", "owner_id": "uuid", ... } }
```

**GET /workspaces/<id>/stats**
```json
// Response 200
{ "data": { "workspace_id": "uuid", "entity_count": 42, "block_count": 215, "relation_count": 18, "member_count": 3, "recent_entities": [...] } }
```

---

### 📄 Entities Module (15 endpoints)

The fundamental unit of knowledge — pages, documents, databases, or any typed object.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/entities/` | Access | Create a new entity/page |
| `GET` | `/entities/` | Access | List entities with filters |
| `GET` | `/entities/<id>` | Access | Get entity details |
| `PATCH` | `/entities/<id>` | Access | Update entity (partial) |
| `DELETE` | `/entities/<id>` | Access | Soft-delete entity |
| `POST` | `/entities/<id>/restore` | Access | Restore soft-deleted entity |
| `POST` | `/entities/<id>/archive` | Access | Archive entity (hide without delete) |
| `POST` | `/entities/<id>/duplicate` | Access | Deep copy entity + blocks |
| `GET` | `/entities/<id>/children` | Access | List child entities |
| `POST` | `/entities/<id>/children` | Access | Create child entity |
| `GET` | `/entities/<id>/versions` | Access | List entity version history |
| `POST` | `/entities/types` | Access | Create an entity type |
| `GET` | `/entities/types` | Access | List entity types |
| `POST` | `/entities/properties` | Access | Create a custom property |
| `GET` | `/entities/properties` | Access | List custom properties |

**POST /entities/**
```json
// Request
{ "workspace_id": "uuid", "entity_type_id": "uuid", "title": "Research Notes", "icon": "📄", "properties": { "Status": "Active" } }
// Response 201
{ "data": { "id": "uuid", "title": "Research Notes", ... } }
```

**PATCH /entities/<id>** — Partial update
```json
// Request
{ "title": "Updated Title", "properties": { "Status": "Review" } }
```

**POST /entities/<id>/duplicate** — Creates a deep copy
```json
// Response 201
{ "data": { "id": "uuid", "title": "Research Notes Copy", "duplicated_from": "original-uuid" } }
```

---

### 🧱 Blocks Module (8 endpoints)

The building blocks of entity content — text, headings, lists, code, and more.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/blocks/` | Access | Create a block |
| `GET` | `/blocks/` | Access | List blocks |
| `GET` | `/blocks/<id>` | Access | Get block details |
| `PATCH` | `/blocks/<id>` | Access | Update block content |
| `POST` | `/blocks/<id>/move` | Access | Move block to new position |
| `DELETE` | `/blocks/<id>` | Access | Soft-delete block |
| `POST` | `/blocks/reorder` | Access | Reorder blocks |
| `GET` | `/blocks/entity/<entity_id>` | Access | Get blocks for an entity |

**POST /blocks/**
```json
// Request
{ "entity_id": "uuid", "block_type": "text", "position": 1000, "content": { "text": "Hello, world!" } }
// Response 201
{ "data": { "id": "uuid", "block_type": "text", "content": { "text": "Hello, world!" }, "position": 1000 } }
```

**POST /blocks/reorder** — Batch update positions
```json
// Request
{ "entity_id": "uuid", "blocks": [{ "id": "uuid-1", "position": 100 }, { "id": "uuid-2", "position": 200 }] }
```

**Supported block types:** `text`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list`, `numbered_list`, `to_do`, `code`, `quote`, `callout`, `image`, `divider`, `table`

---

### 📎 Files Module (9 endpoints)

Upload, manage, and link files to entities.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/files/` | Access | List files |
| `POST` | `/files/upload` | Access | Upload file (multipart) |
| `POST` | `/files/` | Access | Create file metadata |
| `GET` | `/files/<id>` | Access | Get file metadata / download |
| `GET` | `/files/<id>/download` | Access | Download file |
| `DELETE` | `/files/<id>` | Access | Soft-delete file |
| `POST` | `/files/presign` | Access | Generate presigned URL (cloud only) |
| `POST` | `/files/<file_id>/entities/<entity_id>` | Access | Attach file to entity |
| `POST` | `/files/cleanup-orphans` | Access | Remove orphaned file metadata |

**POST /files/upload** — Multipart form upload
```json
// Response 201
{ "data": { "id": "uuid", "file_name": "diagram.png", "mime_type": "image/png", "file_size": 204800, "public_url": "/uploads/diagram.png" } }
```

**Storage modes:** Local filesystem (local mode) or S3 (cloud mode)

---

### 🏷️ Tags Module (7 endpoints)

Classify entities with tags.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/tags/` | Access | Create a tag |
| `GET` | `/tags/` | Access | List tags |
| `GET` | `/tags/<id>` | Access | Get tag details |
| `PATCH` | `/tags/<id>` | Access | Update tag |
| `DELETE` | `/tags/<id>` | Access | Delete tag |
| `POST` | `/tags/<tag_id>/entities/<entity_id>` | Access | Assign tag to entity |
| `DELETE` | `/tags/<tag_id>/entities/<entity_id>` | Access | Remove tag from entity |

**POST /tags/**
```json
// Request
{ "workspace_id": "uuid", "name": "important", "color": "#ff4444" }
// Response 201
{ "data": { "id": "uuid", "name": "important", "color": "#ff4444" } }
```

---

### 🔗 Relations Module (8 endpoints)

Connect entities to form a knowledge graph with typed edges.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/relations/` | Access | Create a relation |
| `GET` | `/relations/` | Access | List relations |
| `GET` | `/relations/<id>` | Access | Get specific relation |
| `DELETE` | `/relations/<id>` | Access | Soft-delete relation |
| `GET` | `/relations/entity/<entity_id>` | Access | List relations for an entity |
| `GET` | `/relations/backlinks/<entity_id>` | Access | List backlinks to an entity |
| `GET` | `/relations/neighbors/<entity_id>` | Access | List neighbor entities |
| `GET` | `/relations/path` | Access | Find path between entities |

**Relation types:** `refers_to`, `depends_on`, `part_of`, `related_to`, `implements`, `extends`

**POST /relations/**
```json
// Request
{ "workspace_id": "uuid", "source_entity_id": "uuid", "target_entity_id": "uuid", "relation_type": "refers_to", "metadata": { "reason": "mentioned in notes" } }
// Response 201
{ "data": { "id": "uuid", "source_entity_id": "uuid", "target_entity_id": "uuid", "relation_type": "refers_to" } }
```

---

### 🔍 Search Module (1 endpoint)

Full-text, semantic, and hybrid search across workspace content.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/search/` | Access | Search workspace content |

### 🤖 AI Module (1 endpoint)

AI-powered Q&A using the Inference Runtime with a Safety-First multi-agent pipeline (Supervisor → Planner → Worker Agents) and staged safety gates: Policy Validation → Permission Validation → Simulation/Dry-Run → Diff Generation → User Approval → Execution. Read-only tools (search, graph queries) bypass the approval stage; destructive writes require explicit confirmation.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/ai/query` | Access | Natural language Q&A |

**GET /search/**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `workspace_id` | UUID | — | **Required.** Scope search to workspace |
| `q` | string | — | **Required.** Search query |
| `mode` | enum | `hybrid` | `keyword`, `full_text`, `hybrid`, `semantic` |
| `limit` | int | 20 | Results per page (1-30) |

```json
// Response
{ "data": [{ "id": "uuid", "title": "Authentication Flow", "score": 0.95 }], "meta": { "total": 3, "mode": "hybrid" } }
```

**POST /ai/query**
```json
// Request
{ "workspace_id": "uuid", "question": "What are the key architectural decisions in Project Alpha?", "limit": 8 }
// Response
{ "data": { "answer": "Project Alpha uses a microservices architecture with...", "sources": [{ "title": "...", "content": "..." }] } }
```

**AI Pipeline:** Question → Context Builder → Retriever → Inference Runtime → Multi-Agent Runtime → Safety Layer → Tool Runtime → Gnovium APIs → Workspace

---

### 🕸️ Graph Module (5 endpoints)

The visual knowledge graph — materialized, queryable, traversable.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/graph/` | Access | Get latest materialized graph |
| `POST` | `/graph/materialize` | Access | Build graph snapshot (full rebuild on first call or schema change; subsequent calls apply incremental diffs) |
| `POST` | `/graph/query` | Access | Query filtered nodes and edges |
| `POST` | `/graph/traverse` | Access | BFS traversal from center node |
| `POST` | `/graph/paths` | Access | Find shortest path between two nodes |

**POST /graph/query**
```json
// Request
{ "workspace_id": "uuid", "relation_types": ["refers_to", "depends_on"], "entity_type_ids": ["uuid"], "limit": 200 }
// Response
{ "data": { "nodes": [...], "edges": [...], "node_count": 12, "edge_count": 18 } }
```

**POST /graph/traverse**
```json
// Request
{ "workspace_id": "uuid", "center_node": "uuid", "depth": 2, "relation_types": ["refers_to"] }
// Response
{ "data": { "center_node": "uuid", "depth": 2, "nodes": [...], "edges": [...], "node_count": 5, "edge_count": 4 } }
```

**POST /graph/paths**
```json
// Request
{ "workspace_id": "uuid", "source_entity_id": "uuid", "target_entity_id": "uuid" }
// Response
{ "data": { "source": "uuid", "target": "uuid", "path": ["uuid", "uuid", "uuid"], "distance": 2 } }
```

---

### 🔀 Versions Module (9 endpoints)

Workspace versioning — snapshots, changesets, and entity history.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/versions/changesets` | Access | List changesets |
| `POST` | `/versions/changesets` | Access | Create changeset |
| `GET` | `/versions/snapshots` | Access | List snapshots |
| `POST` | `/versions/snapshots` | Access | Create snapshot |
| `POST` | `/versions/entities/<entity_id>/snapshot` | Access | Snapshot a specific entity |
| `GET` | `/versions/entities/<entity_id>` | Access | Get entity version history |
| `GET` | `/versions/blocks/<block_id>` | Access | Get block version history |
| `GET` | `/versions/compare` | Access | Compare two versions |
| `POST` | `/versions/restore/<version_id>` | Access | Restore entity to version |

**POST /versions/**
```json
// Request
{ "branch_id": "uuid", "message": "Added new sections to the research doc" }
// Response 201
{ "data": { "id": "uuid", "message": "...", "created_at": "..." } }
```

---

<!-- Snapshots folded into Versions module above -->

### 🌿 Branches Module (6 endpoints)

Git-inspired branching for fearless experimentation.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/branches/` | Access | Create branch |
| `GET` | `/branches/` | Access | List branches |
| `GET` | `/branches/<id>` | Access | Get branch details |
| `DELETE` | `/branches/<id>` | Access | Delete branch |
| `POST` | `/branches/<id>/merge` | Access | Merge branch into target |
| `POST` | `/branches/merge` | Access | Merge two branches directly |

**POST /branches/**
```json
// Request
{ "workspace_id": "uuid", "name": "feature/new-editor", "parent_branch_id": "uuid", "description": "Experimenting with a new block editor" }
```

**POST /branches/<id>/merge**
```json
// Request
{ "target_branch_id": "uuid" }
```

---

### 👁 Diffs Module (1 endpoint)

Visual comparison between versions, snapshots, and branches.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/diffs/compare` | Access | Compare two snapshots or branches |

**POST /diffs/compare**
```json
// Compare snapshots
{ "left_snapshot_id": "uuid", "right_snapshot_id": "uuid" }
// Or compare branches
{ "left_branch_id": "uuid", "right_branch_id": "uuid" }
// Response
{ "data": [{ "type": "added", "entity_id": "...", "block_id": "...", "content": {...} }, ...] }
```

---

### 🩺 Governance Module (5 endpoints)

Workspace health — detect duplicates, orphans, stale content, and calculate a health score. Analysis runs as background jobs with tiered processing: cheap checks (duplicate titles) execute inline; expensive analysis (full content similarity, stale detection) is delegated to async workers.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/governance/health` | Access | Get workspace health score |
| `GET` | `/governance/duplicates` | Access | Find duplicate entities |
| `GET` | `/governance/orphans` | Access | Find orphaned entities |
| `GET` | `/governance/stale` | Access | Find stale content (90+ days) |
| `POST` | `/governance/health-score` | Access | Recalculate and store health score |

**Health Score Formula:**
```
score = max(0, 100 - min(70, duplicates×5 + orphans×2 + stale))
```
- **90-100:** Excellent 🟢
- **70-89:** Needs attention 🟡
- **Below 70:** Requires cleanup 🔴

---

### 📊 Dashboard Module (1 endpoint)

At-a-glance workspace overview with entity, block, relation counts and recent activity.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/dashboard/overview` | Access | Workspace overview dashboard |

---

### 💬 Comments Module (5 endpoints)

Threaded discussions on entities and blocks.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/comments/` | Access | Create a comment |
| `GET` | `/comments/` | Access | List comments |
| `GET` | `/comments/<id>` | Access | Get comment details |
| `PATCH` | `/comments/<id>` | Access | Update comment |
| `DELETE` | `/comments/<id>` | Access | Soft-delete comment |

---

### 🔔 Notifications Module (3 endpoints)

User notifications for workspace events.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/notifications/` | Access | List notifications |
| `POST` | `/notifications/` | Access | Create a notification |
| `POST` | `/notifications/<id>/read` | Access | Mark as read |

**Notification types:** `mention`, `comment`, `update`, `invite`, `system`

---

### ⚡ Jobs Module (4 endpoints)

Asynchronous job tracking for long-running operations. **Cloud only.**

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/jobs/` | Access | List jobs |
| `POST` | `/jobs/` | Access | Create a job |
| `POST` | `/jobs/<id>/running` | Access | Mark job as running |
| `POST` | `/jobs/<id>/completed` | Access | Mark job as completed |

---

### 🔄 Sync Module (7 endpoints)

Offline sync operations — queue, ingest, diff, apply, and acknowledge changes. Uses a Git-style operation log (ordered append-only changesets with server-side conflict resolution) rather than CRDTs — chosen for simplicity and predictable merge semantics in a workspace-oriented data model.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/sync/` | Access | List sync operations |
| `POST` | `/sync/` | Access | Ingest a sync operation |
| `GET` | `/sync/<id>` | Access | Get sync operation details |
| `POST` | `/sync/<id>/ack` | Access | Acknowledge sync complete |
| `POST` | `/sync/diff` | Access | Compare local vs remote export; returns missing records |
| `POST` | `/sync/apply-diff` | Access | Apply missing remote records to local workspace |
| `POST` | `/sync/sync-from-export` | Access | Full differential import from remote export data |

**Operation types:** `entity_create`, `entity_update`, `entity_delete`, `block_create`, `block_update`, `block_delete`, `relation_create`, `relation_delete`

---

### 📜 Activity Module (1 endpoint)

Audit trail of workspace events.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/activity/` | Access | List activity log |

**Query params:** `workspace_id` (required), `page`, `per_page`

---

### 💾 Backups Module (3 endpoints)

Export and import workspace data for migration and safekeeping.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/backups/export` | Access | Export workspace as JSON |
| `POST` | `/backups/export-to-disk` | Access | Export workspace to local disk |
| `POST` | `/backups/import` | Access | Import workspace from JSON |

**POST /backups/export**
```json
// Request
{ "workspace_id": "uuid" }
// Response 200
{ "data": { "entities": [...], "blocks": [...], "relations": [...], "tags": [...], "branches": [...], "versions": [...] } }
```

---

### 🏥 System Module (1 endpoint)

Health checks.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/health` | — | Liveness check (no auth) |

**GET /health**
```json
// Response 200
{ "status": "healthy" }
```

---

### API Route Summary

| Module | Routes | Category | Deployment |
|--------|:------:|----------|------------|
| Health | 1 | 🏥 System Health | Both |
| Auth | 8 | 🔐 Authentication | Cloud only |
| Workspaces | 6 | 📂 Workspace Management | Both |
| Entities | 15 | 📄 Page/Entity Management | Both |
| Blocks | 8 | 🧱 Block Content | Both |
| Relations | 8 | 🔗 Knowledge Connections | Both |
| Comments | 5 | 💬 Discussion | Both |
| Tags | 7 | 🏷️ Classification | Both |
| Branches | 6 | 🌿 Branching | Both |
| Versions | 9 | 🔀 Versioning | Both |
| Diffs | 1 | 👁 Visual Diff | Both |
| Search | 1 | 🔍 Search | Pending |
| AI | 1 | 🤖 AI Assistant | Pending |
| Files | 9 | 📎 File Management | Both (presign cloud-only) |
| Graph | 5 | 🕸️ Knowledge Graph | Both |
| Governance | 5 | 🩺 Health & Quality | Pending |
| Dashboard | 1 | 📊 Analytics | Both |
| Notifications | 3 | 🔔 Alerts | Both |
| Jobs | 4 | ⚡ Async Operations | Cloud only |
| Sync | 7 | 🔄 Offline Sync | Both |
| Activity | 1 | 📜 Audit Trail | Both |
| Backups | 3 | 💾 Data Portability | Both |
| **Total** | **114** | **22 Modules** | **95 both + 12 cloud-only + 7 pending** |

<br />

---

<br />

## 🚀 QUICK START

<br />

### Prerequisites

- Python 3.10+
- pip
- (Optional) AI Inference Runtime for local AI

### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/GauravKaloliya/GNOVIUM.git
cd GNOVIUM

# Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Configuration

```bash
# Navigate to backend
cd backend

# Configure environment (copy defaults)
cp .env.local .env
# Or for cloud mode: cp .env.cloud .env

# Default .env.local:
# GNOVIUM_MODE=local
# SECRET_KEY=dev-secret-key-change-in-production
# DATABASE_URL=sqlite:///instance/gnovium.db
```

### 3. (Optional) Set Up Local AI

```bash
# Ensure the Inference Runtime is configured
# Default: uses the local GPU-native runtime (CUDA)
# Practical MVP backends (llama.cpp, ONNX Runtime, TensorRT-LLM) are supported day one
# For cloud inference, set GNOVIUM_MODE=cloud
```

### 4. Run the Server

```bash
# From the backend directory
GNOVIUM_MODE=local python run.py

# The server starts at http://localhost:5001
# Health check: GET http://localhost:5001/health
```

### 5. Verify It Works

```bash
# Health check
curl http://localhost:5001/health

# Auth endpoints (register, login, etc.) are cloud-only.
# In local mode, set a fixed test token:
TOKEN="dev-test-token"

# List seed workspace
curl http://localhost:5001/api/v1/workspaces/ \
  -H "Authorization: Bearer $TOKEN"

# Create an entity
curl -X POST http://localhost:5001/api/v1/entities/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id":"00000000-0000-0000-0000-000000000001","title":"Research Notes","entity_type_id":"00000000-0000-0000-0000-000000000002"}'

# Add a block
curl -X POST http://localhost:5001/api/v1/blocks/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id":"<ENTITY_ID>","block_type":"text","content":{"text":"Hello Gnovium!"}}'
```

> **Cloud mode** starts with `GNOVIUM_MODE=cloud`. Auth endpoints are then available at the cloud API (e.g. `https://api.gnovium.com/api/v1/auth/register`).

### 7. Run Tests

```bash
# From the backend directory
pytest tests/ -v

# Expected: all tests passing
```

<br />

---

<br />



---

<br />

## 🗺 ROADMAP

<br />

| Version | Type | Focus | Key Features | Status |
|---------|------|-------|-------------|--------|
| **v0.5.0** | Beta | Developer Preview | Entity CRUD, Block CRUD, Relations, Basic Graph, Files, Notifications (28 endpoints, 7 modules) | ✅ Shipped |
| **v0.9.0** | Beta | Beta Preview | Tags, Comments, Activity, Jobs, Rate Limiting, Standardized response envelope (72 endpoints, 18 modules) | ✅ Shipped |
| **v1.0.0** | Major | **MVP Release** | All 22 modules, 106 endpoints, 75 routes, full feature set, JWT auth, Graph engine, AI search, Governance, Versioning | ✅ Shipped |
| **v1.0.1** | Patch | API Specification | OpenAPI 3.0.3 spec, Error catalog (17 codes), Auth guide (OAuth2 PKCE, API keys, PATs), CORS guide, 6-theme neo-brutalist docs | ✅ Current |
| **v1.1.0** | Minor | Cloud Mode Beta | NeonDB (PostgreSQL), S3 storage, Redis caching, GNOVIUM_MODE env var, Presigned URLs, Workspace sync | 🔜 Jul 2026 |
| **v2.0.0** | Major | Cloud Sync | Real-time WebSocket sync, Multi-user collaboration, Shared workspaces, Role-based access, Automatic backups, API v2 migration | 🔜 Q4 2026 |
| **v3.0.0** | Major | Digital Twin | Organizational Digital Twin, Multi-Agent System, Knowledge Evolution Engine, Autonomous pattern discovery | 🔜 Future |
| **v4.0.0** | Major | Autonomous AI | AI Branch Simulation, Strategic Forecasting, Autonomous Governance Agent, Predictive knowledge modeling | 🔜 Future |

### Version Tracking

| Version | Status | Release | End of Life | Endpoints | Modules |
|---------|--------|---------|-------------|-----------|---------|
| v1.0.1 | **Current** | Jun 22, 2026 | Dec 2027 | 114 | 22 |
| v1.0.0 | Superseded | Jun 2026 | — | 106 | 22 |
| v1.1.0 | Planned | Jul 2026 | Jun 2028 | ~120 | ~26 |
| v2.0.0 | Planned | Q4 2026 | Jun 2029 | ~150 | ~30 |

<br />

---

<br />

## 🎯 SUCCESS CRITERIA

<br />

The MVP will be considered successful if users can:

| # | Criterion | How To Verify |
|---|-----------|---------------|
| 1 | **Create and organize knowledge efficiently** | Create entities with blocks, organize with hierarchy, use custom types |
| 2 | **Connect information through relations** | Create typed relations between entities, view backlinks, navigate connections |
| 3 | **Navigate knowledge visually** | Use the graph API to query, traverse, and find paths in the knowledge graph |
| 4 | **Search knowledge using AI** | Use semantic search and AI Q&A to find information across the workspace |
| 5 | **Create and compare workspace branches** | Fork workspace into branches, make independent changes, merge back |
| 6 | **Restore previous versions** | View version history, restore entity to any previous state, use snapshots |
| 7 | **Improve workspace health** | Run governance checks, identify duplicates and orphans, track health score |

### Non-MVP Features (Future Releases)

These capabilities are intentionally excluded from the MVP and reserved for future versions:

**Version 2 — Cloud Mode Enhancements:**
- Multi-user real-time collaboration
- WebSocket-based sync
- Shared workspaces with role-based access
- Managed hosting infrastructure
- Automatic scheduled backups
- API base URL migration to /api/v2

**Version 3 — Organizational Intelligence:**
- Organizational Digital Twin
- Multi-Agent System for autonomous knowledge management
- Knowledge Evolution Engine — automatic pattern discovery and relationship suggestions
- Advanced analytics and forecasting

**Version 4 — Autonomous AI:**
- AI Branch Simulation — predict outcomes of knowledge changes
- Strategic Forecasting — AI-powered knowledge gap analysis
- Autonomous Governance Agent — self-healing workspace maintenance
- Predictive knowledge modeling

<br />

---

<br />

## EXPECTED OUTCOME

<br />

The MVP demonstrates that knowledge can be managed as a **connected, versioned, and evolvable system** rather than a collection of isolated documents. It establishes the technical and conceptual foundation for Gnovium's long-term vision as a **Knowledge Operating System**.

**By delivering this MVP, we prove that:**

- ✅ Knowledge can be block-based, relational, and graph-navigable simultaneously
- ✅ Version control principles (branches, snapshots, diffs) apply meaningfully to knowledge work
- ✅ Local-first AI (Inference Runtime) can provide intelligent retrieval without compromising privacy
- ✅ A single knowledge model can span local and cloud deployments without friction
- ✅ Workspace governance can be automated and measured
- ✅ The foundation is solid for the multi-agent, autonomous knowledge future

> **Gnovium is not a note-taking app. It is the infrastructure layer for how humans and machines will interact with knowledge in the AI era.**

<br />

---

<br />

## 📖 DOCUMENTATION

<br />

| Resource | Location | Description |
|----------|----------|-------------|
| **OpenAPI Specification (JSON)** | [`public/openapi.json`](docs/public/openapi.json) | Complete 3.0.3 spec: 114 operations, 83 paths, 9 schemas, 3 security schemes |
| **OpenAPI Specification (YAML)** | [`public/openapi.yaml`](docs/public/openapi.yaml) | Same spec in YAML format |
| **API Reference (Markdown)** | [`backend/API.md`](backend/API.md) | 2279-line detailed API reference with request/response examples |
| **Error Catalog** | [`src/data/error-catalog.ts`](docs/src/data/error-catalog.ts) | 17 standardized error codes with causes, resolutions, and JSON examples |
| **Auth Guide** | [`src/data/auth-guide.ts`](docs/src/data/auth-guide.ts) | OAuth2 PKCE, API Keys, PATs, Rate Limits, CORS |
| **API Changelog** | [`/changelog`](docs/src/app/changelog) | Full version history with migration paths |
| **Documentation Site** | `docs/` | Neo-brutalist Next.js docs with 6 themes, mobile support, search palette |
| **SQLite Schema** | [`backend/SQLITE_SCHEMA.sql`](backend/SQLITE_SCHEMA.sql) | Complete database schema for local mode |
| **PostgreSQL Schema** | [`backend/POSTGRESQL_SCHEMA.sql`](backend/POSTGRESQL_SCHEMA.sql) | Complete database schema for cloud mode |

<br />

---

<br />

## 🤝 CONTRIBUTING

<br />

Gnovium is an open-source project built for the community. Contributions are welcome!

### Ways to Contribute

- **Report bugs** — Open an issue with reproduction steps
- **Suggest features** — Open a feature request with use case
- **Improve docs** — Submit PRs for documentation improvements
- **Write tests** — Increase test coverage
- **Fix issues** — Pick an open issue and submit a PR

### Development Setup

```bash
git clone https://github.com/GauravKaloliya/GNOVIUM.git
cd GNOVIUM
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
GNOVIUM_MODE=local python backend/run.py
```

### Code Style

- Python: Follow PEP 8, type hints required
- TypeScript: Follow existing patterns, strict mode
- Commits: Use conventional commit format (`feat:`, `fix:`, `docs:`, etc.)

<br />

---

<br />

## 📄 LICENSE

<br />

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br />

---

<br />

## 🙏 ACKNOWLEDGMENTS

<br />

Built with ❤️ by **[Gaurav Kaloliya](https://www.linkedin.com/in/gaurav-kaloliya-b44569417)**

- **AI:** Powered by the Gnovium Inference Runtime — GPU-native local inference
- **Docs:** Built with [Next.js](https://nextjs.org), [TailwindCSS](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion/)
- **Backend:** Powered by [Flask](https://flask.palletsprojects.com), [SQLAlchemy](https://www.sqlalchemy.org)
- **Deployment:** Hosted on [Vercel](https://vercel.com) (docs) and [Neon](https://neon.tech) (cloud DB)
- **Icons:** [Lucide](https://lucide.dev) icon system
- **Fonts:** [Geist](https://vercel.com/font) by Vercel

<br />

---

<br />

<div align="center">

```
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║           KNOWLEDGE THAT GROWS WITH YOU                              ║
║                                                                      ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   ║
║                                                                      ║
║    114 ENDPOINTS · 83 ROUTES · 22 MODULES · 2 DEPLOYMENT MODES      ║
║                                                                      ║
║    Start local. Scale when you're ready.                             ║
║    No migration. No lock-in.                                         ║
║    Just knowledge that grows with you.                               ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

**[Gaurav Kaloliya](https://www.linkedin.com/in/gaurav-kaloliya-b44569417)** ·
**Built with ❤️ for knowledge workers everywhere**

<br />

[![LinkedIn](https://img.shields.io/badge/-GAURAV_KALOLIYA-000?style=for-the-badge&logo=linkedin&labelColor=white)](https://www.linkedin.com/in/gaurav-kaloliya-b44569417)
[![GitHub](https://img.shields.io/badge/-GNOVIUM-000?style=for-the-badge&logo=github&labelColor=white)](https://github.com/GauravKaloliya/GNOVIUM)
[![Website](https://img.shields.io/badge/-WEBSITE-000?style=for-the-badge&logo=vercel&labelColor=white)](https://gnovium.vercel.app)

<br />

**⭐ Star this repo if you believe knowledge should be alive. ⭐**

</div>
