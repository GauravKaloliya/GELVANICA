-- =============================================
-- GNOVIUM KNOWLEDGE OS - POSTGRESQL SCHEMA (CLOUD MODE)
-- =============================================
-- Auto-generated from app/models/domain.py
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================
-- USERS & AUTH
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    profile_image_url TEXT,
    password_hash TEXT,
    google_id TEXT,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    UNIQUE (email),
    UNIQUE (google_id),
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS sessions (
    user_id UUID NOT NULL,
    jti TEXT,
    refresh_jti TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    revoked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE (refresh_jti),
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_codes (
    code TEXT NOT NULL,
    user_id UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    redirect_uri TEXT,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    UNIQUE (code),
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_codes_user_id ON auth_codes (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_codes_code ON auth_codes (code) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_codes_deleted_at ON auth_codes (deleted_at) WHERE is_deleted = TRUE;

-- =============================================
-- WORKSPACES
-- =============================================

CREATE TABLE IF NOT EXISTS workspaces (
    owner_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    settings JSON DEFAULT '{}'::jsonb,
    deployment_mode TEXT DEFAULT 'local',
    sync_enabled BOOLEAN DEFAULT false,
    cloud_workspace_id UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_workspace_deployment_mode CHECK (deployment_mode IN ('local', 'cloud')),
    FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE RESTRICT,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces (owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_workspace_member_role CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE RESTRICT,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspace_members_active ON workspace_members (workspace_id, user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_deleted_at ON workspace_members (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members (workspace_id);

-- =============================================
-- ENTITY TYPES & ENTITIES
-- =============================================

CREATE TABLE IF NOT EXISTS entity_types (
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    color TEXT,
    config JSON DEFAULT '{}',
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_types_workspace ON entity_types (workspace_id);
CREATE INDEX IF NOT EXISTS idx_entity_types_deleted_at ON entity_types (deleted_at) WHERE is_deleted = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_types_workspace_name ON entity_types (workspace_id, name) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS entities (
    workspace_id UUID NOT NULL,
    entity_type_id UUID NOT NULL,
    name TEXT,
    icon TEXT,
    color TEXT,
    cover_image TEXT,
    parent_id UUID,
    sort_order INTEGER DEFAULT 0,
    summary TEXT,
    is_favorite BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    block_count INTEGER DEFAULT 0,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_type_id) REFERENCES entity_types (id) ON DELETE RESTRICT,
    FOREIGN KEY(parent_id) REFERENCES entities (id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (entity_type_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entities_archived ON entities (archived_at) WHERE archived_at IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entities_deleted_at ON entities (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_entities_parent ON entities (parent_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entities_workspace_active ON entities (workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS ix_entities_parent_id ON entities (parent_id);
CREATE INDEX IF NOT EXISTS idx_entities_created_by ON entities (created_by);

-- =============================================
-- VERSIONING & BRANCHING
-- =============================================

CREATE TABLE IF NOT EXISTS branches (
    workspace_id UUID NOT NULL,
    parent_branch_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    created_by UUID,
    version INTEGER NOT NULL DEFAULT 1,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(parent_branch_id) REFERENCES branches (id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_branches_default ON branches (workspace_id, is_default) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_branches_parent_branch_id ON branches (parent_branch_id);
CREATE INDEX IF NOT EXISTS idx_branches_deleted_at ON branches (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_branches_created_by ON branches (created_by);
CREATE INDEX IF NOT EXISTS idx_branches_workspace ON branches (workspace_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS snapshots (
    branch_id UUID NOT NULL,
    name TEXT,
    description TEXT,
    metadata JSON DEFAULT '{}',
    created_by UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_branch_id ON snapshots (branch_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_by ON snapshots (created_by);
CREATE INDEX IF NOT EXISTS idx_snapshots_deleted_at ON snapshots (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS changesets (
    branch_id UUID NOT NULL,
    snapshot_id UUID,
    message TEXT,
    created_by UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(snapshot_id) REFERENCES snapshots (id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_changesets_deleted_at ON changesets (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_changesets_created_by ON changesets (created_by);
CREATE INDEX IF NOT EXISTS idx_changesets_snapshot_id ON changesets (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_changesets_branch ON changesets (branch_id);

CREATE TABLE IF NOT EXISTS entity_versions (
    entity_id UUID NOT NULL,
    branch_id UUID,
    changeset_id UUID,
    snapshot_id UUID,
    version INTEGER,
    message TEXT,
    snapshot JSON NOT NULL,
    content_hash TEXT NOT NULL,
    created_by UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE RESTRICT,
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE SET NULL,
    FOREIGN KEY(changeset_id) REFERENCES changesets (id) ON DELETE SET NULL,
    FOREIGN KEY(snapshot_id) REFERENCES snapshots (id) ON DELETE SET NULL,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_versions_branch_id ON entity_versions (branch_id);
CREATE INDEX IF NOT EXISTS idx_entity_versions_entity ON entity_versions (entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_versions_snapshot_id ON entity_versions (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_entity_versions_deleted_at ON entity_versions (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_entity_versions_changeset ON entity_versions (changeset_id);
CREATE INDEX IF NOT EXISTS idx_entity_versions_created_by ON entity_versions (created_by);

CREATE TABLE IF NOT EXISTS entity_branch_heads (
    branch_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    current_version_id UUID,
    base_version_id UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT uq_entity_branch_heads UNIQUE (branch_id, entity_id),
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(current_version_id) REFERENCES entity_versions (id) ON DELETE SET NULL,
    FOREIGN KEY(base_version_id) REFERENCES entity_versions (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_entity ON entity_branch_heads (entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_branch ON entity_branch_heads (branch_id);
CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_base_version ON entity_branch_heads (base_version_id);
CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_current_version ON entity_branch_heads (current_version_id);
CREATE INDEX IF NOT EXISTS idx_entity_branch_heads_deleted_at ON entity_branch_heads (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS branch_merges (
    source_branch_id UUID NOT NULL,
    target_branch_id UUID NOT NULL,
    created_by UUID,
    merged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    status TEXT DEFAULT 'completed' NOT NULL,
    metadata JSON DEFAULT '{}',
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT no_self_merge CHECK (source_branch_id != target_branch_id),
    CONSTRAINT ck_branch_merge_status CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    FOREIGN KEY(source_branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(target_branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_branch_merges_source_branch_id ON branch_merges (source_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_merges_deleted_at ON branch_merges (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_branch_merges_target_branch_id ON branch_merges (target_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_merges_created_by ON branch_merges (created_by);

CREATE TABLE IF NOT EXISTS merge_conflicts (
    merge_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    conflict_type TEXT NOT NULL,
    details JSON NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID,
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(merge_id) REFERENCES branch_merges (id) ON DELETE CASCADE,
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(resolved_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_merge_conflicts_workspace_id ON merge_conflicts (workspace_id);
CREATE INDEX IF NOT EXISTS idx_merge_conflicts_resolved_by ON merge_conflicts (resolved_by);
CREATE INDEX IF NOT EXISTS idx_merge_conflicts_entity_id ON merge_conflicts (entity_id);
CREATE INDEX IF NOT EXISTS idx_merge_conflicts_merge_id ON merge_conflicts (merge_id);
CREATE INDEX IF NOT EXISTS idx_merge_conflicts_deleted_at ON merge_conflicts (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS entity_events (
    workspace_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID,
    changeset_id UUID,
    event_type TEXT NOT NULL,
    payload JSON NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE RESTRICT,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(changeset_id) REFERENCES changesets (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_events_workspace_created ON entity_events (workspace_id, created_at);
CREATE INDEX IF NOT EXISTS idx_entity_events_deleted_at ON entity_events (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_entity_events_workspace_type ON entity_events (workspace_id, event_type);
CREATE INDEX IF NOT EXISTS idx_entity_events_changeset_id ON entity_events (changeset_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_workspace_entity ON entity_events (workspace_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_user_id ON entity_events (user_id);

-- =============================================
-- BLOCKS
-- =============================================

CREATE TABLE IF NOT EXISTS blocks (
    entity_id UUID NOT NULL,
    parent_block_id UUID,
    type TEXT NOT NULL,
    position NUMERIC(20, 10) NOT NULL,
    content JSON DEFAULT '{}' NOT NULL,
    properties JSON DEFAULT '{}'::jsonb,
    branch_id UUID DEFAULT '00000000-0000-0000-0000-000000000003' NOT NULL,
    content_hash TEXT DEFAULT '' NOT NULL,
    indent INTEGER DEFAULT 0 NOT NULL,
    version INTEGER NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(parent_block_id) REFERENCES blocks (id) ON DELETE CASCADE,
    FOREIGN KEY(branch_id) REFERENCES branches (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blocks_parent_block_id ON blocks (parent_block_id);
CREATE INDEX IF NOT EXISTS idx_blocks_entity_active ON blocks (entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_blocks_deleted_at ON blocks (deleted_at) WHERE is_deleted = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_blocks_entity_position ON blocks (entity_id, position) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_blocks_entity_branch_active ON blocks (entity_id, branch_id) WHERE is_deleted = FALSE;

-- =============================================
-- BLOCK VERSIONS
-- =============================================

CREATE TABLE IF NOT EXISTS block_versions (
    block_id UUID NOT NULL,
    changeset_id UUID,
    snapshot JSON NOT NULL,
    content_hash TEXT NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(block_id) REFERENCES blocks (id) ON DELETE RESTRICT,
    FOREIGN KEY(changeset_id) REFERENCES changesets (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_block_versions_block_id ON block_versions (block_id);
CREATE INDEX IF NOT EXISTS idx_block_versions_deleted_at ON block_versions (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_block_versions_changeset_id ON block_versions (changeset_id);

-- =============================================
-- PROPERTIES
-- =============================================

CREATE TABLE IF NOT EXISTS entity_properties (
    workspace_id UUID NOT NULL,
    entity_type_id UUID,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT false,
    options JSON DEFAULT '{}',
    config JSON DEFAULT '{}',
    default_value JSON,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_property_type CHECK (type IN ('text','number','date','select','multi_select','checkbox','url','email','phone','rich_text','boolean','entity_ref')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_type_id) REFERENCES entity_types (id) ON DELETE RESTRICT,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_properties_entity_type_id ON entity_properties (entity_type_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_properties_workspace_name_type ON entity_properties (workspace_id, name, type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_properties_workspace ON entity_properties (workspace_id);
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON entity_properties (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS entity_property_values (
    entity_id UUID NOT NULL,
    property_id UUID NOT NULL,
    value JSON NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(property_id) REFERENCES entity_properties (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_property_values_property_id ON entity_property_values (property_id);
CREATE INDEX IF NOT EXISTS idx_entity_property_values_deleted_at ON entity_property_values (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_entity_property_values_entity ON entity_property_values (entity_id) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_property_values_active ON entity_property_values (entity_id, property_id) WHERE is_deleted = FALSE;

-- =============================================
-- KNOWLEDGE GRAPH
-- =============================================

CREATE TABLE IF NOT EXISTS relations (
    workspace_id UUID NOT NULL,
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    type TEXT NOT NULL,
    label TEXT,
    properties JSON DEFAULT '{}',
    generated_by TEXT DEFAULT 'manual' NOT NULL,
    verified BOOLEAN DEFAULT true NOT NULL,
    confidence FLOAT,
    ai_model TEXT,
    created_by UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT no_self_relation CHECK (source_id != target_id),
    CONSTRAINT ck_relation_generated_by CHECK (generated_by IN ('manual', 'ai')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(source_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_relations_active ON relations (workspace_id, source_id, target_id, type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_relations_source_active ON relations (source_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_relations_deleted_at ON relations (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_relations_target_active ON relations (target_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_relations_created_by ON relations (created_by);
CREATE INDEX IF NOT EXISTS idx_relations_workspace ON relations (workspace_id);

-- =============================================
-- TAGS
-- =============================================

CREATE TABLE IF NOT EXISTS tags (
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    entity_count INTEGER DEFAULT 0,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_workspace_name ON tags (workspace_id, name) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tags_deleted_at ON tags (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_tags_workspace ON tags (workspace_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS entity_tags (
    entity_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags (tag_id) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_tags_active ON entity_tags (entity_id, tag_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entity_tags_deleted_at ON entity_tags (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags (entity_id) WHERE is_deleted = FALSE;

-- =============================================
-- FILES
-- =============================================

CREATE TABLE IF NOT EXISTS file_records (
    workspace_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0 NOT NULL,
    content_hash TEXT NOT NULL,
    state TEXT DEFAULT 'READY' NOT NULL,
    storage_provider TEXT DEFAULT 'aws_s3',
    object_key TEXT NOT NULL,
    object_lock_mode TEXT,
    object_lock_retain_until TIMESTAMP WITH TIME ZONE,
    legal_hold_status BOOLEAN,
    uploaded_by UUID,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    has_extracted_text BOOLEAN DEFAULT false,
    has_metadata BOOLEAN DEFAULT false,
    extracted_text TEXT,
    metadata_json JSON,
    storage_class TEXT DEFAULT 'STANDARD',
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_file_object_lock_mode CHECK (object_lock_mode IS NULL OR object_lock_mode IN ('GOVERNANCE', 'COMPLIANCE')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_files_state ON file_records (state) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_files_pending ON file_records (state, uploaded_at) WHERE state = 'PENDING' AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_files_workspace ON file_records (workspace_id) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_files_hash_active ON file_records (workspace_id, content_hash) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_file_records_uploaded_by ON file_records (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON file_records (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS entity_files (
    entity_id UUID NOT NULL,
    file_id UUID NOT NULL,
    block_id UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES file_records (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_files_active ON entity_files (entity_id, file_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entity_files_deleted_at ON entity_files (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_entity_files_entity ON entity_files (entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entity_files_file ON entity_files (file_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_entity_files_block_id ON entity_files (block_id);

CREATE TABLE IF NOT EXISTS file_variants (
    file_id UUID NOT NULL,
    variant_type TEXT NOT NULL,
    object_key TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    file_size BIGINT,
    algorithm TEXT,
    algorithm_version TEXT,
    quality INTEGER,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(file_id) REFERENCES file_records (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_file_variants_file ON file_variants (file_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_file_variants_deleted_at ON file_variants (deleted_at) WHERE is_deleted = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_file_variants_active ON file_variants (file_id, variant_type) WHERE is_deleted = FALSE;

-- =============================================
-- INVITES
-- =============================================

CREATE TABLE IF NOT EXISTS invites (
    workspace_id UUID NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    invited_by UUID NOT NULL,
    token TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_invite_role CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
    CONSTRAINT ck_invite_status CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(invited_by) REFERENCES users (id) ON DELETE RESTRICT,
    UNIQUE (token),
    FOREIGN KEY(accepted_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites (token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invites_workspace ON invites (workspace_id);
CREATE INDEX IF NOT EXISTS idx_invites_deleted_at ON invites (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_invites_invited_by ON invites (invited_by);
CREATE UNIQUE INDEX IF NOT EXISTS uq_invites_workspace_email_pending ON invites (workspace_id, email) WHERE status = 'pending' AND is_deleted = FALSE;

-- =============================================
-- COMMENTS & COLLABORATION
-- =============================================

CREATE TABLE IF NOT EXISTS comments (
    workspace_id UUID NOT NULL,
    entity_id UUID,
    block_id UUID,
    parent_id UUID,
    user_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    content TEXT NOT NULL,
    resolved BOOLEAN DEFAULT false,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id) ON DELETE CASCADE,
    FOREIGN KEY(parent_id) REFERENCES comments (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE RESTRICT,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_comments_workspace_entity ON comments (workspace_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments (entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_block ON comments (block_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments (deleted_at) WHERE is_deleted = TRUE;

CREATE TABLE IF NOT EXISTS comment_reactions (
    comment_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reaction TEXT NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(comment_id) REFERENCES comments (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE RESTRICT,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comment_reactions_user ON comment_reactions (comment_id, user_id, reaction) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions (comment_id);

-- =============================================
-- ACTIVITY & GOVERNANCE
-- =============================================

CREATE TABLE IF NOT EXISTS activity_entries (
    workspace_id UUID NOT NULL,
    entity_id UUID,
    user_id UUID,
    display_name TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSON DEFAULT '{}',
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE RESTRICT,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_entries_user_id ON activity_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_entity_id ON activity_entries (entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_deleted_at ON activity_entries (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_entries (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_brin ON activity_entries USING brin (created_at) WITH (pages_per_range = 32);

CREATE TABLE IF NOT EXISTS governance_reports (
    workspace_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    data JSON,
    params JSON,
    created_by UUID,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_governance_report_type CHECK (type IN ('access_audit','change_log','storage_summary','activity_summary','compliance','health_check')),
    CONSTRAINT ck_governance_report_status CHECK (status IN ('pending','running','completed','failed')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_governance_reports_workspace_id ON governance_reports (workspace_id);
CREATE INDEX IF NOT EXISTS idx_governance_reports_deleted_at ON governance_reports (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_governance_reports_created_by ON governance_reports (created_by);

-- =============================================
-- NOTIFICATIONS
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
    workspace_id UUID NOT NULL,
    user_id UUID NOT NULL,
    entity_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT false,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_notification_type CHECK (type IN ('mention','comment','update','entity_update','invite','relation_created','backup_complete','sync_conflict','system','share','version_created','export_complete','import_complete','governance_report_ready','system_alert')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE is_read = FALSE AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications (entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications (workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications (deleted_at) WHERE is_deleted = TRUE;

-- =============================================
-- AI / SEARCH / EMBEDDINGS
-- =============================================

CREATE TABLE IF NOT EXISTS embeddings (
    workspace_id UUID NOT NULL,
    entity_id UUID,
    block_id UUID,
    model TEXT NOT NULL,
    embedding VECTOR(1024),
    content_hash TEXT NOT NULL,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_embeddings_deleted_at ON embeddings (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace_entity ON embeddings (workspace_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_workspace ON embeddings (workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_embeddings_block_id ON embeddings (block_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_entity ON embeddings (entity_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS search_documents (
    workspace_id UUID NOT NULL,
    entity_id UUID NOT NULL,
    block_id UUID,
    title TEXT,
    content TEXT,
    content_hash TEXT DEFAULT '' NOT NULL,
    search_vector TSVECTOR,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(entity_id) REFERENCES entities (id) ON DELETE CASCADE,
    FOREIGN KEY(block_id) REFERENCES blocks (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_search_documents_workspace_entity ON search_documents (workspace_id, entity_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_search_documents_block_id ON search_documents (block_id);
CREATE INDEX IF NOT EXISTS idx_search_documents_workspace ON search_documents (workspace_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_search_documents_deleted_at ON search_documents (deleted_at) WHERE is_deleted = TRUE;

-- =============================================
-- SYNC & JOBS (Cloud)
-- =============================================

CREATE TABLE IF NOT EXISTS sync_operations (
    workspace_id UUID NOT NULL,
    operation_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    payload JSON NOT NULL,
    device_id TEXT,
    client_clock BIGINT,
    synced BOOLEAN DEFAULT false,
    retry_count INTEGER NOT NULL,
    error_message TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_operations_deleted_at ON sync_operations (deleted_at) WHERE is_deleted = TRUE;
CREATE INDEX IF NOT EXISTS idx_sync_operations_deleted_by ON sync_operations (deleted_by);
CREATE INDEX IF NOT EXISTS idx_sync_operations_workspace_status ON sync_operations (workspace_id, synced) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS jobs (
    workspace_id UUID,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    message TEXT,
    priority TEXT NOT NULL,
    payload JSON NOT NULL,
    result JSON,
    error JSON,
    idempotency_key TEXT,
    retry_count INTEGER NOT NULL,
    max_retries INTEGER NOT NULL,
    timeout_seconds INTEGER,
    created_by UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    schedule_at TIMESTAMP WITH TIME ZONE,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    CONSTRAINT ck_job_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'dead_letter')),
    CONSTRAINT ck_job_priority CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace ON jobs (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_idempotency_key ON jobs (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_status_type ON jobs (status, type) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs (created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs (deleted_at) WHERE is_deleted = TRUE;

-- =============================================
-- GRAPH MATERIALIZATIONS (Internal)
-- =============================================

CREATE TABLE IF NOT EXISTS graph_materializations (
    workspace_id UUID NOT NULL,
    graph_snapshot JSON NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    version_hash TEXT,
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID,
    PRIMARY KEY (id),
    FOREIGN KEY(workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
    FOREIGN KEY(deleted_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_graph_materializations_workspace_id ON graph_materializations (workspace_id);
CREATE INDEX IF NOT EXISTS idx_graph_materializations_deleted_at ON graph_materializations (deleted_at) WHERE is_deleted = TRUE;

-- =============================================
-- TRIGGERS (updated_at auto-update)
-- =============================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_users_updated_at') THEN
        CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_workspaces_updated_at') THEN
        CREATE TRIGGER trigger_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_workspace_members_updated_at') THEN
        CREATE TRIGGER trigger_workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_entity_types_updated_at') THEN
        CREATE TRIGGER trigger_entity_types_updated_at BEFORE UPDATE ON entity_types FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_entities_updated_at') THEN
        CREATE TRIGGER trigger_entities_updated_at BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_branches_updated_at') THEN
        CREATE TRIGGER trigger_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_blocks_updated_at') THEN
        CREATE TRIGGER trigger_blocks_updated_at BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_entity_properties_updated_at') THEN
        CREATE TRIGGER trigger_entity_properties_updated_at BEFORE UPDATE ON entity_properties FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_entity_property_values_updated_at') THEN
        CREATE TRIGGER trigger_entity_property_values_updated_at BEFORE UPDATE ON entity_property_values FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_relations_updated_at') THEN
        CREATE TRIGGER trigger_relations_updated_at BEFORE UPDATE ON relations FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_tags_updated_at') THEN
        CREATE TRIGGER trigger_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_file_records_updated_at') THEN
        CREATE TRIGGER trigger_file_records_updated_at BEFORE UPDATE ON file_records FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_file_variants_updated_at') THEN
        CREATE TRIGGER trigger_file_variants_updated_at BEFORE UPDATE ON file_variants FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_invites_updated_at') THEN
        CREATE TRIGGER trigger_invites_updated_at BEFORE UPDATE ON invites FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_comments_updated_at') THEN
        CREATE TRIGGER trigger_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_embeddings_updated_at') THEN
        CREATE TRIGGER trigger_embeddings_updated_at BEFORE UPDATE ON embeddings FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_search_documents_updated_at') THEN
        CREATE TRIGGER trigger_search_documents_updated_at BEFORE UPDATE ON search_documents FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_operations_updated_at') THEN
        CREATE TRIGGER trigger_sync_operations_updated_at BEFORE UPDATE ON sync_operations FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_graph_materializations_updated_at') THEN
        CREATE TRIGGER trigger_graph_materializations_updated_at BEFORE UPDATE ON graph_materializations FOR EACH ROW EXECUTE FUNCTION update_timestamp();;
    END IF;
END;
$$;

-- =============================================
-- TRIGGERS (search_vector auto-populate)
-- =============================================

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_search_documents_tsvector ON search_documents;
CREATE TRIGGER trg_search_documents_tsvector
    BEFORE INSERT OR UPDATE OF title, content
    ON search_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();
