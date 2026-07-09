from app.extensions import db
from app.models.local_base import CreatedOnlyMixin, SoftDeleteMixin, TextPKMixin, TimestampMixin
from app.models.types import Vector


# ─────────────────────────────────────────────
# WORKSPACES
# ─────────────────────────────────────────────

class Workspace(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "workspaces"

    owner_id = db.Column(db.String(36))
    name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    settings = db.Column(db.JSON, default=dict)
    deployment_mode = db.Column(db.Text, default="local")


# ─────────────────────────────────────────────
# ENTITY TYPES & ENTITIES
# ─────────────────────────────────────────────

class EntityType(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_types"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    icon = db.Column(db.Text)
    config = db.Column(db.JSON, default=dict)


class Entity(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entities"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_type_id = db.Column(db.String(36), db.ForeignKey("entity_types.id", ondelete="RESTRICT"), nullable=False)
    title = db.Column(db.Text)
    icon = db.Column(db.Text)
    cover_image = db.Column(db.Text)
    is_archived = db.Column(db.Boolean, nullable=False, default=False)
    archived_at = db.Column(db.DateTime)
    created_by = db.Column(db.String(36))


# ─────────────────────────────────────────────
# BLOCKS (APPEND-ONLY)
# ─────────────────────────────────────────────

class Block(SoftDeleteMixin, db.Model):
    __tablename__ = "blocks"
    __table_args__ = (
        db.PrimaryKeyConstraint("id", "branch_id", "created_at"),
    )

    id = db.Column(db.String(36), nullable=False, default=lambda: __import__("uuid").uuid4().hex)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    branch_id = db.Column(db.String(36), nullable=False, default="main")
    parent_block_id = db.Column(db.String(36))
    block_type = db.Column(db.Text, nullable=False, default="text")
    content = db.Column(db.JSON, nullable=False, default=dict)
    position = db.Column(db.Float, nullable=False)
    indent = db.Column(db.Integer, nullable=False, default=0)
    content_hash = db.Column(db.Text, nullable=False, default="")
    created_at = db.Column(db.DateTime, nullable=False, default=__import__("datetime").datetime.utcnow)


# ─────────────────────────────────────────────
# FULL-TEXT SEARCH (models for FTS-backed tables)
# ─────────────────────────────────────────────

class SearchDocument(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "search_documents"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.Text)
    content = db.Column(db.Text)
    content_hash = db.Column(db.Text, nullable=False, default="")


# ─────────────────────────────────────────────
# PROPERTIES
# ─────────────────────────────────────────────

class Property(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "properties"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_type_id = db.Column(db.String(36), db.ForeignKey("entity_types.id", ondelete="RESTRICT"))
    name = db.Column(db.Text, nullable=False)
    property_type = db.Column(db.Text, nullable=False)
    config = db.Column(db.JSON, default=dict)


class EntityPropertyValue(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_property_values"

    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    property_id = db.Column(db.String(36), db.ForeignKey("properties.id", ondelete="CASCADE"), nullable=False)
    value = db.Column(db.JSON, nullable=False)


# ─────────────────────────────────────────────
# RELATIONS
# ─────────────────────────────────────────────

class Relation(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "relations"
    __table_args__ = (
        db.CheckConstraint("source_entity_id != target_entity_id", name="no_self_relation"),
    )

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    source_entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    relation_type = db.Column(db.Text, nullable=False)
    relation_metadata = db.Column("metadata", db.JSON, default=dict)
    created_by = db.Column(db.String(36))


# ─────────────────────────────────────────────
# TAGS
# ─────────────────────────────────────────────

class Tag(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "tags"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text)


class EntityTag(TextPKMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_tags"
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    tag_id = db.Column(db.String(36), db.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)


# ─────────────────────────────────────────────
# EVENTS
# ─────────────────────────────────────────────

class EntityEvent(TextPKMixin, CreatedOnlyMixin, db.Model):
    __tablename__ = "entity_events"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="RESTRICT"), nullable=False)
    event_type = db.Column(db.Text, nullable=False)
    payload = db.Column(db.JSON, nullable=False)
    changeset_id = db.Column(db.String(36))


# ─────────────────────────────────────────────
# FILES
# ─────────────────────────────────────────────

class File(TextPKMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "files"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    file_name = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.Text)
    file_size = db.Column(db.Integer)
    content_hash = db.Column(db.Text, nullable=False)
    storage_provider = db.Column(db.Text, nullable=False, default="local")
    object_key = db.Column(db.Text, nullable=False)
    public_url = db.Column(db.Text)
    uploaded_by = db.Column(db.String(36))
    uploaded_at = db.Column(db.DateTime, nullable=False, default=__import__("datetime").datetime.utcnow)


class EntityFile(TextPKMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_files"

    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    file_id = db.Column(db.String(36), db.ForeignKey("files.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(db.String(36))


# ─────────────────────────────────────────────
# BRANCHES
# ─────────────────────────────────────────────

class Branch(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "branches"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    parent_branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="SET NULL"))
    name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    created_by = db.Column(db.String(36))
    is_default = db.Column(db.Boolean, default=False)


class BranchHead(db.Model):
    __tablename__ = "branch_heads"
    __table_args__ = (
        db.PrimaryKeyConstraint("branch_id", "entity_id"),
    )

    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(db.String(36), nullable=False)
    block_created_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=__import__("datetime").datetime.utcnow)


class EntityBranchHead(TextPKMixin, db.Model):
    __tablename__ = "entity_branch_heads"
    __table_args__ = (
        db.UniqueConstraint("branch_id", "entity_id", name="uq_entity_branch_heads"),
    )

    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    current_block_id = db.Column(db.String(36))
    current_block_created_at = db.Column(db.DateTime)
    base_block_id = db.Column(db.String(36))
    base_block_created_at = db.Column(db.DateTime)


class BranchMerge(TextPKMixin, db.Model):
    __tablename__ = "branch_merges"
    __table_args__ = (
        db.CheckConstraint("source_branch_id != target_branch_id", name="no_self_merge"),
    )

    source_branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    target_branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    created_by = db.Column(db.String(36))
    merged_at = db.Column(db.DateTime, nullable=False, default=__import__("datetime").datetime.utcnow)
    status = db.Column(db.Text, nullable=False, default="completed")
    merge_metadata = db.Column("metadata", db.JSON, default=dict)


class MergeConflict(TextPKMixin, db.Model):
    __tablename__ = "merge_conflicts"

    merge_id = db.Column(db.String(36), db.ForeignKey("branch_merges.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    conflict_type = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON, nullable=False)
    resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.String(36))
    resolution = db.Column(db.Text)
    resolved_at = db.Column(db.DateTime)


# ─────────────────────────────────────────────
# SNAPSHOTS
# ─────────────────────────────────────────────

class Snapshot(TextPKMixin, CreatedOnlyMixin, db.Model):
    __tablename__ = "snapshots"

    branch_id = db.Column(db.String(36), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    created_by = db.Column(db.String(36))


class SnapshotBlock(db.Model):
    __tablename__ = "snapshot_blocks"
    __table_args__ = (
        db.PrimaryKeyConstraint("snapshot_id", "block_id"),
    )

    snapshot_id = db.Column(db.String(36), db.ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(db.String(36), nullable=False)
    block_created_at = db.Column(db.DateTime)
    entity_id = db.Column(db.String(36), nullable=False)


# ─────────────────────────────────────────────
# EMBEDDINGS (AI / Semantic Search)
# ─────────────────────────────────────────────

class Embedding(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "embeddings"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"))
    block_id = db.Column(db.String(36))
    model = db.Column(db.Text, nullable=False)
    embedding = db.Column(Vector(1024))
    content_hash = db.Column(db.Text, nullable=False)


# ─────────────────────────────────────────────
# GRAPH MATERIALIZATIONS
# ─────────────────────────────────────────────

class GraphMaterialization(TextPKMixin, db.Model):
    __tablename__ = "graph_materializations"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    graph_snapshot = db.Column(db.JSON, nullable=False)
    generated_at = db.Column(db.DateTime, nullable=False, default=__import__("datetime").datetime.utcnow)
    version_hash = db.Column(db.Text)


# ─────────────────────────────────────────────
# COMMENTS
# ─────────────────────────────────────────────

class Comment(TextPKMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "comments"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"))
    block_id = db.Column(db.String(36))
    parent_comment_id = db.Column(db.String(36), db.ForeignKey("comments.id", ondelete="CASCADE"))
    author_id = db.Column(db.String(36))
    content = db.Column(db.Text, nullable=False)


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

class Notification(TextPKMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "notifications"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36))
    entity_id = db.Column(db.String(36), db.ForeignKey("entities.id", ondelete="CASCADE"))
    type = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)


# ─────────────────────────────────────────────
# GOVERNANCE & AUDIT
# ─────────────────────────────────────────────

class GovernanceReport(TextPKMixin, CreatedOnlyMixin, db.Model):
    __tablename__ = "governance_reports"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    health_score = db.Column(db.Float)
    duplicate_count = db.Column(db.Integer, default=0)
    orphan_count = db.Column(db.Integer, default=0)
    stale_count = db.Column(db.Integer, default=0)
    report = db.Column(db.JSON, default=dict)


class ActivityLog(TextPKMixin, CreatedOnlyMixin, db.Model):
    __tablename__ = "activity_log"

    workspace_id = db.Column(db.String(36), db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.String(36))
    entity_id = db.Column(db.String(36))
    block_id = db.Column(db.String(36))
    action = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON, default=dict)
