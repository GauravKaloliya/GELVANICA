-- =============================================
-- GNOVIUM KNOWLEDGE OS - POSTGRESQL SCHEMA FOR CLOUD MODE
-- =============================================
-- This schema is a reference for the NeonDB deployment.
-- The actual cloud schema is managed via Alembic migrations
-- auto-generated from app/models/domain.py.
--
-- Tables intentionally absent vs SQLite schema:
--   - devices: device tracking folded into sync_operations.device_id
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================
-- USERS & WORKSPACES
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_jti TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    deployment_mode TEXT
        CHECK (
            deployment_mode IN ('local', 'cloud')
        )
        DEFAULT 'local',
    sync_enabled BOOLEAN DEFAULT FALSE,  -- Cloud-only: enables sync for local-linked workspaces
    cloud_workspace_id TEXT NULL,         -- Cloud-only: references the linked local workspace
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),  -- Consider CREATE TYPE user_role AS ENUM if roles are stable
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- ENTITY TYPES & ENTITIES
-- =============================================

CREATE TABLE entity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_type_id UUID NOT NULL REFERENCES entity_types(id) ON DELETE RESTRICT,
    title TEXT,
    icon TEXT,
    cover_image TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- BLOCKS
-- =============================================

CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    parent_block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL,
    position NUMERIC(20,10) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- PROPERTIES
-- =============================================

CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_type_id UUID REFERENCES entity_types(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    property_type TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE entity_property_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- KNOWLEDGE GRAPH
-- =============================================

CREATE TABLE relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT no_self_relation CHECK (source_entity_id != target_entity_id)
);

-- =============================================
-- VERSIONING & BRANCHING (History Protected)
-- =============================================

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_default BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE changesets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    snapshot_id UUID REFERENCES snapshots(id) ON DELETE SET NULL,
    message TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entity_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,  -- Protected
    changeset_id UUID REFERENCES changesets(id) ON DELETE SET NULL,
    snapshot JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE block_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE RESTRICT,   -- Protected
    changeset_id UUID REFERENCES changesets(id) ON DELETE SET NULL,
    snapshot JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE entity_branch_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    current_version_id UUID REFERENCES entity_versions(id) ON DELETE SET NULL,  -- NULL if version purged; app falls back to base_version or latest block state
    base_version_id UUID REFERENCES entity_versions(id) ON DELETE SET NULL,
    UNIQUE(branch_id, entity_id)
);

CREATE TABLE branch_merges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    target_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    merged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'completed' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    metadata JSONB DEFAULT '{}',
    CONSTRAINT no_self_merge CHECK (source_branch_id != target_branch_id)
);

CREATE TABLE merge_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merge_id UUID NOT NULL REFERENCES branch_merges(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    conflict_type TEXT NOT NULL,
    details JSONB NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution TEXT,
    resolved_at TIMESTAMPTZ
);

