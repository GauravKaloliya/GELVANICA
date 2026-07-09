# Gnovium MVP (Version 1) Project Overview

Gnovium MVP is a knowledge management platform that supports both Local Mode and Cloud Mode using the same knowledge model, workflows, and user experience.

By default, Gnovium runs entirely on the user's device with offline-first storage, local AI capabilities, and complete data ownership. When collaboration, synchronization, and managed infrastructure are needed, users can switch to Cloud Mode without migrating their data or changing workflows.

Gnovium combines block-based editing, relational knowledge management, visual knowledge graphs, workspace versioning, and AI-assisted knowledge discovery within a unified workspace.

The MVP focuses on solving three fundamental problems:

1. Knowledge fragmentation
2. Loss of context and relationships
3. Lack of safe experimentation in knowledge systems

Rather than building a complete Knowledge Operating System, the MVP validates the core concepts that will serve as the foundation for future organizational intelligence capabilities.

## MVP Objectives

The MVP aims to:

- Provide a modern block-based workspace.
- Support structured relational knowledge management.
- Visualize knowledge relationships through an interactive graph.
- Introduce Git-inspired versioning for knowledge work.
- Enable AI-powered workspace search and question answering.
- Provide workspace health insights through governance checks.
- Support Local Mode as the default deployment model.
- Maintain compatibility with future Cloud Mode deployments.
- Operate offline-first in Local Mode.
- Preserve the same knowledge model across deployment modes.

## Deployment Modes

### 🖥 Local Mode (Default)

Your knowledge stays yours.

Run Gnovium entirely on your device with:

- SQLite storage
- Offline-first operation
- Custom GPU-Native Inference Runtime
- Zero setup
- Full data ownership
- Instant performance

Environment:
```
GNOVIUM_MODE=local
```

Ideal for:

- Personal knowledge bases
- Research
- Learning
- Privacy-first workflows

### ☁️ Cloud Mode

Transform personal knowledge into shared intelligence.

Enable:

- Workspace synchronization
- Team collaboration
- Automatic backups
- Managed infrastructure
- Multi-device access

Environment:
```
GNOVIUM_MODE=cloud
```

Cloud Mode preserves the same knowledge model, workflows, and experience while adding collaboration and synchronization capabilities.

> Start local. Scale when you're ready.
> No migration. No lock-in.
> Just knowledge that grows with you.

## Core MVP Features

### 1. 🧱 Block-Based Workspace

The fundamental building block of Gnovium. Every entity (page) contains blocks — modular content units that can be arranged, nested, and reordered.

#### Block Types

| Block Type | Description | Content Shape |
|------------|-------------|---------------|
| `text` | Plain paragraph | `{"text": "..."}` |
| `heading_1` | Large heading | `{"text": "..."}` |
| `heading_2` | Medium heading | `{"text": "..."}` |
| `heading_3` | Small heading | `{"text": "..."}` |
| `bulleted_list` | Bullet point | `{"text": "..."}` |
| `numbered_list` | Numbered item | `{"text": "..."}` |
| `to_do` | Checkbox item | `{"text": "...", "checked": false}` |
| `code` | Code block | `{"text": "...", "language": "python"}` |
| `quote` | Block quote | `{"text": "..."}` |
| `callout` | Highlighted note | `{"text": "...", "icon": "..."}` |
| `image` | Embedded image | `{"url": "...", "alt": "..."}` |
| `divider` | Horizontal rule | `{}` |
| `table` | Data table | `{"rows": [...], "cols": [...]}` |

#### Features

- Rich text editing with formatting
- Nested pages (parent-child entity hierarchy)
- Position-based block ordering
- Batch reorder via dedicated endpoint
- Move blocks between parents
- Soft delete with restore

### 2. 🔗 Relational Knowledge System

Transform isolated notes into connected knowledge through typed relations, backlinks, tags, and custom properties.

#### Features

| Feature | Description |
|---------|-------------|
| **Custom Entity Types** | Define your own types with custom property schemas |
| **Custom Properties** | Per-type property definitions (text, number, select, multi_select, date, boolean, url) |
| **Tags** | Lightweight labels for cross-cutting classification |
| **Typed Relations** | Directed edges between entities (`refers_to`, `depends_on`, `part_of`, `related_to`, `implements`, `extends`) |
| **Backlinks** | Automatic "who links to me" view for every entity |

### 3. 🕸 Visual Knowledge Graph

See your knowledge as a living network. The graph view visualizes entities as nodes and relations as edges.

#### Graph API Operations

