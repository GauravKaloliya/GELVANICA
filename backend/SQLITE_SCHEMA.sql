-- =============================================
-- GNOVIUM KNOWLEDGE OS - SQLITE SCHEMA (LOCAL MODE)
-- =============================================
-- Auto-generated from app/models/local.py
-- =============================================

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA recursive_triggers = OFF;
PRAGMA foreign_keys = ON;

-- =============================================
-- 1. USERS
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    email TEXT NOT NULL,
    name TEXT,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 2. AUTH CODES
-- =============================================

CREATE TABLE IF NOT EXISTS auth_codes (
    code TEXT NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    expires_at DATETIME NOT NULL,
    consumed_at DATETIME,
    redirect_uri TEXT,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    UNIQUE (code),
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_user_id ON auth_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_deleted_at ON auth_codes (deleted_at) WHERE is_deleted = 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_codes_code ON auth_codes (code) WHERE consumed_at IS NULL;

-- =============================================
-- 3. SESSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS sessions (
    user_id VARCHAR(36) NOT NULL,
    jti TEXT,
    refresh_jti TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    revoked_at DATETIME,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (refresh_jti)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 4. WORKSPACES
-- =============================================

CREATE TABLE IF NOT EXISTS workspaces (
    owner_id VARCHAR(36) NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    description TEXT,
    settings JSON DEFAULT '{}',
    deployment_mode TEXT DEFAULT 'local',
    sync_enabled BOOLEAN DEFAULT 0,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_workspace_settings CHECK (json_valid(settings)),
    CONSTRAINT ck_workspace_deployment_mode CHECK (deployment_mode IN ('local', 'cloud')),
    FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_owner_active ON workspaces (owner_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 5. ENTITY TYPES
-- =============================================

CREATE TABLE IF NOT EXISTS entity_types (
    workspace_id VARCHAR(36) NOT NULL,
    name TEXT NOT NULL,
    slug TEXT DEFAULT '' NOT NULL,
    icon TEXT,
    description TEXT,
    color TEXT,
    config JSON DEFAULT '{}',
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_entity_type_config CHECK (json_valid(config)),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_types_workspace ON entity_types (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_types_workspace_name ON entity_types (workspace_id, name) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_types_deleted_at ON entity_types (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 6. ENTITIES
-- =============================================

CREATE TABLE IF NOT EXISTS entities (
    workspace_id VARCHAR(36) NOT NULL,
    entity_type_id VARCHAR(36) NOT NULL,
    name TEXT,
    icon TEXT,
    color TEXT,
    cover_image TEXT,
    parent_id VARCHAR(36),
    sort_order INTEGER DEFAULT 0,
    summary TEXT,
    is_favorite BOOLEAN DEFAULT 0,
    is_archived BOOLEAN DEFAULT 0 NOT NULL,
    archived_at DATETIME,
    block_count INTEGER DEFAULT 0,
    created_by VARCHAR(36),
    version INTEGER DEFAULT 1 NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_type_id) REFERENCES entity_types (id) ON DELETE RESTRICT,
    FOREIGN KEY(parent_id) REFERENCES entities (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_workspace_active ON entities (workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (entity_type_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entities_archived ON entities (archived_at) WHERE archived_at IS NOT NULL AND is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities (parent_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entities_deleted_at ON entities (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS ix_entities_parent_id ON entities (parent_id);

-- =============================================
-- 7. BLOCKS (APPEND-ONLY with Composite PK)
-- =============================================

CREATE TABLE IF NOT EXISTS blocks (
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36) DEFAULT '00000000-0000-0000-0000-000000000003' NOT NULL,
    parent_block_id VARCHAR(36),
    lft INTEGER DEFAULT 0 NOT NULL,
    rgt INTEGER DEFAULT 0 NOT NULL,
    type TEXT NOT NULL,
    content JSON DEFAULT '{}' NOT NULL,
    properties JSON DEFAULT '{}',
    position NUMERIC(20, 10) NOT NULL,
    indent INTEGER DEFAULT 0 NOT NULL,
    moved_at DATETIME,
    content_hash TEXT DEFAULT '' NOT NULL,
    version INTEGER DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id, branch_id, created_at),
    CONSTRAINT ck_block_content CHECK (json_valid(content)),
    CONSTRAINT ck_block_properties CHECK (json_valid(properties)),
    UNIQUE (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(parent_block_id) REFERENCES blocks (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blocks_parent_block ON blocks (parent_block_id);
CREATE INDEX IF NOT EXISTS idx_blocks_current ON blocks (entity_id, branch_id, position) WHERE is_deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blocks_entity_position ON blocks (entity_id, branch_id, position) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_blocks_deleted_at ON blocks (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_blocks_entity_branch_active ON blocks (entity_id, branch_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_blocks_entity_active ON blocks (entity_id) WHERE is_deleted = 0;

-- =============================================
-- 8. SEARCH DOCUMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS search_documents (
    workspace_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    block_id VARCHAR(36),
    title TEXT,
    content TEXT,
    content_hash TEXT DEFAULT '' NOT NULL,
    search_vector TEXT,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id)
);

CREATE INDEX IF NOT EXISTS idx_search_documents_workspace ON search_documents (workspace_id) WHERE is_deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_search_documents_workspace_entity ON search_documents (workspace_id, entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_search_documents_deleted_at ON search_documents (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 9. PROPERTIES (renamed from entity_properties)
-- =============================================

CREATE TABLE IF NOT EXISTS properties (
    workspace_id VARCHAR(36) NOT NULL,
    entity_type_id VARCHAR(36),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    default_value JSON,
    required BOOLEAN DEFAULT 0,
    options JSON DEFAULT '{}',
    config JSON DEFAULT '{}',
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_property_type CHECK (type IN ('text','number','date','select','multi_select','checkbox','url','email','phone','rich_text','boolean','entity_ref')),
    CONSTRAINT ck_property_options CHECK (json_valid(options)),
    CONSTRAINT ck_property_config CHECK (json_valid(config)),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_type_id) REFERENCES entity_types (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_properties_workspace ON properties (workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON properties (deleted_at) WHERE is_deleted = 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_properties_workspace_name_type ON properties (workspace_id, name, type) WHERE is_deleted = 0;

-- =============================================
-- 10. ENTITY PROPERTY VALUES
-- =============================================

CREATE TABLE IF NOT EXISTS entity_property_values (
    entity_id VARCHAR(36) NOT NULL,
    property_id VARCHAR(36) NOT NULL,
    value JSON DEFAULT '{}' NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_epv_value CHECK (json_valid(value)),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(property_id) REFERENCES properties (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_property_values_deleted_at ON entity_property_values (deleted_at) WHERE is_deleted = 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_property_values_active ON entity_property_values (entity_id, property_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_property_values_entity ON entity_property_values (entity_id) WHERE is_deleted = 0;

-- =============================================
-- 11. RELATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS relations (
    workspace_id VARCHAR(36) NOT NULL,
    source_id VARCHAR(36) NOT NULL,
    target_id VARCHAR(36) NOT NULL,
    type TEXT NOT NULL,
    label TEXT,
    properties JSON DEFAULT '{}',
    generated_by TEXT DEFAULT 'manual' NOT NULL,
    verified BOOLEAN DEFAULT 1 NOT NULL,
    confidence FLOAT,
    ai_model TEXT,
    created_by VARCHAR(36),
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT no_self_relation CHECK (source_id != target_id),
    CONSTRAINT ck_relation_generated_by CHECK (generated_by IN ('manual', 'ai')),
    CONSTRAINT ck_relation_properties CHECK (json_valid(properties)),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(source_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES entities (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_relations_deleted_at ON relations (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_relations_source_active ON relations (source_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_relations_target_active ON relations (target_id) WHERE is_deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_relations_active ON relations (workspace_id, source_id, target_id, type) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_relations_workspace ON relations (workspace_id);

-- =============================================
-- 12. TAGS
-- =============================================

CREATE TABLE IF NOT EXISTS tags (
    workspace_id VARCHAR(36) NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    entity_count INTEGER DEFAULT 0,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags (deleted_at) WHERE is_deleted = 1;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_workspace_name ON tags (workspace_id, name) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags (workspace_id) WHERE is_deleted = 0;

-- =============================================
-- 13. ENTITY TAGS
-- =============================================

CREATE TABLE IF NOT EXISTS entity_tags (
    entity_id VARCHAR(36) NOT NULL,
    tag_id VARCHAR(36) NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_tags_active ON entity_tags (entity_id, tag_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags (tag_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags (entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_tags_deleted_at ON entity_tags (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 14. BRANCHES
-- =============================================

CREATE TABLE IF NOT EXISTS branches (
    workspace_id VARCHAR(36) NOT NULL,
    parent_branch_id VARCHAR(36),
    name TEXT NOT NULL,
    description TEXT,
    created_by VARCHAR(36),
    is_default BOOLEAN DEFAULT 0,
    is_locked BOOLEAN DEFAULT 0,
    version INTEGER NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(parent_branch_id) REFERENCES branches (id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_branches_default ON branches (workspace_id, is_default) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_branches_deleted_at ON branches (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_branches_workspace ON branches (workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_branches_parent_branch ON branches (parent_branch_id);

-- =============================================
-- 15. SNAPSHOTS
-- =============================================

CREATE TABLE IF NOT EXISTS snapshots (
    branch_id VARCHAR(36) NOT NULL,
    name TEXT,
    description TEXT,
    metadata JSON DEFAULT '{}',
    created_by VARCHAR(36),
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_snapshots_deleted_at ON snapshots (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_snapshots_branch_id ON snapshots (branch_id);

-- =============================================
-- 16. CHANGESETS
-- =============================================

CREATE TABLE IF NOT EXISTS changesets (
    branch_id VARCHAR(36) NOT NULL,
    snapshot_id VARCHAR(36),
    message TEXT,
    created_by VARCHAR(36),
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(snapshot_id) REFERENCES snapshots (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_changesets_snapshot ON changesets (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changesets_deleted_at ON changesets (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_changesets_branch ON changesets (branch_id);

-- =============================================
-- 17. ENTITY VERSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS entity_versions (
    entity_id VARCHAR(36) NOT NULL,
    branch_id VARCHAR(36),
    changeset_id VARCHAR(36),
    snapshot_id VARCHAR(36),
    version INTEGER,
    message TEXT,
    snapshot JSON NOT NULL,
    content_hash TEXT NOT NULL,
    created_by VARCHAR(36),
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_entity_version_snapshot CHECK (json_valid(snapshot)),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE RESTRICT,
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE SET NULL,
    FOREIGN KEY(changeset_id) REFERENCES changesets (id) ON DELETE SET NULL,
    FOREIGN KEY(snapshot_id) REFERENCES snapshots (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_versions_deleted_at ON entity_versions (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_versions_changeset ON entity_versions (changeset_id);
CREATE INDEX IF NOT EXISTS idx_entity_versions_entity ON entity_versions (entity_id);

-- =============================================
-- 18. BLOCK VERSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS block_versions (
    block_id VARCHAR(36) NOT NULL,
    changeset_id VARCHAR(36),
    snapshot JSON NOT NULL,
    content_hash TEXT NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(block_id) REFERENCES blocks (id) ON DELETE CASCADE,
    FOREIGN KEY(changeset_id) REFERENCES changesets (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_block_versions_block ON block_versions (block_id);
CREATE INDEX IF NOT EXISTS idx_block_versions_deleted_at ON block_versions (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_block_versions_changeset ON block_versions (changeset_id);

-- =============================================
-- 19. ENTITY EVENTS
-- =============================================

CREATE TABLE IF NOT EXISTS entity_events (
    workspace_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    event_type TEXT NOT NULL,
    payload JSON NOT NULL,
    changeset_id VARCHAR(36),
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_entity_event_payload CHECK (json_valid(payload)),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE RESTRICT,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(changeset_id) REFERENCES changesets (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_events_workspace_entity ON entity_events (workspace_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_workspace_created ON entity_events (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_entity_events_workspace_type ON entity_events (workspace_id, event_type);
CREATE INDEX IF NOT EXISTS idx_entity_events_deleted_at ON entity_events (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 20. FILE RECORDS
-- =============================================

CREATE TABLE IF NOT EXISTS file_records (
    workspace_id VARCHAR(36) NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER DEFAULT 0 NOT NULL,
    content_hash TEXT DEFAULT '' NOT NULL,
    storage_provider TEXT DEFAULT 'local' NOT NULL,
    state TEXT DEFAULT 'READY' NOT NULL,
    object_key TEXT NOT NULL,
    uploaded_by VARCHAR(36),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    has_extracted_text BOOLEAN DEFAULT 0,
    has_metadata BOOLEAN DEFAULT 0,
    extracted_text TEXT,
    metadata_json TEXT,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_files_pending ON file_records (state, uploaded_at) WHERE state = 'PENDING' AND is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON file_records (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_files_state ON file_records (state) WHERE is_deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_files_hash_active ON file_records (workspace_id, content_hash) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_files_workspace ON file_records (workspace_id) WHERE is_deleted = 0;

-- =============================================
-- 21. ENTITY FILES
-- =============================================

CREATE TABLE IF NOT EXISTS entity_files (
    entity_id VARCHAR(36) NOT NULL,
    file_id VARCHAR(36) NOT NULL,
    block_id VARCHAR(36),
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES file_records (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_files_active ON entity_files (entity_id, file_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_files_file ON entity_files (file_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_files_deleted_at ON entity_files (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_files_entity ON entity_files (entity_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_entity_files_block ON entity_files (block_id);

-- =============================================
-- 22. ENTITY BRANCH HEADS
-- =============================================

CREATE TABLE IF NOT EXISTS entity_branch_heads (
    branch_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    current_block_id VARCHAR(36),
    current_block_created_at DATETIME,
    base_block_id VARCHAR(36),
    base_block_created_at DATETIME,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT uq_entity_branch_heads UNIQUE (branch_id, entity_id),
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_branch ON entity_branch_heads (branch_id);
CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_deleted_at ON entity_branch_heads (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_entity ON entity_branch_heads (entity_id);

-- =============================================
-- 23. EMBEDDINGS
-- =============================================

CREATE TABLE IF NOT EXISTS embeddings (
    workspace_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36),
    block_id VARCHAR(36),
    model TEXT NOT NULL,
    embedding TEXT,
    content_hash TEXT NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id)
);

CREATE INDEX IF NOT EXISTS idx_embeddings_deleted_at ON embeddings (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace_entity ON embeddings (workspace_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace ON embeddings (workspace_id) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_embeddings_block ON embeddings (block_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings (entity_id) WHERE is_deleted = 0;

-- =============================================
-- 24. GRAPH MATERIALIZATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS graph_materializations (
    workspace_id VARCHAR(36) NOT NULL,
    graph_snapshot JSON NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version_hash TEXT,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_graph_materializations_workspace ON graph_materializations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_graph_materializations_deleted_at ON graph_materializations (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 25. NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    entity_id VARCHAR(36),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT 0,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_notification_type CHECK (type IN ('update','entity_update','relation_created','backup_complete','sync_conflict','system')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications (workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE is_read = 0 AND is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications (entity_id) WHERE is_deleted = 0;

-- =============================================
-- 26. ACTIVITY ENTRIES
-- =============================================

CREATE TABLE IF NOT EXISTS activity_entries (
    workspace_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    entity_id VARCHAR(36),
    block_id VARCHAR(36),
    display_name TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSON NOT NULL,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_activity_details CHECK (json_valid(details)),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE RESTRICT,
    FOREIGN KEY(block_id) REFERENCES blocks (id)
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_entries (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_entries_deleted_at ON activity_entries (deleted_at) WHERE is_deleted = 1;

-- =============================================
-- 27. SYNC OPERATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS sync_operations (
    workspace_id VARCHAR(36) NOT NULL,
    operation_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id VARCHAR(36),
    payload JSON NOT NULL,
    device_id TEXT,
    client_clock INTEGER,
    synced BOOLEAN DEFAULT 0,
    retry_count INTEGER NOT NULL,
    error_message TEXT,
    synced_at DATETIME,
    id VARCHAR(36) DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_deleted BOOLEAN DEFAULT 0 NOT NULL,
    deleted_at DATETIME,
    deleted_by VARCHAR(36),
    PRIMARY KEY (id),
    CONSTRAINT ck_sync_payload CHECK (json_valid(payload)),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_deleted_at ON sync_operations (deleted_at) WHERE is_deleted = 1;
CREATE INDEX IF NOT EXISTS idx_sync_operations_workspace_synced ON sync_operations (workspace_id, synced) WHERE is_deleted = 0;

-- =============================================
-- 28. FTS5 SEARCH INDEXES
-- =============================================

CREATE VIRTUAL TABLE IF NOT EXISTS blocks_fts USING fts5(
    entity_id UNINDEXED,
    type UNINDEXED,
    content,
    text,
    content='blocks',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS blocks_ai AFTER INSERT ON blocks BEGIN
    INSERT INTO blocks_fts(rowid, entity_id, type, content)
    VALUES (NEW.rowid, NEW.entity_id, NEW.type, json_extract(NEW.content, '$.text'));
END;

CREATE TRIGGER IF NOT EXISTS blocks_ad AFTER DELETE ON blocks BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, entity_id, type, content)
    VALUES ('delete', OLD.rowid, OLD.entity_id, OLD.type, json_extract(OLD.content, '$.text'));
END;

CREATE TRIGGER IF NOT EXISTS blocks_au AFTER UPDATE ON blocks WHEN NEW.is_deleted = 1 AND OLD.is_deleted = 0 BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, entity_id, type, content)
    VALUES ('delete', OLD.rowid, OLD.entity_id, OLD.type, json_extract(OLD.content, '$.text'));
END;

CREATE TRIGGER IF NOT EXISTS blocks_au_content AFTER UPDATE ON blocks WHEN NEW.is_deleted = 0 BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, entity_id, type, content)
    VALUES ('delete', OLD.rowid, OLD.entity_id, OLD.type, json_extract(OLD.content, '$.text'));
    INSERT INTO blocks_fts(rowid, entity_id, type, content)
    VALUES (NEW.rowid, NEW.entity_id, NEW.type, json_extract(NEW.content, '$.text'));
END;

CREATE VIRTUAL TABLE IF NOT EXISTS search_documents_fts USING fts5(
    entity_id UNINDEXED,
    title,
    content,
    content='search_documents',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS search_documents_ai AFTER INSERT ON search_documents BEGIN
    INSERT INTO search_documents_fts(rowid, entity_id, title, content)
    VALUES (NEW.rowid, NEW.entity_id, NEW.title, NEW.content);
END;

CREATE TRIGGER IF NOT EXISTS search_documents_ad AFTER DELETE ON search_documents BEGIN
    INSERT INTO search_documents_fts(search_documents_fts, rowid, entity_id, title, content)
    VALUES ('delete', OLD.rowid, OLD.entity_id, OLD.title, OLD.content);
END;

CREATE TRIGGER IF NOT EXISTS search_documents_au AFTER UPDATE ON search_documents WHEN NEW.is_deleted = 1 AND OLD.is_deleted = 0 BEGIN
    INSERT INTO search_documents_fts(search_documents_fts, rowid, entity_id, title, content)
    VALUES ('delete', OLD.rowid, OLD.entity_id, OLD.title, OLD.content);
END;

-- =============================================
-- 29. DEFAULT DATA
-- =============================================

INSERT OR IGNORE INTO users (id, email, name) VALUES ('local', 'local@gnovium.local', 'Local System');
INSERT OR IGNORE INTO workspaces (id, name, owner_id, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000001', 'My Workspace', 'local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO entity_types (id, workspace_id, name, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Page', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO branches (id, workspace_id, name, is_default, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'main', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