CREATE TABLE entity_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE RESTRICT,  -- Protected
    changeset_id UUID REFERENCES changesets(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- NULL changeset_id means the event was created outside a versioning context (e.g. import, direct edit)

-- =============================================
-- AI / SEARCH / FILES / COLLAB
-- =============================================

CREATE TABLE embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,  -- Preserve embedding for historical queries after block deletion
    model TEXT NOT NULL,
    embedding VECTOR(1024),
    content_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE search_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    content_hash TEXT NOT NULL DEFAULT '',
    search_vector TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    storage_provider TEXT DEFAULT 'aws_s3',
    object_key TEXT NOT NULL,
    public_url TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE entity_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    block_id UUID REFERENCES blocks(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_id UUID REFERENCES entities(id) ON DELETE RESTRICT,   -- Protected
    block_id UUID REFERENCES blocks(id) ON DELETE RESTRICT,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE governance_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    health_score NUMERIC(5,2),  -- Integer 0-100 (formula: max(0, 100 - duplicates*5 - orphans*2 - stale))
    duplicate_count INTEGER DEFAULT 0,
    orphan_count INTEGER DEFAULT 0,
    stale_count INTEGER DEFAULT 0,
    report JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- TAGS
-- =============================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE entity_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE graph_materializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    graph_snapshot JSONB NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_hash TEXT
);

CREATE TABLE sync_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    operation_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,  -- No FK: sync operations may reference entities not yet created (offline-first)
    payload JSONB NOT NULL,
    device_id TEXT,
    client_clock BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced BOOLEAN DEFAULT FALSE,
    synced_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    payload JSONB NOT NULL,
    result JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- PARTIAL UNIQUE INDEXES (Soft-Delete Safe)
-- =============================================

CREATE UNIQUE INDEX uq_entity_types_workspace_name
    ON entity_types(workspace_id, name) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_tags_workspace_name
    ON tags(workspace_id, name) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_properties_workspace_name_type
    ON properties(workspace_id, name, entity_type_id) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_search_documents_workspace_entity
    ON search_documents(workspace_id, entity_id) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_blocks_entity_position
    ON blocks(entity_id, position) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_relations_active
    ON relations(source_entity_id, target_entity_id, relation_type) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_entity_tags_active
    ON entity_tags(entity_id, tag_id) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_entity_files_active
    ON entity_files(entity_id, file_id) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_entity_property_values_active
    ON entity_property_values(entity_id, property_id) WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_workspace_members_active
    ON workspace_members(workspace_id, user_id) WHERE is_deleted = FALSE;

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_entities_workspace_active ON entities(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entities_type ON entities(entity_type_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entities_archived ON entities(archived_at) WHERE archived_at IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX idx_sessions_user_active ON sessions(user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_blocks_entity_active ON blocks(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_relations_source_active ON relations(source_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_relations_target_active ON relations(target_entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_entity ON comments(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_block ON comments(block_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE AND is_deleted = FALSE;
CREATE INDEX idx_notifications_entity ON notifications(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entity_tags_tag ON entity_tags(tag_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entity_files_entity ON entity_files(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entity_files_file ON entity_files(file_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_entity_property_values_entity ON entity_property_values(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_tags_workspace ON tags(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_properties_workspace ON properties(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_branches_workspace ON branches(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_branches_default ON branches(workspace_id, is_default) WHERE is_deleted = FALSE;
CREATE INDEX idx_embeddings_entity ON embeddings(entity_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_embeddings_workspace ON embeddings(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_search_documents_workspace ON search_documents(workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_search_vector_active ON search_documents USING GIN(search_vector) WHERE is_deleted = FALSE;
CREATE INDEX idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX idx_entity_branch_heads_branch ON entity_branch_heads(branch_id);
CREATE INDEX idx_entity_versions_entity ON entity_versions(entity_id);
CREATE INDEX idx_jobs_workspace_status ON jobs(workspace_id, status) WHERE is_deleted = FALSE;
CREATE INDEX idx_sync_operations_workspace_synced ON sync_operations(workspace_id, synced) WHERE is_deleted = FALSE;
-- Secondary BRIN index for efficient time-range scans on large activity tables:
CREATE INDEX idx_activity_logs_created_brin ON activity_logs USING BRIN(created_at) WITH (pages_per_range = 32);

-- =============================================
-- DELETED_AT INDEXES (Purge-Job Support)
-- =============================================

CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_workspaces_deleted_at ON workspaces(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_workspace_members_deleted_at ON workspace_members(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_entities_deleted_at ON entities(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_entity_types_deleted_at ON entity_types(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_blocks_deleted_at ON blocks(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_properties_deleted_at ON properties(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_entity_property_values_deleted_at ON entity_property_values(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_relations_deleted_at ON relations(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_tags_deleted_at ON tags(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_entity_tags_deleted_at ON entity_tags(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_branches_deleted_at ON branches(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_embeddings_deleted_at ON embeddings(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_search_documents_deleted_at ON search_documents(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_files_deleted_at ON files(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_entity_files_deleted_at ON entity_files(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_comments_deleted_at ON comments(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_notifications_deleted_at ON notifications(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_sync_operations_deleted_at ON sync_operations(deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX idx_jobs_deleted_at ON jobs(deleted_at) WHERE is_deleted = TRUE;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_entities_updated_at BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_blocks_updated_at BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_entity_property_values_updated_at BEFORE UPDATE ON entity_property_values FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_search_documents_updated_at BEFORE UPDATE ON search_documents FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trigger_workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION update_timestamp();
