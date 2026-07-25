# Gnovium V1 — Complete Feature Reference

> **Source Documents:** [`gnovium_llm_multiagent_architecture.md`](./gnovium_llm_multiagent_architecture.md) · [`gnovium_mvp_context.md`](./gnovium_mvp_context.md)

---

# Part I — Non-AI Features

Core platform capabilities — workspace editing, knowledge management, versioning, visualization, and deployment. These form the foundation that AI features build upon.

---

## 1. Workspace & Editing

### 1.1 Block-Based Workspace

| Attribute | Detail |
|-----------|--------|
| **Description** | Modular content units that compose every entity (page). Blocks can be arranged, nested, and reordered freely. |
| **Block Types** | `text`, `heading_1`, `heading_2`, `heading_3`, `bulleted_list`, `numbered_list`, `to_do`, `code`, `quote`, `callout`, `image`, `divider`, `table` (14 total) |
| **Source** | MVP §1 |
| **Dependencies** | None |
| **Endpoints** | |
| | `GET /blocks/` — List blocks (optional `entity_id` filter returns blocks for that entity) |
| | `POST /blocks/` — Create a block within an entity |
| | `GET /blocks/<block_id>` — Get block by ID |
| | `PATCH /blocks/<block_id>` — Update block content, position, or type |
| | `DELETE /blocks/<block_id>` — Soft-delete a block |
| | `GET /blocks/entity/<entity_id>` — Get all current (non-deleted) blocks for an entity |

### 1.2 Rich Text Editing

| Attribute | Detail |
|-----------|--------|
| **Description** | Full rich text formatting across all text-based block types, with nested page hierarchies and position-based ordering. |
| **Capabilities** | Inline formatting, nested entities (parent-child hierarchy), float-based position ordering, batch reorder endpoint, cross-parent block moves, soft delete with restore |
| **Block Move & Reorder** | |
| | `POST /blocks/<block_id>/move` — Move a block to a new parent and position |
| | `POST /blocks/reorder` — Batch reorder blocks within an entity (accepts list of `{id, position}`) |
| **Source** | MVP §1 |
| **Dependencies** | Block-Based Workspace |

### 1.3 Threaded Comments

| Attribute | Detail |
|-----------|--------|
| **Description** | Threaded discussions on entities and blocks. Supports nested replies, edit, and soft-delete. |
| **Schema** | `Comment` table: `id`, `workspace_id`, `entity_id`, `block_id` (nullable), `parent_comment_id` (nullable — threaded replies), `author_id`, `content`, audit fields |
| **Endpoints** | 5 — Create, List, Get, Update, Soft-delete |
| **Modes** | Both |
| **Dependencies** | Workspace & Editing |

### 1.4 Workspace Management

| Attribute | Detail |
|-----------|--------|
| **Description** | Workspace lifecycle — create, list, view, update, soft-delete, and retrieve statistics for workspaces. |
| **Endpoints** | |
| | `GET /workspaces/` — List workspaces for the current user |
| | `POST /workspaces/` — Create a new workspace |
| | `GET /workspaces/<workspace_id>` — Get workspace by ID |
| | `PATCH /workspaces/<workspace_id>` — Update workspace metadata (name, description, settings) |
| | `DELETE /workspaces/<workspace_id>` — Soft-delete workspace and all entities within it |
| | `GET /workspaces/<workspace_id>/stats` — Get workspace overview statistics (entity, block, relation, comment, member counts) |
| **Modes** | Both |
| **Dependencies** | None |

### 1.5 Entity Management

| Attribute | Detail |
|-----------|--------|
| **Description** | Full entity (page) lifecycle with CRUD, type management, property management, and advanced operations. |
| **Endpoints** | |
| | `GET /entities/` — List entities (optional filters: workspace_id, entity_type_id) |
| | `POST /entities/` — Create a new entity with optional property values |
| | `GET /entities/<entity_id>` — Get entity by ID |
| | `PATCH /entities/<entity_id>` — Update entity (title, icon, cover_image, properties) |
| | `DELETE /entities/<entity_id>` — Soft-delete entity with cascade (blocks, relations, tags, files, comments, notifications) |
| | `POST /entities/<entity_id>/restore` — Restore a soft-deleted entity and its cascade |
| | `POST /entities/<entity_id>/archive` — Toggle archive flag |
| | `POST /entities/<entity_id>/duplicate` — Duplicate entity with "Copy" suffix |
| | `GET /entities/<entity_id>/children` — Get child entities (via `parent` relations) |
| | `POST /entities/<entity_id>/children` — Create a child entity under a parent |
| | `GET /entities/<entity_id>/versions` — List entity version history |
| | `POST /entities/types` — Create a new entity type |
| | `GET /entities/types` — List entity types for a workspace |
| | `POST /entities/properties` — Create a new property definition |
| | `GET /entities/properties` — List property definitions for a workspace |
| **Modes** | Both |
| **Dependencies** | Block-Based Workspace, Custom Entity Types |

---

## 2. Knowledge Management

### 2.1 Relational Knowledge System