| Operation | Description |
|-----------|-------------|
| `GET /graph/` | Get latest materialized graph snapshot |
| `POST /graph/materialize` | Build fresh graph from current data (full rebuild kept for recovery/debug) |
| `POST /graph/query` | Query filtered nodes and edges |
| `POST /graph/traverse` | BFS traversal from center node (depth ≤ 5) |
| `POST /graph/paths` | Shortest path between two entities |

**Scalability Note:** Graph materialization supports incremental updates and cached snapshots for larger workspaces. Heavy recomputations run asynchronously where possible.

### 4. 🔀 Versioning System

> **Canonical reference.** This section is the single source of truth for Gnovium's versioning system. All other documentation derives from this specification.

Git-inspired versioning for knowledge work — the same capabilities Git gave code, applied to knowledge structures.

#### Philosophy

Allow **experimentation without risk**. Users can explore alternative knowledge structures, make sweeping changes, or test AI-generated content — all with the safety net of versioning.

#### User Experience Flow

```
Page History → Snapshots → Branches → Diffs
```

Every interaction follows this progression: view an entity's edit history, capture workspace-wide snapshots, fork into experimental branches, and compare any state with visual diffs.

#### Dual-Mode Architecture

| Mode | Implementation | Storage |
|------|---------------|---------|
| **Local** | Append-only blocks | Every block update creates a new row (composite PK: `id + branch_id + created_at`). Full history preserved without separate version tables. Equivalent to an infinite undo log. |
| **Cloud** | Changesets + Snapshots | Full version control with entity snapshots, changesets (JSONB deltas), visual diffs, and explicit version management via `entity_versions`, `block_versions`, `changesets`, and `snapshots` tables. |

**Same user experience across modes. Different implementation under the hood.**  
Sync follows a Git-like model (deterministic history + merges) rather than real-time CRDTs. This choice enables explicit versioning, branching workflows, and clean conflict resolution — the same model developers rely on for code — rather than eventual-consistency heuristics.

#### Core Concepts

| Concept | Description | Modes |
|---------|-------------|-------|
| **Page History** | Automatic version creation on entity updates. View, restore, and compare past states of any entity. | Both |
| **Snapshots** | Point-in-time captures of entire workspace state. Create, compare, restore, or delete. | Both |
| **Branches** | Fork workspace into independent lines of development. Merge with conflict resolution. | Both |
| **Diffs** | Visual comparison (green=added, red=deleted, amber=modified). Multi-level: block, entity, snapshot, or branch. | Cloud only |

#### API Endpoints

