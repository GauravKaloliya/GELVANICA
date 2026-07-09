-- =============================================
-- GNOVIUM KNOWLEDGE OS - SQLITE SCHEMA (LOCAL MODE)
-- =============================================
-- Auth is handled via the global cloud DB. The local
-- SQLite DB stores content only (entities, blocks,
-- tags, graph, etc.) with user IDs stored as text
-- references to cloud user IDs (no FK constraint).
--
-- Architecture: App -> Flask API (local) -> DB
-- =============================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA recursive_triggers = OFF;

-- =============================================
-- UUID generation: lower(hex(randomblob(16))) produces a 32-char hex string.
-- This is NOT a hyphenated UUID — the app layer formats it as standard
-- 8-4-4-4-12 UUID strings before returning to clients.
-- =============================================

-- =============================================
-- 1. WORKSPACES
-- =============================================

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    settings TEXT DEFAULT '{}' CHECK(json_valid(settings)),
    deployment_mode TEXT CHECK (deployment_mode IN ('local', 'cloud')) DEFAULT 'local',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 2. ENTITY TYPES & ENTITIES
-- =============================================

CREATE TABLE IF NOT EXISTS entity_types (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    config TEXT DEFAULT '{}' CHECK(json_valid(config)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_type_id TEXT NOT NULL REFERENCES entity_types(id) ON DELETE RESTRICT,
    title TEXT,
    icon TEXT,
    cover_image TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT 0,
    archived_at DATETIME,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. BLOCKS (APPEND-ONLY)
--    Zero overhead: never UPDATE or DELETE; each edit INSERTs a new row.
--    Automatic history: composite PK (id, branch_id, created_at) preserves every version.
--    Fast current-state read: WHERE is_deleted = 0 AND (id, branch_id, created_at) IN
--    (SELECT id, branch_id, MAX(created_at) FROM blocks GROUP BY id, branch_id).
--    No separate entity_versions / block_versions table needed.
-- =============================================

CREATE TABLE IF NOT EXISTS blocks (
    id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL DEFAULT 'main',
    parent_block_id TEXT,
    block_type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(content)),
    position REAL NOT NULL,
    indent INTEGER NOT NULL DEFAULT 0,
    content_hash TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT,
    PRIMARY KEY (id, branch_id, created_at)
);

CREATE INDEX IF NOT EXISTS idx_blocks_current ON blocks(entity_id, branch_id, position) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_blocks_current_lookup ON blocks(entity_id, branch_id, id, created_at DESC);

-- =============================================
-- 4. FULL-TEXT SEARCH (HYBRID)
--    blocks_fts = real-time block-level search (FTS5, auto-synced via triggers)
--    search_documents + search_documents_fts = materialized page-level index for AI
--    Hybrid = search both, merge with ranking
-- =============================================

-- Real-time block search: auto-synced FTS5 on blocks content
CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
    content,
    content='blocks',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS blocks_fts_insert AFTER INSERT ON blocks BEGIN
    INSERT INTO blocks_fts(rowid, content)
    SELECT rowid, content FROM blocks
    WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS blocks_fts_delete AFTER INSERT ON blocks
WHEN NEW.is_deleted = 1 BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, content) VALUES('delete', NEW.rowid, NEW.content);
END;

-- Materialized page-level search index for AI
-- One row per entity; content = concatenation of all blocks
-- Rebuilt by BlockService after each block change
CREATE TABLE IF NOT EXISTS search_documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    content_hash TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS search_documents_fts USING fts5(
    title, content,
    content='search_documents',
    content_rowid='rowid',
    tokenize='porter unicode61'
);

CREATE TRIGGER IF NOT EXISTS search_documents_fts_insert AFTER INSERT ON search_documents BEGIN
    INSERT INTO search_documents_fts(rowid, title, content)
    SELECT rowid, title, content FROM search_documents WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS search_documents_fts_update AFTER UPDATE ON search_documents BEGIN
    INSERT INTO search_documents_fts(search_documents_fts, rowid, title, content)
    VALUES('delete', OLD.rowid, OLD.title, OLD.content);
    INSERT INTO search_documents_fts(rowid, title, content)
    SELECT rowid, title, content FROM search_documents WHERE rowid = NEW.rowid;