| Attribute | Detail |
|-----------|--------|
| **Description** | Transform isolated notes into connected knowledge through typed directed edges. |
| **Relation Types** | `refers_to`, `depends_on`, `part_of`, `related_to`, `implements`, `extends` |
| **Schema** | `Relation` table: `id`, `source_entity_id`, `target_entity_id`, `relation_type`, `generated_by` (`'manual'`/`'ai'`), `verified`, `confidence` (nullable), `ai_model` (nullable), `metadata` (JSONB), audit fields |
| **AI Suggestion Engine** | AI-powered extraction of typed relations from page content on save. Confidence-triggered: ≥0.98 auto-create (optional) · 0.80–0.98 suggest for review · <0.80 ignore. Evidence: embeddings, keywords, graph topology, LLM reasoning, user correction history. Approved relations set `generated_by='ai'`, `verified=true`, `confidence`, `ai_model` as first-class columns (not buried in JSONB). Continuous maintenance re-analyses on every entity save. |
| **Endpoints** | |
| | `GET /relations/` — List relations (optional `workspace_id` filter) |
| | `POST /relations/` — Create a relation (validates no self-relation) |
| | `GET /relations/<relation_id>` — Get relation by ID |
| | `DELETE /relations/<relation_id>` — Soft-delete a relation |
| | `GET /relations/entity/<entity_id>` — Get all outgoing relations from an entity |
| | `GET /relations/backlinks/<entity_id>` — Get all incoming relations (backlinks) to an entity |
| | `GET /relations/neighbors/<entity_id>` — Get neighbor entities (graph service) |
| | `GET /relations/path` — Find shortest path between two entities |
| **Source** | MVP §2 |
| **Dependencies** | None |

### 2.2 Custom Entity Types

| Attribute | Detail |
|-----------|--------|
| **Description** | Users define their own entity types with custom property schemas. Each type has a name, icon, and config. |
| **Schema** | `EntityType` table: `id`, `workspace_id`, `name`, `icon`, `config` (JSONB), audit fields |
| **Endpoints** | |
| | `POST /entities/types` — Create a new entity type |
| | `GET /entities/types` — List entity types for a workspace |
| **Source** | MVP §2 |
| **Dependencies** | None |

### 2.3 Custom Properties

| Attribute | Detail |
|-----------|--------|
| **Description** | Per-type property definitions stored as rows in `entity_property_values` (not JSONB blobs). |
| **Supported Types** | `text`, `number`, `select`, `multi_select`, `date`, `boolean`, `url` |
| **Endpoints** | |
| | `POST /entities/properties` — Create a new property definition |
| | `GET /entities/properties` — List property definitions for a workspace |
| **Source** | MVP §2 |
| **Dependencies** | Custom Entity Types |

### 2.4 Tags

| Attribute | Detail |
|-----------|--------|
| **Description** | Lightweight cross-cutting labels for classification. Each tag has a name and optional hex color. |
| **Schema** | `Tag` table: `id`, `workspace_id`, `name`, `color`, audit fields |
| **Endpoints** | |
| | `GET /tags/` — List tags for a workspace |
| | `POST /tags/` — Create a tag |
| | `GET /tags/<tag_id>` — Get tag by ID |
| | `PATCH /tags/<tag_id>` — Update tag name/color |
| | `DELETE /tags/<tag_id>` — Soft-delete a tag |
| | `POST /tags/<tag_id>/entities/<entity_id>` — Tag an entity (create EntityTag link) |
| | `DELETE /tags/<tag_id>/entities/<entity_id>` — Untag an entity (soft-delete EntityTag link) |
| **Source** | MVP §2 |
| **Dependencies** | None |

### 2.5 Backlinks

| Attribute | Detail |
|-----------|--------|
| **Description** | Automatic "who links to me" view for every entity. Derived from the relations table — any entity that appears as a `target_entity_id` shows incoming links. |
| **Source** | MVP §2 |
| **Dependencies** | Relational Knowledge System |

---

## 3. Visualization

### 3.1 Visual Knowledge Graph

| Attribute | Detail |
|-----------|--------|
| **Description** | Interactive graph rendering where entities are nodes and relations are edges. Supports filtering, zoom, pan, and node selection. |
| **Source** | MVP §3 |
| **Dependencies** | Relational Knowledge System |

### 3.2 Graph API

| Attribute | Detail |
|-----------|--------|
| **Description** | Programmatic access to the knowledge graph with six operations. |
| **Operations** | |
| | `GET /graph/` — Get latest materialized snapshot |
| | `POST /graph/materialize` — Rebuild from current data (full rebuild for recovery/debug) |
| | `POST /graph/query` — Filtered nodes and edges |
| | `POST /graph/traverse` — BFS traversal from center node (depth ≤ 5) |
| | `POST /graph/paths` — Shortest path between two entities |
| | `GET /graph/centrality/<entity_id>` — Degree centrality (neighbor count) |
| **Scalability** | Incremental updates + cached snapshots. Heavy recomputations run asynchronously where possible. |
| **Source** | MVP §3 |
| **Dependencies** | Relational Knowledge System |

---

## 4. Versioning

### 4.1 Git-Inspired Versioning System

| Attribute | Detail |
|-----------|--------|
| **Description** | The same capabilities Git gave code, applied to knowledge structures. Enables experimentation without risk. |
| **Philosophy** | Users explore alternative knowledge structures, make sweeping changes, test AI-generated content — all with versioning as a safety net. |
| **User Flow** | `Page History → Snapshots → Branches → Diffs` |
| **Sync Model** | Git-inspired deterministic history + merges (not real-time CRDTs). Enables explicit versioning, branching workflows, and clean conflict resolution. |
| **Source** | MVP §4 |
| **Dependencies** | None |

### 4.2 Page History

| Attribute | Detail |
|-----------|--------|
| **Description** | Automatic version creation on entity updates. View, restore, and compare past states of any entity. |
| **Local Mode** | Append-only blocks — every update creates a new row (composite PK: `id + branch_id + created_at`). Full history preserved without separate version tables. Equivalent to infinite undo log. |
| **Cloud Mode** | `entity_versions` + `block_versions` tables with explicit version management. |
| **Modes** | Both |
| **Source** | MVP §4 |
| **Dependencies** | Versioning System |

### 4.3 Snapshots

