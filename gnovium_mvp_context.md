# Gnovium V1 Project Overview

Gnovium is a knowledge management platform that treats knowledge as a connected, versioned, and evolvable system — not a collection of isolated documents.

Run it entirely on your device with full data ownership, or switch to Cloud Mode for collaboration and sync. Same knowledge model. Same workflows. Same experience. No migration. No lock-in.

Gnovium combines block-based editing, relational knowledge management, visual knowledge graphs, workspace versioning, and AI-powered discovery within a unified workspace.

## Why Gnovium

Gnovium solves three fundamental problems with traditional knowledge tools:

1. **Knowledge fragmentation** — notes scattered across apps with no connections
2. **Loss of context and relationships** — information without its surrounding meaning
3. **Fear of experimentation** — no safe way to restructure or explore alternative ideas

## System Objectives

- Modern block-based workspace for composing and organizing knowledge
- Structured relational knowledge management with typed connections
- Interactive graph visualization of knowledge relationships
- Git-inspired versioning for fearless experimentation
- AI-powered search and question answering
- Workspace health insights through governance checks
- Local-first by default, cloud-ready when needed
- Same experience across all deployment modes

## Deployment Modes

### Local Mode (Default)

Your knowledge stays yours.

Everything runs on your device: storage, AI, and sync. Zero setup. Full ownership. Instant performance.

Ideal for personal knowledge bases, research, learning, and privacy-first workflows.

### Cloud Mode

Transform personal knowledge into shared intelligence.

Add team collaboration, synchronization, automatic backups, and managed infrastructure — while keeping the same workflows and knowledge model.

> Start local. Scale when you're ready. Just knowledge that grows with you.

## Core Features

### 1. Block-Based Workspace

Every page is built from blocks — modular content units you can arrange, nest, and reorder. Supports paragraphs, headings, lists, code, quotes, callouts, images, tables, and more.

- Rich text editing with formatting
- Nested pages for hierarchical organization
- Position-based ordering with drag-and-drop
- Move blocks between pages
- Soft delete with restore

### 2. Relational Knowledge System

Transform isolated notes into connected knowledge through typed relations, backlinks, tags, and custom properties.

| Feature | Description |
|---------|-------------|
| **Custom Entity Types** | Define your own types with custom property schemas |
| **Custom Properties** | Per-type definitions (text, number, select, date, boolean, url) |
| **Tags** | Lightweight labels for cross-cutting classification |
| **Typed Relations** | Directed connections between entities (references, dependencies, parts, and more) |
| **Backlinks** | Automatic "who links to me" view for every entity |
| **AI Relation Suggestions** | AI discovers and suggests connections between your pages |

### 3. Visual Knowledge Graph

See your knowledge as a living network. The graph view visualizes entities as nodes and relations as edges, letting you discover patterns and connections you might otherwise miss.

### 4. Versioning System

Git-inspired versioning for knowledge work — the same safety net developers have for code, applied to knowledge structures.

#### Philosophy

**Experimentation without risk.** Explore alternative knowledge structures, make sweeping changes, or test AI-generated content — all with a complete safety net.

#### User Experience Flow

```
Page History → Snapshots → Branches → Diffs
```

View an entity's edit history, capture workspace-wide snapshots, fork into experimental branches, and compare any state with visual diffs.

#### Core Concepts

| Concept | Description |
|---------|-------------|
| **Page History** | Automatic version creation on every edit. View, restore, and compare past states. |
| **Snapshots** | Point-in-time captures of your entire workspace. Create, compare, restore, or delete. |
| **Branches** | Fork your workspace into independent lines of development. Merge with conflict resolution. |
| **Diffs** | Visual comparison showing what's added, deleted, or modified across any level. |

### 5. Workspace Administration

- **Dashboard** — Entity, block, relation, and comment counts with recently modified pages
- **Activity Log** — Chronological audit trail of all workspace actions
- **Backup & Restore** — Export and import entire workspaces for migration or backup
- **File Management** — Upload, download, and manage files with entity linking

### 6. AI Workspace Assistant

Your AI runs locally on your device — no data leaves your machine. Ask questions, search your workspace, and get answers grounded in your knowledge.

| Feature | Description |
|---------|-------------|
| **Workspace Search** | Find anything across your knowledge base |
| **Natural Language Q&A** | Ask questions, get answers from your content |
| **Summarization** | Generate concise summaries of any page |
| **Related Pages** | Discover connected content you might have missed |

#### Search Modes

| Mode | Description |
|------|-------------|
| Keyword | Simple text matching |
| Full-text | Advanced search with ranking |
| Hybrid | Combines keyword + semantic (default) |
| Semantic | Meaning-based similarity search |

### 7. AI Governance

Keep your workspace healthy with AI-powered quality checks:

| Feature | Description |
|---------|-------------|
| **Health Score** | Overall workspace quality rating |
| **Duplicate Detection** | Find pages with overlapping content |
| **Orphan Detection** | Identify pages with no connections |
| **Stale Content** | Surface pages that haven't been updated recently |

### 8. Notifications

Alerts for mentions, comments, updates, invites, and system events. Available in both Local and Cloud modes.

### 9. Background Jobs

Async processing for heavy operations like graph updates, export, and import. Cloud mode only.

## System Architecture

Gnovium uses a client-server architecture with a web frontend and REST API backend. Both deployment modes share the same data model and API contracts — start local, move to cloud, nothing changes.

### Cloud Synchronization

When using Cloud Mode, your knowledge stays in sync across devices — pages, blocks, relations, branches, files, and settings update automatically as you work.

### AI Layer

The AI layer is a key differentiator: intelligent workspace assistance that runs entirely on your device. No cloud dependency. No data sharing. Your knowledge stays private while still getting powerful AI features.

In Local Mode, a bundled language model and embedding service handle all AI tasks on-device. In Cloud Mode, inference runs on managed infrastructure for teams that prefer it.

The AI system uses a multi-agent architecture where specialized agents handle different tasks — editing, searching, graph queries, and more — coordinated by a supervisor with a safety pipeline that validates all actions before execution.

## User Flow

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

- AI runs entirely on your device with no internet required
- Multi-agent system with safety pipeline for trustworthy actions
- Local and cloud modes share the same experience
- Search and Q&A grounded in your knowledge
- Graph visualization scales with your workspace
- Governance checks surface issues before they grow

## Expected Outcome

Gnovium demonstrates that knowledge can be managed as a connected, versioned, and evolvable system rather than a collection of isolated documents. It establishes the foundation for a Knowledge Operating System where your knowledge grows with you — locally owned, globally connected.