END;

CREATE TRIGGER IF NOT EXISTS search_documents_fts_delete AFTER UPDATE OF is_deleted ON search_documents
WHEN NEW.is_deleted = 1 BEGIN
    INSERT INTO search_documents_fts(search_documents_fts, rowid, title, content)
    VALUES('delete', OLD.rowid, OLD.title, OLD.content);
END;

-- Trigger to keep search_documents.updated_at in sync
CREATE TRIGGER IF NOT EXISTS trigger_search_documents_updated_at AFTER UPDATE ON search_documents BEGIN
    UPDATE search_documents SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id AND updated_at != CURRENT_TIMESTAMP;
END;

-- =============================================
-- 5. PROPERTIES
-- =============================================

CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_type_id TEXT REFERENCES entity_types(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    property_type TEXT NOT NULL,
    config TEXT DEFAULT '{}' CHECK(json_valid(config)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS entity_property_values (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    value TEXT NOT NULL CHECK(json_valid(value)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 6. RELATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    metadata TEXT DEFAULT '{}' CHECK(json_valid(metadata)),
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT,
    CHECK (source_entity_id != target_entity_id)
);

-- =============================================
-- 7. TAGS
-- =============================================

CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS entity_tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 8. EVENTS
-- =============================================

CREATE TABLE IF NOT EXISTS entity_events (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL CHECK(json_valid(payload)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 9. FILES
-- =============================================

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    content_hash TEXT NOT NULL,
    storage_provider TEXT NOT NULL DEFAULT 'local',
    object_key TEXT NOT NULL,
    public_url TEXT,
    uploaded_by TEXT,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS entity_files (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    block_id TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 10. BRANCHES
-- =============================================

CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_default BOOLEAN DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- branch_heads tracks the current tip of each branch per entity.
-- entity_branch_heads extends this with base pointers for merge resolution.
-- Both are maintained by the application; this is intentional denormalization.

CREATE TABLE IF NOT EXISTS branch_heads (
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    block_created_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (branch_id, entity_id)
);

CREATE TABLE IF NOT EXISTS entity_branch_heads (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    current_block_id TEXT,
    current_block_created_at DATETIME,
    base_block_id TEXT,
    base_block_created_at DATETIME,
    UNIQUE(branch_id, entity_id)
);

CREATE TABLE IF NOT EXISTS branch_merges (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    source_branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    target_branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_by TEXT,
    merged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    metadata TEXT DEFAULT '{}' CHECK(json_valid(metadata)),
    CHECK (source_branch_id != target_branch_id)
);

CREATE TABLE IF NOT EXISTS merge_conflicts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    merge_id TEXT NOT NULL REFERENCES branch_merges(id) ON DELETE CASCADE,
    entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL,
    details TEXT NOT NULL CHECK(json_valid(details)),
    resolved BOOLEAN DEFAULT 0,
    resolved_by TEXT,
    resolution TEXT,
    resolved_at DATETIME
);

-- =============================================
-- 11. SNAPSHOTS
-- =============================================

CREATE TABLE IF NOT EXISTS snapshots (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    created_by TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS snapshot_blocks (
    snapshot_id TEXT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    block_created_at DATETIME,
    entity_id TEXT NOT NULL,  -- No FK: snapshots must survive entity deletion
    PRIMARY KEY (snapshot_id, block_id)
);

-- =============================================
-- 12. EMBEDDINGS (AI / Semantic Search)
-- =============================================

CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
    block_id TEXT,
    model TEXT NOT NULL,
    embedding TEXT,  -- JSON float32 array; no ANN index available — similarity search is CPU-based
    content_hash TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 13. GRAPH MATERIALIZATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS graph_materializations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    graph_snapshot TEXT NOT NULL CHECK(json_valid(graph_snapshot)),
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version_hash TEXT
);

-- =============================================
-- 14. COMMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
    block_id TEXT,
    parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 15. NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    entity_id TEXT REFERENCES entities(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    deleted_by TEXT
);

-- =============================================
-- 16. GOVERNANCE & AUDIT
-- =============================================

CREATE TABLE IF NOT EXISTS governance_reports (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    health_score REAL,
    duplicate_count INTEGER DEFAULT 0,
    orphan_count INTEGER DEFAULT 0,
    stale_count INTEGER DEFAULT 0,
    report TEXT DEFAULT '{}' CHECK(json_valid(report)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT,
    entity_id TEXT,
    block_id TEXT,
    action TEXT NOT NULL,
    details TEXT DEFAULT '{}' CHECK(json_valid(details)),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_log(workspace_id, created_at);

-- =============================================
-- PARTIAL UNIQUE INDEXES (Soft-Delete Safe)
-- =============================================

CREATE UNIQUE INDEX uq_entity_types_workspace_name
    ON entity_types(workspace_id, name) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_tags_workspace_name
    ON tags(workspace_id, name) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_properties_workspace_name_type
    ON properties(workspace_id, name, entity_type_id) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_search_documents_workspace_entity
    ON search_documents(workspace_id, entity_id) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_entity_tags_active
    ON entity_tags(entity_id, tag_id) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_entity_files_active
    ON entity_files(entity_id, file_id) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_entity_property_values_active
    ON entity_property_values(entity_id, property_id) WHERE is_deleted = 0;

CREATE UNIQUE INDEX uq_relations_active
    ON relations(source_entity_id, target_entity_id, relation_type) WHERE is_deleted = 0;

CREATE UNIQUE INDEX idx_files_hash ON files(content_hash) WHERE is_deleted = 0;

-- =============================================
-- INDEXES (Active-Row Filters)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_entities_workspace_active ON entities(workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entities_archived ON entities(archived_at) WHERE archived_at IS NOT NULL AND is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_blocks_entity_active ON blocks(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_blocks_entity_branch_active ON blocks(entity_id, branch_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_relations_source_active ON relations(source_entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_relations_target_active ON relations(target_entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_comments_block ON comments(block_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = 0 AND is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags(tag_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_files_entity ON entity_files(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_files_file ON entity_files(file_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_property_values_entity ON entity_property_values(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags(workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_properties_workspace ON properties(workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_branches_workspace ON branches(workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_branches_default ON branches(workspace_id, is_default) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings(entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace ON embeddings(workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_search_documents_workspace ON search_documents(workspace_id) WHERE is_deleted = 0;

-- =============================================
-- DELETED_AT INDEXES (Purge-Job Support)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entities_deleted_at ON entities(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_blocks_deleted_at ON blocks(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_types_deleted_at ON entity_types(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON properties(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_property_values_deleted_at ON entity_property_values(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_relations_deleted_at ON relations(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_search_documents_deleted_at ON search_documents(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_tags_deleted_at ON entity_tags(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_files_deleted_at ON entity_files(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_branches_deleted_at ON branches(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_embeddings_deleted_at ON embeddings(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at) WHERE is_deleted = 1;

-- =============================================
-- UPDATED_AT TRIGGERS
-- =============================================
-- AFTER UPDATE with guard: the WHERE clause prevents infinite recursion
-- by skipping the second UPDATE when updated_at is already CURRENT_TIMESTAMP.

CREATE TRIGGER trigger_workspaces_updated_at AFTER UPDATE ON workspaces BEGIN
    UPDATE workspaces SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id AND updated_at != CURRENT_TIMESTAMP;
END;

CREATE TRIGGER trigger_entities_updated_at AFTER UPDATE ON entities BEGIN
    UPDATE entities SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id AND updated_at != CURRENT_TIMESTAMP;
END;

CREATE TRIGGER trigger_comments_updated_at AFTER UPDATE ON comments BEGIN
    UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id AND updated_at != CURRENT_TIMESTAMP;
END;

CREATE TRIGGER trigger_entity_property_values_updated_at AFTER UPDATE ON entity_property_values BEGIN
    UPDATE entity_property_values SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id AND updated_at != CURRENT_TIMESTAMP;
END;

-- =============================================
-- DEFAULT DATA
-- =============================================

INSERT OR IGNORE INTO workspaces (id, name, owner_id, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000001', 'My Workspace', 'local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO entity_types (id, workspace_id, name, created_at) VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Page', CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO branches (id, workspace_id, name, is_default, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'main', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