| Attribute | Detail |
|-----------|--------|
| **Description** | Point-in-time captures of entire workspace state. Create, compare, restore, or delete. |
| **Schema** | `Snapshot` table + `snapshot_blocks` join table for membership. |
| **Modes** | Both |
| **Source** | MVP §4 |
| **Dependencies** | Versioning System |

### 4.4 Branches

| Attribute | Detail |
|-----------|--------|
| **Description** | Fork workspace into independent lines of development. Merge with conflict resolution. |
| **Schema** | `Branch` table: `id`, `workspace_id`, `name`, `parent_branch_id`, `description`, `is_default`, audit fields |
| **Endpoints** | |
| | `GET /branches/` — List branches for a workspace |
| | `POST /branches/` — Create a branch |
| | `GET /branches/<branch_id>` — Get branch by ID |
| | `DELETE /branches/<branch_id>` — Soft-delete a branch |
| | `POST /branches/<branch_id>/merge` — Merge source branch into target (target in body) |
| | `POST /branches/merge` — Merge two branches (both IDs in body) |
| **Modes** | Both |
| **Source** | MVP §4 |
| **Dependencies** | Versioning System |

### 4.5 Diffs

| Attribute | Detail |
|-----------|--------|
| **Description** | Visual comparison (green=added, red=deleted, amber=modified). Multi-level: block, entity, snapshot, or branch. |
| **Modes** | Both |
| **Levels** | Block, entity, snapshot, branch |
| **Source** | MVP §4 |
| **Dependencies** | Versioning System |

---

## 5. Governance

### 5.1 Notifications

| Attribute | Detail |
|-----------|--------|
| **Description** | User notifications for workspace events — mentions, comments, updates, invites, and system alerts. |
| **Schema** | `Notification` table: `id`, `workspace_id`, `user_id`, `entity_id` (nullable), `type`, `title`, `message`, `is_read`, audit fields |
| **Types** | `mention`, `comment`, `update`, `invite`, `system` |
| **Endpoints** | 3 — List, Create, Mark-as-read |
| **Modes** | Both |
| **Dependencies** | None |

### 5.2 Background Job Queue

| Attribute | Detail |
|-----------|--------|
| **Description** | Async job queue for heavy operations — graph materialization, export, import. |
| **Schema** | `Job` table: `id`, `workspace_id`, `job_type`, `status`, `payload`, `result`, audit fields. Statuses: `pending` → `running` → `completed` / `failed`. |
| **Endpoints** | |
| | `GET /jobs/` — List jobs (optional `workspace_id` filter) |
| | `POST /jobs/` — Create a job with type and payload |
| | `POST /jobs/<job_id>/running` — Mark a job as running |
| | `POST /jobs/<job_id>/completed` — Mark a job as completed with result |
| **Mode** | Cloud only |
| **Dependencies** | None |

### 5.3 Dashboard Overview

| Attribute | Detail |
|-----------|--------|
| **Description** | Workspace analytics overview — entity, block, relation, comment, and member counts with recent entities list. |
| **Endpoint** | `GET /api/v1/dashboard/overview` |
| **Modes** | Both |
| **Dependencies** | None |

### 5.4 Activity Log

| Attribute | Detail |
|-----------|--------|
| **Description** | Chronological audit trail of user actions across the workspace — entity creation, updates, deletions, and other operations. |
| **Schema** | `activity_log` table: `id`, `workspace_id`, `user_id`, `entity_id` (nullable), `block_id` (nullable), `action`, `details` (JSONB), `created_at`. |
| **Endpoint** | `GET /api/v1/activity/` |
| **Modes** | Both |
| **Dependencies** | None |

---

## 6. Deployment & Runtime

### 6.1 Dual-Mode Architecture

| Attribute | Detail |
|-----------|--------|
| **Description** | Single codebase, same data model, same API contracts — two deployment targets. |
| **Local Mode** | SQLite, offline-first, on-device GPU inference, zero setup, full data ownership |
| **Cloud Mode** | PostgreSQL, workspace sync, team collaboration, auto-backups, managed infrastructure |
| **Philosophy** | "Start local. Scale when you're ready. No migration. No lock-in." |
| **Source** | MVP §Deployment Modes, Arch §12 |
| **Dependencies** | None |

### 6.2 Electron Desktop Runtime

| Attribute | Detail |
|-----------|--------|
| **Description** | Native desktop application wrapping the local backend. Ships both the Qwen2.5-3B-Instruct model and embedding model bundled inside — no download required. |
| **Stack** | |
| | **App Shell** — Electron |
| | **Backend** — Flask (local server) |
| | | **Inference** — Q4_K_M GGUF (bundled Qwen2.5-3B-Instruct) |
| | **Embedding** — Bundled BGE-M3 Large |
| | **Storage** — SQLite + sqlite-vec |
| **Source** | Arch §8, MVP §Local Mode (Default) |
| **Dependencies** | Dual-Mode Architecture |

### 6.3 Cloud Runtime

| Attribute | Detail |
|-----------|--------|
| **Description** | Managed cloud deployment with horizontal scaling. Runs the same fine-tuned Qwen2.5-3B-Instruct model — desktop uses the bundled quantized GGUF build; cloud uses the full-precision model. |
| **Stack** | |
| | **Ingress** — Load Balancer → API Gateway |
| | **Compute** — Inference Servers (managed GPU instances, full precision) |
| | **Storage** — Vector DB + PostgreSQL |
| | **Registry** — Model Registry (Qwen2.5-3B-Instruct versions) |
| | **AI** — Embedding Service (BGE-M3 Large) |
| **Source** | Arch §9 |
| **Dependencies** | Dual-Mode Architecture, Model Registry, Embedding Service |

### 6.4 Cloud Synchronization