9 versioning endpoints, all cloud-only. See [Versions Module](#versions) in the API reference and `backend/API.md` for request/response schemas.

### 6. 🤖 AI Workspace Assistant

Intelligent retrieval powered by the local Inference Runtime or cloud AI.

#### Features

| Feature | Description |
|---------|-------------|
| **Workspace-wide search** | Full-text, semantic, and hybrid search modes |
| **Natural language Q&A** | Ask questions, get answers grounded in your knowledge |
| **Summarization** | Generate concise summaries of entities and content |
| **Related page recommendations** | AI-powered content discovery |

#### Search Modes

| Mode | Description | Backend |
|------|-------------|---------|
| Keyword Search | Simple text match on title and content | SQLite FTS / PostgreSQL tsvector |
| Full-text Search | Advanced full-text search with ranking | PostgreSQL only |
| Hybrid Search | Combines keyword + semantic (default) | Both |
| Semantic Search | Embedding-based vector similarity | Inference Runtime / Cloud |

### 7. 📊 Governance Dashboard

Workspace health monitoring and quality management.

#### Features

| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Health Score** | Overall workspace quality (0-100) | `GET /governance/health` |
| **Duplicate Detection** | Find entities with identical/similar titles | `GET /governance/duplicates` |
| **Orphan Detection** | Identify entities with zero connections | `GET /governance/orphans` |
| **Stale Content Detection** | Find entities not updated in 90+ days | `GET /governance/stale` |
| **Comprehensive Reports** | Full governance report with findings | `POST /governance/health-score` |

**Implementation Note:** Heavy checks (e.g. duplicate detection, semantic similarity) run as **background jobs** with cached results. Lightweight checks (orphans, broken relations) remain on-demand. Moderate checks (stale content) are periodic.

#### Health Score Formula

```
score = max(0, 100 - penalty)
penalty = min(70, duplicates × 5 + orphans × 2 + stale)
```

| Score Range | Status |
|-------------|--------|
| **90-100** | Excellent — workspace is healthy |
| **70-89** | Needs attention — some cleanup required |
| **Below 70** | Requires cleanup — significant issues |

## System Architecture

### Frontend

**Technology:** React, Next.js, TailwindCSS

**Responsibilities:** Editor, Graph UI, Dashboard, Versioning UI

### Backend

**Technology:** Flask

**Responsibilities:**
- REST API Layer
- Knowledge Services
- Search & Retrieval
- Graph Management (incremental + cached)
- Version Management
- AI Orchestration
- File Management
- Governance Services (background jobs)
- Synchronization Services (Cloud Mode)

### Database

| Mode | Database |
|------|----------|
| Local Mode | SQLite |
| Cloud Mode (Future) | PostgreSQL |

**Design Principle:** Both deployment modes use the same data model and API contracts.

### Cloud Synchronization

The following resources are synchronized between local and cloud instances:

| Resource | Sync Direction | Notes |
|----------|---------------|-------|
| Workspaces | Bidirectional | Full metadata + settings |
| Pages / Entities | Bidirectional | Content + properties |
| Blocks | Bidirectional | Position, type, content |
| Relations | Bidirectional | Typed edges with metadata |
| Branches | Bidirectional | Branch structure + heads |
| Versions | Local → Cloud | Append-only history published to cloud |
| Embeddings | Local → Cloud | Vector representations |
| Graph Metadata | Bidirectional | Materialized graph snapshots |
| Files (metadata) | Bidirectional | File records; bytes stored per mode |
| Settings | Bidirectional | Workspace + user preferences |

### Top-level System Architecture

```
                User
                 |
          React + Next.js Frontend
                 |
            Flask Backend API
                 |
      +----------+----------+
      |                     |
 Knowledge Services     Inference Runtime
      |                     |
   Graph Engine         AI Services (Embeddings, Retrieval)
      |                     |
 SQLite / PostgreSQL   Vector Store + GPU-Native Tensor Engine
```

### AI Layer

**Technology:**
- **Inference Runtime:** Custom GPU-Native Tensor Engine + CUDA Kernels, KV Cache Manager + basic Flash Attention, Tokenizer, Sampling, Model Loader. The runtime supports multiple instruction-tuned SLMs; recommended models evolve as the ecosystem advances. Practical MVP backends (llama.cpp, ONNX Runtime, TensorRT-LLM) provide a working AI subsystem day one; the custom GPU-native runtime remains the long-term differentiator.
- **Agent Runtime:** Supervisor + Planner + Worker Agents with **staged safety pipeline** (Policy Validator, Permission Validator, Simulation, Diff, User Approval)

**AI Services:**
- Embedding Generation + Vector Indexing
- Semantic Retrieval + Graph Retrieval
- Q&A, Summarization, Recommendations
- Tool Calling (with safety gates — read-only tools bypass the approval stage; destructive operations require explicit confirmation)

**Mode-Specific Execution:**

| Mode | Inference | Agents | Storage |
|------|-----------|--------|---------|
| Local | Gnovium GPU-native runtime (CUDA, on-device) | All agents run locally | SQLite + local vector store |
| Cloud | Cloud inference runtime (managed GPU) | Agents can coordinate across users | PostgreSQL + pgvector |

## Data Model

### Entity (Page)

```
Entity
├── id: UUID (primary key)
├── workspace_id: UUID (FK → workspaces)
├── entity_type_id: UUID (FK → entity_types)
├── title: String
├── icon: String (emoji or icon name)
├── cover_image: String (URL, nullable)
├── is_archived: Boolean
├── archived_at: DateTime (nullable, local mode)
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
├── deleted_by: UUID (FK → users, nullable)
├── created_by: UUID (FK → users)
├── created_at: DateTime
└── updated_at: DateTime
```

Note: Custom property values are stored in the `entity_property_values` table, not as a JSONB column on entities. Parent-child entity relationships use the `relations` table with `relation_type = 'part_of'`.

### Block

**Local mode** (append-only — composite PK preserves every version):
```
Block
├── id: UUID
├── entity_id: UUID (FK → entities)
├── branch_id: String (default: 'main')
├── parent_block_id: UUID (nullable)
├── block_type: String
├── content: JSONB
├── position: Float
├── indent: Integer (default: 0)
├── content_hash: String
├── created_at: DateTime
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
├── deleted_by: UUID (FK → users, nullable)
└── PRIMARY KEY (id, branch_id, created_at)
```

**Cloud mode** (mutable — versioning via `entity_versions`/`block_versions` tables):
```
Block
├── id: UUID (primary key)
├── entity_id: UUID (FK → entities)
├── parent_block_id: UUID (FK → blocks, nullable)
├── block_type: String
├── content: JSONB
├── position: Numeric(20,10)
├── created_at: DateTime
├── updated_at: DateTime
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
└── deleted_by: UUID (FK → users, nullable)
```

### Relation

```
Relation
├── id: UUID (primary key)
├── workspace_id: UUID (FK → workspaces)
├── source_entity_id: UUID (FK → entities)
├── target_entity_id: UUID (FK → entities)
├── relation_type: Enum
├── metadata: JSONB
├── created_by: UUID (FK → users, nullable)
├── created_at: DateTime
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
└── deleted_by: UUID (FK → users, nullable)
```

### Version (Changeset)

Cloud-only. The actual entity/block state at a changeset point is stored in `entity_versions` and `block_versions` tables.

```
Changeset
├── id: UUID (primary key)
├── branch_id: UUID (FK → branches)
├── snapshot_id: UUID (FK → snapshots, nullable)
├── message: String
├── created_by: UUID (FK → users)
├── created_at: DateTime
```

### Snapshot

```
Snapshot
├── id: UUID (primary key)
├── branch_id: UUID (FK → branches)
├── name: String
├── description: Text (nullable)
├── created_by: UUID (FK → users, nullable)
├── created_at: DateTime
```

Snapshot block membership is stored in the `snapshot_blocks` table (`snapshot_id`, `block_id`, `block_created_at`, `entity_id`).

### Branch

```
Branch
├── id: UUID (primary key)
├── workspace_id: UUID (FK → workspaces)
├── name: String
├── parent_branch_id: UUID (FK → branches, nullable)
├── description: Text (nullable)
├── is_default: Boolean
├── is_deleted: Boolean
├── created_at: DateTime
└── updated_at: DateTime
```

### Tag

```
Tag
├── id: UUID (primary key)
├── workspace_id: UUID (FK → workspaces)
├── name: String
├── color: String (hex, nullable)
├── created_at: DateTime
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
└── deleted_by: UUID (FK → users, nullable)
```

### Entity Type

```
EntityType
├── id: UUID (primary key)
├── workspace_id: UUID (FK → workspaces)
├── name: String
├── icon: String
├── config: JSONB
├── created_at: DateTime
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
└── deleted_by: UUID (FK → users, nullable)
```

### Property Definition

```
Property
├── id: UUID (primary key)
├── workspace_id: UUID (FK → workspaces)
├── entity_type_id: UUID (FK → entity_types, nullable)
├── name: String
├── property_type: String
├── config: JSONB
├── created_at: DateTime
├── is_deleted: Boolean
├── deleted_at: DateTime (nullable)
└── deleted_by: UUID (FK → users, nullable)
```

## MVP User Flow

```
START
  |
  v
+---------------------------------------------+
| 1. CREATE KNOWLEDGE                         |
| User creates pages and blocks               |
+--------------------+------------------------+
                     |
                     v
+---------------------------------------------+
| 2. CONNECT KNOWLEDGE                        |
| User creates relations, tags, properties    |
+--------------------+------------------------+
                     |
                     v
+---------------------------------------------+
| 3. EXPLORE KNOWLEDGE                        |
| Graph view, queries, traversal, paths       |
+--------------------+------------------------+
                     |
                     v
+---------------------------------------------+
| 4. ASK QUESTIONS                            |
| AI assistant, semantic search, Q&A          |
+--------------------+------------------------+
                     |
                     v
+---------------------------------------------+
| 5. EXPERIMENT SAFELY                        |
| Branches, snapshots, independent edits      |
+--------------------+------------------------+
                     |
                     v
+---------------------------------------------+
| 6. COMPARE CHANGES                          |
| Diff viewer, version comparison, merge      |
+--------------------+------------------------+
                     |
                     v
+---------------------------------------------+
| 7. IMPROVE WORKSPACE                        |
| Governance dashboard, health score          |
+--------------------+------------------------+
                     |
                     v
                  REPEAT
```

## Success Criteria

### Engineering Success Criteria (Updated)

- Custom GPU-native inference runtime operational in Local Mode (with modern SLM support)
- **Multi-agent system with staged safety pipeline** (Supervisor + Workers + Policy/Permission/Simulation/Diff/Approval)
- Dual-mode architecture (Local ↔ Cloud) validated
- Tool runtime and AI orchestration functional
- Local-first AI with vector storage and synchronization working
- Graph materialization supports incremental/cached updates
- Governance checks use background/tiered processing

## Expected Outcome

The MVP demonstrates that knowledge can be managed as a connected, versioned, and evolvable system rather than a collection of isolated documents. It establishes the technical and conceptual foundation for Gnovium's long-term vision as a Knowledge Operating System.