| Attribute | Detail |
|-----------|--------|
| **Description** | Git-inspired bidirectional sync of all workspace resources between local and cloud instances. |
| **Synced Resources** | |
| | Workspaces — Full metadata + settings |
| | Pages / Entities — Content + properties |
| | Blocks — Position, type, content |
| | Relations — Typed edges with metadata |
| | Branches — Structure + heads |
| | Versions — Append-only history (local → cloud) |
| | Embeddings — Vector representations (local → cloud) |
| | Graph Metadata — Materialized snapshots |
| | Files — Metadata only (bytes stored per mode) |
| | Settings — Workspace + user preferences |
| **Endpoints** | |
| | `GET /sync/` — List sync operations (optional `pending=true` filter) |
| | `POST /sync/` — Record an incoming sync operation from a client device |
| | `GET /sync/<op_id>` — Get a sync operation by ID |
| | `POST /sync/<op_id>/ack` — Mark a sync operation as acknowledged by client |
| | `POST /sync/diff` — Compare local workspace against remote export data; return what's missing locally |
| | `POST /sync/apply-diff` — Apply missing records (diff) to local workspace |
| | `POST /sync/sync-from-export` — Full differential sync: import remote export data, skipping existing records |
| **Modes** | Both |
| **Sync Model** | Git-inspired deterministic history + merges (not real-time CRDTs) |
| **Source** | MVP §Cloud Synchronization |
| **Dependencies** | None |

### 6.5 File Management

| Attribute | Detail |
|-----------|--------|
| **Description** | File upload, download, and metadata management. Bytes stored per-mode (local disk / cloud storage). |
| **Endpoints** | |
| | `GET /files/` — List files (optional filters: workspace_id, uploaded_by) |
| | `POST /files/upload` — Upload a file (multipart; validates extension/MIME, checks quota, deduplicates by hash) |
| | `POST /files/` — Create file metadata record without file upload |
| | `GET /files/<file_id>` — Get file metadata by ID |
| | `GET /files/<file_id>/download` — Download the file |
| | `DELETE /files/<file_id>` — Delete file from disk and soft-delete record |
| | `POST /files/presign` — Generate a presigned S3 upload URL (cloud mode) |
| | `POST /files/<file_id>/entities/<entity_id>` — Link a file to an entity (optionally to a block) |
| | `POST /files/cleanup-orphans` — Delete orphaned file records for a workspace |
| **Agent** | File Agent handles file operations |
| **Source** | Arch §10.3 (File Agent), MVP §Cloud Synchronization |
| **Dependencies** | None |

### 6.6 Backup & Restore

| Attribute | Detail |
|-----------|--------|
| **Description** | Export and import entire workspaces as JSON. Supports full workspace serialization (entities, blocks, relations, properties, tags, files, settings) and restoration. |
| **Endpoints** | 3 — Export, Export-to-disk, Import |
| **Modes** | Both |
| **Dependencies** | None |

### 6.7 Cloud Infrastructure (Auth & Collaboration)

| Attribute | Detail |
|-----------|--------|
| **Description** | Cloud-only tables and API for user management, authentication, and team collaboration. Not present in the local SQLite schema. |
| **Tables** | |
| | **`users`** — Cloud user accounts (`id`, `email`, `name`, `avatar_url`, `password_hash`, audit fields). Local mode stores user IDs as text references. |
| | **`sessions`** — Auth sessions with JTI refresh tokens, revocation, and expiry for cloud API access. |
| | **`workspace_members`** — Team membership with roles (`owner`, `admin`, `editor`, `viewer`). Enables multi-user collaboration on cloud workspaces. |
| **Auth Endpoints** | |
| | `POST /auth/register` — Register a new user (email/password), creates JWT tokens and session |
| | `POST /auth/login` — Authenticate with email + password, returns JWT tokens |
| | `POST /auth/logout` — Revoke the current refresh token session |
| | `POST /auth/refresh` — Issue a new access token from a valid refresh token |
| | `POST /auth/google` — Authenticate with Google OAuth credential |
| | `GET /auth/check-email` — Check if an email is available for registration |
| | `GET /auth/me` — Get the currently authenticated user's profile |
| | `PATCH /auth/me` — Update current user's name and/or avatar |
| **Mode** | Cloud only |
| **Dependencies** | Dual-Mode Architecture |

### 6.8 Local-Only Append-Optimized Tables

| Attribute | Detail |
|-----------|--------|
| **Description** | SQLite-only tables that support the append-only block architecture. |
| **Tables** | |
| | **`branch_heads`** — Tracks the current tip block per branch per entity. Maintained by the application for merge resolution. |
| | **`snapshot_blocks`** — Snapshot block membership (block pointers at snapshot time). Cloud mode uses changesets instead. |
| **Mode** | Local only |

---

All AI capabilities — from model training through deployment to the agent platform that orchestrates intelligence across the workspace.

---

## 7. Model Architecture & Training

### 7.1 System Architecture & Model Specifications

| Component | Specification |
|-----------|--------------|
| **Base Model** | Qwen2.5-3B-Instruct |
| **Embedding Model** | BGE-M3 Large |
| **Dataset Storage** | SQLite + sqlite-vec (local) → pgvector (cloud) |
| **Fine-Tuning Framework** | Unsloth |
| **Method** | QLoRA (4-bit NF4) |

### 7.2 Model Architecture

| Parameter | Value |
|-----------|-------|
| Model Type | Decoder-only Transformer |
| Parameters | ~3.09 Billion |
| Layers (Transformer Blocks) | 36 |
| Hidden Size | 2048 |
| Intermediate Size (MLP) | 11008 |
| Attention Heads | 16 |
| Key/Value Heads (GQA) | 2 |
| Head Dimension | 128 |
| Activation | SwiGLU |
| Positional Encoding | RoPE |
| Context Length | 32K (native) |
| Vocabulary Size | 151,936 |
| Attention Mechanism | Grouped Query Attention (GQA) |
| Normalization | RMSNorm (Pre-Norm) |
| Bias | No (in most linear layers) |

**Transformer Block Pipeline** (each of 36 layers):
$$\text{Input} \rightarrow \text{RMSNorm} \rightarrow \text{Multi-Head Attention} \rightarrow \text{Residual} \rightarrow \text{RMSNorm} \rightarrow \text{SwiGLU Feed-Forward} \rightarrow \text{Residual}$$

### 7.3 Training Configuration (QLoRA)

| Parameter | Value |
|-----------|-------|
| Rank (r) | 64 |
| Alpha ($\alpha$) | 128 |
| LoRA Dropout | 0.05 |
| Target Modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Optimizer | AdamW (8-bit) |
| Learning Rate | 2e-4 |
| Scheduler | Cosine (3% warmup) |
| Weight Decay | 0.01 |
| Epochs | 3 (max 5) |
| Gradient Accumulation | 8 or 16 |
| Batch Size | 1–2 per device |
| Precision | BF16 |
| Quantization | 4-bit NF4 |
| Sequence Length | 8192 or 16384 |
| Gradient Checkpointing | Enabled |
| Flash Attention | Enabled |
| Packing | Enabled |

### 7.4 Dataset Distribution

| # | Domain | Samples | % |
|---|--------|---------|---|
| 1 | General instruction following | 20,000 | 2.0% |
| 2 | Workspace Q&A | 90,000 | 9.0% |
| 3 | Block editing | 80,000 | 8.0% |
| 4 | Entity operations | 70,000 | 7.0% |
| 5 | Relation extraction | 120,000 | 12.0% |
| 6 | Relation classification | 60,000 | 6.0% |
| 7 | Knowledge graph reasoning | 45,000 | 4.5% |
| 8 | Semantic search (retrieval-grounded QA) | 35,000 | 3.5% |
| 9 | Hybrid retrieval reasoning | 40,000 | 4.0% |
| 10 | Workspace summarization | 50,000 | 5.0% |
| 11 | Multi-step planning | 55,000 | 5.5% |
| 12 | Tool calling | 180,000 | 18.0% |
| 13 | Agent collaboration | 20,000 | 2.0% |
| 14 | Memory usage | 25,000 | 2.5% |
| 15 | Safety & permissions | 35,000 | 3.5% |
| 16 | Versioning operations | 30,000 | 3.0% |
| 17 | AI governance | 25,000 | 2.5% |
| 18 | Gnovium domain knowledge | 20,000 | 2.0% |
| | **Total** | **1,000,000** | **100%** |

### 7.5 Data Engineering Strategy

1. **Dataset Split:** Training (900k) → Validation (50k) → Test (50k held-out)
2. **Negative Examples:** Train refusal of unauthorized/impossible actions
3. **Counterexamples:** Demonstrate mistake correction (wrong JSON → correct JSON)
4. **Edge Cases:** Empty workspaces, ultra-dense files (100k blocks), cyclic graphs, invalid merges
5. **Long Context Layering:** 2K → 4K → 8K → 16K → 32K
6. **Curriculum Training:** Instruction → Q&A → Editing → Relations → Tool Calling → Planning → Agents

### 7.6 Training Governance & Evaluation

**Data Quality:** Deduplication, class balancing, formatting checks, label integrity.
**Execution Control:** Validate every 500 steps, checkpoint best state, early stop after 3 regressions.
**Evaluation Metrics:** Exact Match & F1 Score, Tool Calling Accuracy & JSON Validity, Hallucination Rate & Retrieval Grounding Accuracy, Permission Compliance, Latency & Token Efficiency.

### 7.7 Automated Benchmark Suite

| Attribute | Detail |
|-----------|--------|
| **Description** | Every training run produces a benchmark report with the following metrics. Without this, you cannot determine whether a new checkpoint is actually better than the previous one. |
| **Metrics** | |
| | **JSON Validity** — % of tool calls producing valid JSON |
| | **Tool Calling Accuracy** — % of tool invocations with correct arguments |
| | **Relation Extraction P/R/F1** — Precision, Recall, F1 on relation extraction tasks |
| | **Planning Success Rate** — % of multi-step plans completed without errors |
| | **Hallucination Rate** — % of generated facts not grounded in retrieved context |
| | **Retrieval Grounding Accuracy** — % of answers supported by retrieved documents |
| | **Permission Compliance** — % of actions respecting user workspace permissions |
| | **Latency** — End-to-end response time (p50/p95/p99) |
| | **Tokens/sec** — Generation throughput |
| **Source** | MVP §Automated Benchmark Suite, Arch §Benchmark Suite |
| **Dependencies** | Training Governance, Evaluation Metrics |

### 7.8 Model Registry

| Attribute | Detail |
|-----------|--------|
| **Description** | Central registry for model versioning, variant management, and deployment orchestration. |
| **Structure** | |
| | **Versions** — Qwen2.5-3B-Instruct v1, v2, v3, ... |
| | **Quantized Variants** — Qwen2.5-3B-Instruct GGUF 4bit, 8bit |
| | **Metadata** — Size, latency benchmarks, safety scores, license |
| | **Operations** — Rollback, promotion (staging → production) |
| | **Targets** — Desktop, cloud |
| **Source** | Arch §5, MVP §Model Registry |
| **Dependencies** | Quantization |

### 7.9 Inference Runtime

| Attribute | Detail |
|-----------|--------|
| **Description** | Model serving engine that loads and runs the fine-tuned Qwen2.5-3B-Instruct model on desktop and cloud. |
| **Components** | Tokenizer, Model Loader, KV Cache, Scheduler, Sampler, Streaming, Batch Engine |
| **Modes** | Local: Q4_K_M GGUF · Cloud: full precision on managed GPU |
| **Dependencies** | None |

### 7.10 Embedding Service

| Attribute | Detail |
|-----------|--------|
| **Description** | Dedicated BGE-M3 Large embedding model (separate from the main LLM) for vector generation. |
| **Pipeline** | `BGE-M3 Large → Vector Store → Semantic Retrieval` |
| **Local Mode** | BGE-M3 Large (bundled) → SQLite + sqlite-vec |
| **Cloud Mode** | BGE-M3 Large → pgvector |
| **Design** | Separate from LLM inference for performance and accuracy isolation |
| **Source** | Arch §7, MVP §Embedding Service |
| **Dependencies** | None |

---


## 8. Agent Platform — Core Infrastructure

### 8.1 Agent Registry

| Attribute | Detail |
|-----------|--------|
| **Description** | Central registry where all agents are registered with metadata. Enables adding new agents without changing the runtime. |
| **Schema** | Agent ID, Type, Capabilities, Tools, Permissions, Memory config, Version, Status |
| **Source** | Arch §10.2 |
| **Dependencies** | None |

### 8.2 Agent Lifecycle

| Attribute | Detail |
|-----------|--------|
| **Description** | Stateful lifecycle every agent follows from creation to termination. |
| **States** | `Create → Initialize → Run → Pause → Resume → Terminate` |
| **Source** | Arch §10.8 |
| **Dependencies** | Agent Registry |

### 8.3 Agent State Machine

| Attribute | Detail |
|-----------|--------|
| **Description** | Fine-grained execution states within an agent's lifecycle. |
| **States** | `Idle → Planning → Waiting → Executing → Completed` · `Failed → Retrying` |
| **Source** | Arch §10.9 |
| **Dependencies** | Agent Lifecycle |

### 8.4 Agent Scheduler

| Attribute | Detail |
|-----------|--------|
| **Description** | Task scheduling and queue management for agent execution. |
| **Architecture** | `Task Queue → Scheduler → Priority Queue → Workers` |
| **Source** | Arch §10.7, MVP §Agent Platform |
| **Dependencies** | Agent Registry |

### 8.5 Message Bus

| Attribute | Detail |
|-----------|--------|
| **Description** | Inter-agent communication backbone supporting four message types. |
| **Message Types** | |
| | **Events** — State changes, task completion notifications |
| | **Commands** — Agent-to-agent instructions |
| | **Responses** — Results, errors, acknowledgments |
| | **Streaming** — Real-time token output |
| **Source** | Arch §10.6 |
| **Dependencies** | Agent Registry |

### 8.6 Shared Blackboard

| Attribute | Detail |
|-----------|--------|
| **Description** | Cross-agent shared state enabling collaboration. |
| **Flow** | `Supervisor → Blackboard (shared state) → Planner → Workers` |
| **Source** | Arch §10.5, MVP §Agent Platform |
| **Dependencies** | Message Bus |

### 8.7 Agent Memory

| Attribute | Detail |
|-----------|--------|
| **Description** | Every agent has its own hierarchical memory system. |
| **Tiers** | |
| | **Short-Term** — Current task context (per-agent, transient) |
| | **Long-Term** — Persistent knowledge from past runs |
| | **Workspace** — Current workspace state |
| | **Conversation** — Interaction history with user |
| | **Shared Team** — Cross-agent state via blackboard |
| **Source** | Arch §10.4, MVP §Agent Platform |
| **Dependencies** | Agent Registry, Shared Blackboard |

### 8.8 Context Builder

| Attribute | Detail |
|-----------|--------|
| **Description** | Gathers relevant workspace context before agent execution. |
| **Inputs** | Entities, blocks, relations, settings |
| **Flow** | `Workspace → Context Builder → Agent` |
| **Source** | Arch §10.11, MVP §Agent Platform |
| **Dependencies** | None |

### 8.9 Prompt Builder

| Attribute | Detail |
|-----------|--------|
| **Description** | Assembles the final LLM prompt from memory, retrieved knowledge, and task. |
| **Flow** | `Memory + Retrieved Knowledge + Task → Prompt Builder → LLM` |
| **Source** | Arch §10.12, MVP §Agent Platform |
| **Dependencies** | Agent Memory, Context Builder |

---

## 9. Agent Platform — Agent Types

### 9.1 Supervisor Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Core |
| **Description** | Orchestrates tasks across the agent platform. Decides whether execution happens locally or on cloud. Routes tasks to appropriate agents. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Agent Registry, Scheduler, Message Bus |

### 9.2 Planner Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Core |
| **Description** | Breaks down complex workspace tasks into executable sub-tasks. Generates step-by-step plans for worker agents. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Supervisor Agent |

### 9.3 Editor Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Workspace |
| **Description** | Performs CRUD operations on blocks, pages, and relations. The primary agent for modifying workspace content. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Supervisor Agent |

### 9.4 Search Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Workspace |
| **Description** | Executes full-text and semantic search across the knowledge base. Supports hybrid, keyword, and semantic modes. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Embedding Service |

### 9.5 Knowledge Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Workspace |
| **Description** | Handles graph queries, relation management, and property lookups. The agent for structured knowledge access. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Relational Knowledge System |

### 9.6 Graph Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Workspace |
| **Description** | Knowledge graph traversal, pathfinding, and visualization. Builds sub-graphs for context and exploration. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Visual Knowledge Graph, Graph API |

### 9.7 File Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | Workspace |
| **Description** | Manages file upload, download, metadata operations. Integrates with the file management system. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | File Management |

### 9.8 Memory Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | System |
| **Description** | Manages agent memory storage, retrieval, and pruning. Handles short-term → long-term memory consolidation. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Agent Memory |

### 9.9 Tool Agent

| Attribute | Detail |
|-----------|--------|
| **Category** | System |
| **Description** | Coordinates tool selection and delegates execution to the Tool Runtime. |
| **Source** | Arch §10.3, MVP §Agent Platform |
| **Dependencies** | Tool Runtime |

---

## 10. Agent Platform — Tool Runtime & Safety

### 10.1 Tool Runtime

| Attribute | Detail |
|-----------|--------|
| **Description** | Execution engine that agents use to invoke tools. Handles discovery, matching, permission, and execution. |
| **Pipeline** | `Tool Registry → Discovery (find tools by capability) → Capability Matching (match task to tool) → Permission Check (validate agent authorization) → Execution (run with safety gates)` |
| **Permission Model** | `Read | Write | Delete | Admin` |
| **Source** | Arch §10.10, MVP §Agent Platform |
| **Dependencies** | Agent Registry |

### 10.2 Safety Layer

| Attribute | Detail |
|-----------|--------|
| **Description** | Multi-stage safety pipeline that every agent action passes through before execution. |
| **Pipeline** | |
| | `LLM Output / Planner → Policy Validator (content policies, workspace rules) → Permission Validator (user scopes, tool permissions, branch protection) → Simulation / Dry-Run (compute proposed changes without applying) → Diff Generation (human-readable preview) → Explicit User Approval (configurable auto-approve for low-risk actions) → JSON Validator (validate LLM output is well-formed JSON) → Schema Validator (validate JSON against expected tool schema) → Execution via Tool Runtime` |
| **Design** | Staged — each stage independently configurable. High-risk actions require all stages; read-only tools can bypass approval. |
| **Source** | Arch §10.13, MVP §Agent Platform |
| **Dependencies** | Tool Runtime |

### 10.3 Agent Recovery

| Attribute | Detail |
|-----------|--------|
| **Description** | Automatic failure recovery with escalation chain. |
| **Chain** | `Failure → Retry (configurable count) → Fallback (alternative strategy) → Escalate (supervisor agent) → Human Approval` |
| **Source** | Arch §10.14 |
| **Dependencies** | Supervisor Agent |

### 10.4 Agent Monitoring

| Attribute | Detail |
|-----------|--------|
| **Description** | Real-time and historical metrics for agent execution. |
| **Metrics** | Execution time, CPU/GPU utilization, memory usage, failure count, retry count |
| **Source** | Arch §10.15 |
| **Dependencies** | Agent Registry, Scheduler |

### 10.5 Agent Logs

| Attribute | Detail |
|-----------|--------|
| **Description** | Structured logging for every agent execution. |
| **Fields** | Task, Reasoning chain, Tools used (with inputs/outputs), Final output, Errors |
| **Source** | Arch §10.16 |
| **Dependencies** | Agent Registry |

---

## 11. AI Capabilities

### 11.1 AI Workspace Assistant

| Attribute | Detail |
|-----------|--------|
| **Description** | Natural language interface to workspace knowledge. |
| **Capabilities** | |
| | **Workspace-wide search** — Full-text, semantic, and hybrid modes |
| | **Natural language Q&A** — Questions answered from workspace knowledge (Qwen2.5-3B-Instruct) |
| | **Summarization** — Concise entity and content summaries |
| | **Related page recommendations** — AI-powered content discovery |
| **Source** | MVP §6 |
| **Dependencies** | Embedding Service, Inference Runtime |

### 11.2 Hybrid Search

| Attribute | Detail |
|-----------|--------|
| **Description** | Default search mode combining keyword and semantic retrieval for optimal results. |
| **Source** | MVP §Search Modes |
| **Dependencies** | Embedding Service |

### 11.3 Semantic Search

| Attribute | Detail |
|-----------|--------|
| **Description** | Embedding-based vector similarity search using BGE-M3 Large. |
| **Backend** | BGE-M3 Large → Vector Store |
| **Source** | MVP §Search Modes |
| **Dependencies** | Embedding Service |

---

## 12. Memory & Context Management

| Attribute | Detail |
|-----------|--------|
| **Working Memory** | Current task context (per-agent short-term). |
| **Semantic Memory** | Vector embeddings via BGE-M3 Large. |
| **Conversation Context** | Ongoing interaction history (per-agent conversation memory). |
| **Workspace Context** | Current workspace state (workspace memory). |
| **Shared Team Memory** | Cross-agent state via blackboard. |
| **Entity Event Log** | Persistent audit trail of entity-scoped events (`entity_events` table: `entity_id`, `changeset_id`, `event_type`, `payload`, `created_at`). Distinct from general `activity_log` — event-log tracks changeset-aware entity mutations. |
| **Source** | Arch §11 |
| **Dependencies** | Agent Memory, Embedding Service |

---

## 13. API Boundaries

| API | Description | Source |
|-----|-------------|--------|
| **Auth API** | User registration, login, logout, token refresh, OAuth, profile management (8 endpoints) | FEATURES §6.7 |
| **Workspace API** | Workspace CRUD and statistics (6 endpoints) | FEATURES §1.4 |
| **Editor API** | Entity CRUD, entity types, properties, blocks, children, archive, duplicate, restore (15 endpoints) | FEATURES §1.5 |
| **Block API** | Block CRUD, move, reorder (6 endpoints) | FEATURES §1.1 |
| **Comments API** | Threaded discussions on entities and blocks (5 endpoints) | FEATURES §1.3 |
| **Knowledge API** | Relation CRUD, backlinks, neighbors, pathfinding (8 endpoints) | FEATURES §2.1 |
| **Tags API** | Tag CRUD, tag/untag entities (7 endpoints) | FEATURES §2.4 |
| **Graph API** | Queries, traversal, paths, materialization, centrality (6 endpoints) | FEATURES §3.2 |
| **Dashboard API** | Workspace analytics overview (1 endpoint) | FEATURES §5.3 |
| **Notifications API** | User notifications — list, create, mark-read (3 endpoints) | FEATURES §5.1 |
| **Activity API** | Audit trail of workspace actions (1 endpoint) | FEATURES §5.4 |
| **Backups API** | Export and import workspaces (3 endpoints) | FEATURES §6.6 |
| **Version API** | Snapshots, branches, diffs, page history (9 endpoints) | FEATURES §4.2–4.5 |
| **Branches API** | Branch CRUD, merge (6 endpoints) | FEATURES §4.4 |
| **Jobs API** | Job lifecycle — create, run, complete (4 endpoints) | FEATURES §5.2 |
| **Files API** | Upload, download, metadata, file-entity linking (9 endpoints) | FEATURES §6.5 |
| **Synchronization API** | Bidirectional sync operations (7 endpoints) | FEATURES §6.4 |

---

## 14. AI Governance

### 14.1 Governance Dashboard

| Attribute | Detail |
|-----------|--------|
| **Description** | Workspace health monitoring and quality management. Five endpoints providing visibility into workspace integrity. |
| **Source** | MVP §7 |
| **Dependencies** | Inference Runtime, Embedding Service |

### 14.2 Health Score

| Attribute | Detail |
|-----------|--------|
| **Description** | Overall workspace quality metric (0–100). |
| **Formula** | `score = max(0, 100 - penalty)` where `penalty = min(70, duplicates × 5 + orphans × 2 + stale)` |
| **Ranges** | 90–100 Excellent · 70–89 Needs attention · <70 Requires cleanup |
| **Endpoint** | `GET /governance/health` |
| **Source** | MVP §7 |
| **Dependencies** | AI Governance |

### 14.3 Duplicate Detection

| Attribute | Detail |
|-----------|--------|
| **Description** | Find entities with identical or similar titles using semantic similarity. |
| **Processing** | Heavy — background job with cached results. |
| **Endpoint** | `GET /governance/duplicates` |
| **Source** | MVP §7 |
| **Dependencies** | AI Governance, Embedding Service |

### 14.4 Orphan Detection

| Attribute | Detail |
|-----------|--------|
| **Description** | Identify entities with zero connections (no incoming or outgoing relations). |
| **Processing** | Lightweight — on-demand. |
| **Endpoint** | `GET /governance/orphans` |
| **Source** | MVP §7 |
| **Dependencies** | AI Governance |

### 14.5 Stale Content Detection

| Attribute | Detail |
|-----------|--------|
| **Description** | Find entities not updated in 90+ days. |
| **Processing** | Moderate — periodic. |
| **Endpoint** | `GET /governance/stale` |
| **Source** | MVP §7 |
| **Dependencies** | AI Governance |

---

## Key Architectural Flows

### Standard AI Pipeline

```
User Query
     │
     ▼
Context Builder → Gathers workspace context (entities, blocks, relations)
     │
     ▼
Retriever → Semantic + graph-aware retrieval (hybrid search)
     │
     ▼
Inference Runtime → Local (GGUF) or cloud inference engine
     │
     ▼
Agent Platform → Supervisor, Planner, Workers, Memory, Bus
     │
     ▼
Safety Layer → Policy → Permission → Simulation → Diff → Approval
     │
     ▼
Tool Runtime → Registry → Discovery → Permissions → Executor
     │
     ▼
Gnovium APIs → Entities, Blocks, Relations, Graph, Search, Governance
     │
     ▼
Workspace
```

### AI Knowledge Graph Suggestion Pipeline

```
User saves page
        │
        ▼
Entity Extraction
        │
        ▼
Relation Candidates
        │
        ▼
Embedding Score
        │
        ▼
Graph Context
        │
        ▼
LLM Reasoning
        │
        ▼
Confidence Engine
        │
        ├── High (≥0.98) → Auto-create (optional)
        ├── Medium (0.80–0.98) → Suggest
        └── Low (<0.80) → Ignore
                │
                ▼
User Review (Accept / Edit / Reject)
        │
        ▼
Knowledge Agent → Editor Agent
        │
        ▼
POST /relations (with AI provenance metadata)
        │
        ▼
Knowledge Graph
        │
        ▼
Continuous Graph Maintenance
```

### Model Lifecycle

```
Qwen2.5-3B-Instruct
    ↓
QLoRA Fine-tuning (4-bit NF4 via Unsloth)
    ↓
LoRA Adapter
    ↓
Merge with Base
    ↓
FP16 Model (~6.2 GB)
    ↓
GGUF Conversion → Q4_K_M
    ↓
≈ 2.0 GB (deployment artifact)
    ↓
Model Registry
    ↓
Desktop (Q4_K_M GGUF) / Cloud (full precision) Deployment
    ↓
Agent Platform
    ↓
Workspace
```

**Total AI Package:**

| Component | Size |
|-----------|------|
| Qwen2.5-3B-Instruct (Q4_K_M GGUF) | ~2.0 GB |
| BGE-M3 Large (embedding model) | ~0.6–1.2 GB |
| **Total** | **~2.6–3.2 GB** |

---

> **End of Feature Reference.** This document is the single source of truth for all Gnovium V1 features. Both `gnovium_llm_multiagent_architecture.md` and `gnovium_mvp_context.md` derive from this reference.
