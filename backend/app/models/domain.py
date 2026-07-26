from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, Column, ForeignKey, Index, Integer, Text, Boolean, JSON, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import validates

from app.extensions import db
from app.models.base import CreatedOnlyMixin, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.types import TSVectorType, Vector

FK = PG_UUID(as_uuid=False)
def _UTCNOW():
    return datetime.now(timezone.utc)


class User(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "users"
    __table_args__ = (
        Index("idx_users_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    email = db.Column(db.Text, unique=True, nullable=False)
    name = db.Column(db.Text)
    avatar_url = db.Column(db.Text)
    profile_image_url = db.Column(db.Text, nullable=True)
    password_hash = db.Column(db.Text)
    google_id = db.Column(db.Text, unique=True)

    workspaces = db.relationship("Workspace", back_populates="owner", lazy="selectin", foreign_keys="Workspace.owner_id")
    workspace_memberships = db.relationship("WorkspaceMember", back_populates="user", lazy="selectin", foreign_keys="WorkspaceMember.user_id")
    sessions = db.relationship("Session", back_populates="user", lazy="selectin", primaryjoin="User.id == Session.user_id", foreign_keys="Session.user_id")
    auth_codes = db.relationship("AuthCode", back_populates="user", lazy="selectin", primaryjoin="User.id == AuthCode.user_id", foreign_keys="AuthCode.user_id")
    notifications = db.relationship("Notification", back_populates="user", lazy="selectin", foreign_keys="Notification.user_id")
    activity_logs = db.relationship("ActivityLog", back_populates="user", lazy="selectin", primaryjoin="User.id == ActivityLog.user_id", foreign_keys="ActivityLog.user_id")
    comments = db.relationship("Comment", back_populates="user", lazy="selectin", foreign_keys="Comment.user_id")
    entity_events = db.relationship("EntityEvent", back_populates="user", lazy="selectin", primaryjoin="User.id == EntityEvent.user_id", foreign_keys="EntityEvent.user_id")
    jobs = db.relationship("Job", back_populates="user", lazy="selectin", foreign_keys="Job.created_by")
    branches_created = db.relationship("Branch", back_populates="created_by_user", lazy="selectin", foreign_keys="Branch.created_by")

    def __repr__(self):
        return f"<User(id={self.id!r}, email={self.email!r})>"


class Session(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "sessions"
    __table_args__ = (
        Index("idx_sessions_user_active", "user_id", "expires_at", postgresql_where=text("revoked_at IS NULL")),
        Index("idx_sessions_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    jti = db.Column(db.Text, nullable=True)
    refresh_jti = db.Column(db.Text, unique=True, nullable=False)
    user_agent = db.Column(db.Text)
    ip_address = db.Column(db.Text)
    revoked_at = db.Column(db.DateTime(timezone=True))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)

    user = db.relationship("User", back_populates="sessions", primaryjoin="Session.user_id == User.id", foreign_keys="Session.user_id")

    def __repr__(self):
        return f"<Session(id={self.id!r}, user_id={self.user_id!r})>"


class AuthCode(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = 'auth_codes'
    __table_args__ = (
        Index("idx_auth_codes_code", "code", postgresql_where=text("consumed_at IS NULL")),
        Index("idx_auth_codes_user_id", "user_id"),
        Index("idx_auth_codes_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    code = db.Column(db.Text, unique=True, nullable=False)
    user_id = db.Column(PG_UUID(as_uuid=False), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    consumed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    redirect_uri = db.Column(db.Text, nullable=True)

    user = db.relationship("User", back_populates="auth_codes", primaryjoin="AuthCode.user_id == User.id", foreign_keys="AuthCode.user_id")

    def __repr__(self):
        return f"<AuthCode(id={self.id!r}, user_id={self.user_id!r})>"


class Workspace(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "workspaces"
    __table_args__ = (
        CheckConstraint("deployment_mode IN ('local', 'cloud')", name="ck_workspace_deployment_mode"),
        Index("idx_workspaces_owner_id", "owner_id"),
        Index("idx_workspaces_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    owner_id = db.Column(FK, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    owner = db.relationship("User", back_populates="workspaces", lazy="selectin", foreign_keys="Workspace.owner_id")
    name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    icon = Column(Text, nullable=True)
    color = Column(Text, nullable=True)
    settings = db.Column(db.JSON, default=dict, server_default=text("'{}'::jsonb"))
    deployment_mode = db.Column(db.Text, default="local", server_default=text("'local'"))
    sync_enabled = db.Column(db.Boolean, default=False, server_default=text("false"))
    cloud_workspace_id = db.Column(PG_UUID(as_uuid=False))

    members = db.relationship("WorkspaceMember", back_populates="workspace", lazy="selectin")
    entities = db.relationship("Entity", back_populates="workspace", lazy="selectin")
    entity_types = db.relationship("EntityType", back_populates="workspace", lazy="selectin")
    tags = db.relationship("Tag", back_populates="workspace", lazy="selectin")
    properties = db.relationship("EntityProperty", back_populates="workspace", lazy="selectin")
    files = db.relationship("File", back_populates="workspace", lazy="selectin")
    activity_logs = db.relationship("ActivityLog", back_populates="workspace", lazy="selectin")
    jobs = db.relationship("Job", back_populates="workspace", lazy="selectin")
    notifications = db.relationship("Notification", back_populates="workspace", lazy="selectin")
    search_documents = db.relationship("SearchDocument", back_populates="workspace", lazy="selectin")
    embeddings = db.relationship("Embedding", back_populates="workspace", lazy="selectin")
    sync_operations = db.relationship("SyncOperation", back_populates="workspace", lazy="selectin")
    graph_materializations = db.relationship("GraphMaterialization", back_populates="workspace", lazy="selectin")
    branches = db.relationship("Branch", back_populates="workspace", lazy="selectin")
    relations = db.relationship("Relation", back_populates="workspace", lazy="selectin")
    entity_events = db.relationship("EntityEvent", back_populates="workspace", lazy="selectin")

    def __repr__(self):
        return f"<Workspace(id={self.id!r}, name={self.name!r})>"


class WorkspaceMember(UUIDPrimaryKeyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "workspace_members"
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'editor', 'viewer')", name="ck_workspace_member_role"),
        Index("idx_workspace_members_workspace", "workspace_id"),
        Index("idx_workspace_members_user_id", "user_id"),
        Index("uq_workspace_members_active", "workspace_id", "user_id", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_workspace_members_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    role = db.Column(db.Text, nullable=False)
    email = Column(Text, nullable=False, default="")
    display_name = Column(Text, nullable=False, default="")
    avatar_url = Column(Text, nullable=True)
    joined_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, onupdate=_UTCNOW, server_default=text("now()"))

    workspace = db.relationship("Workspace", back_populates="members", lazy="selectin")
    user = db.relationship("User", back_populates="workspace_memberships", lazy="selectin", foreign_keys="WorkspaceMember.user_id")

    def __repr__(self):
        return f"<WorkspaceMember(workspace_id={self.workspace_id!r}, user_id={self.user_id!r}, role={self.role!r})>"


class EntityType(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_types"
    __table_args__ = (
        Index("idx_entity_types_workspace", "workspace_id"),
        Index("uq_entity_types_workspace_name", "workspace_id", "name", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_types_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    slug = db.Column(db.Text, nullable=False, default="")
    icon = db.Column(db.Text)
    description = db.Column(db.Text)
    color = db.Column(db.Text)
    config = db.Column(db.JSON, default=dict, server_default=text("'{}'"))

    workspace = db.relationship("Workspace", back_populates="entity_types", lazy="selectin")
    entities = db.relationship("Entity", back_populates="entity_type", lazy="selectin")

    def __repr__(self):
        return f"<EntityType(id={self.id!r}, name={self.name!r})>"


class Entity(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entities"
    __table_args__ = (
        Index("idx_entities_workspace_active", "workspace_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entities_type", "entity_type_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entities_archived", "archived_at", postgresql_where=text("archived_at IS NOT NULL AND is_deleted = FALSE")),
        Index("idx_entities_parent", "parent_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entities_created_by", "created_by"),
        Index("idx_entities_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_type_id = db.Column(FK, db.ForeignKey("entity_types.id", ondelete="RESTRICT"), nullable=False)
    name = db.Column(db.Text)
    icon = db.Column(db.Text)
    color = Column(Text, nullable=True)
    cover_image = db.Column(db.Text)
    parent_id = Column(PG_UUID, ForeignKey("entities.id", ondelete="SET NULL"), nullable=True, index=True)
    sort_order = Column(Integer, default=0, server_default=text("0"))
    summary = Column(Text, nullable=True)
    is_favorite = Column(Boolean, default=False, server_default=text("false"))
    is_archived = db.Column(db.Boolean, nullable=False, default=False, server_default=text("false"))
    archived_at = db.Column(db.DateTime(timezone=True))
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    version = db.Column(db.Integer, nullable=False, default=1, server_default=text("1"))
    block_count = Column(Integer, default=0, server_default=text("0"))

    workspace = db.relationship("Workspace", back_populates="entities", lazy="selectin")
    entity_type = db.relationship("EntityType", back_populates="entities", lazy="selectin")
    properties = db.relationship("EntityPropertyValue", back_populates="entity", lazy="selectin")
    blocks = db.relationship("Block", back_populates="entity", lazy="selectin", order_by="Block.position")
    relations_from = db.relationship("Relation", foreign_keys="Relation.source_id", back_populates="source_entity", lazy="selectin")
    relations_to = db.relationship("Relation", foreign_keys="Relation.target_id", back_populates="target_entity", lazy="selectin")
    tags = db.relationship("EntityTag", back_populates="entity", lazy="selectin")
    files = db.relationship("EntityFile", back_populates="entity", lazy="selectin")
    versions = db.relationship("EntityVersion", back_populates="entity", lazy="selectin")
    comments = db.relationship("Comment", back_populates="entity", lazy="selectin")
    events = db.relationship("EntityEvent", back_populates="entity", lazy="selectin")
    search_document = db.relationship("SearchDocument", back_populates="entity", uselist=False, lazy="selectin", primaryjoin="and_(Entity.id == SearchDocument.entity_id, SearchDocument.is_deleted == False)")
    embeddings = db.relationship("Embedding", back_populates="entity", lazy="selectin")

    def __repr__(self):
        return f"<Entity(id={self.id!r}, name={self.name!r})>"


class Branch(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "branches"
    __table_args__ = (
        Index("idx_branches_workspace", "workspace_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_branches_default", "workspace_id", "is_default", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_branches_parent_branch_id", "parent_branch_id"),
        Index("idx_branches_created_by", "created_by"),
        Index("idx_branches_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    parent_branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="SET NULL"))
    name = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    is_default = db.Column(db.Boolean, default=False, server_default=text("false"))
    is_locked = Column(Boolean, default=False, server_default=text("false"))
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    version = db.Column(db.Integer, nullable=False, default=1, server_default=text("1"))

    workspace = db.relationship("Workspace", back_populates="branches", lazy="selectin")
    created_by_user = db.relationship("User", back_populates="branches_created", lazy="selectin", foreign_keys="Branch.created_by")

    def __repr__(self):
        return f"<Branch(id={self.id!r}, name={self.name!r})>"


class Snapshot(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "snapshots"
    __table_args__ = (
        Index("idx_snapshots_branch_id", "branch_id"),
        Index("idx_snapshots_created_by", "created_by"),
        Index("idx_snapshots_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text)
    description = db.Column(db.Text)
    snapshot_metadata = db.Column("metadata", db.JSON, default=dict, server_default=text("'{}'"))
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))

    def __repr__(self):
        return f"<Snapshot(id={self.id!r}, branch_id={self.branch_id!r})>"


class Changeset(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "changesets"
    __table_args__ = (
        Index("idx_changesets_branch", "branch_id"),
        Index("idx_changesets_created_by", "created_by"),
        Index("idx_changesets_snapshot_id", "snapshot_id"),
        Index("idx_changesets_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    snapshot_id = db.Column(FK, db.ForeignKey("snapshots.id", ondelete="SET NULL"))
    message = db.Column(db.Text)
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))

    def __repr__(self):
        return f"<Changeset(id={self.id!r}, branch_id={self.branch_id!r})>"


class EntityVersion(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_versions"
    __table_args__ = (
        Index("idx_entity_versions_entity", "entity_id"),
        Index("idx_entity_versions_branch_id", "branch_id"),
        Index("idx_entity_versions_changeset", "changeset_id"),
        Index("idx_entity_versions_snapshot_id", "snapshot_id"),
        Index("idx_entity_versions_created_by", "created_by"),
        Index("idx_entity_versions_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="RESTRICT"), nullable=False)
    branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="SET NULL"))
    changeset_id = db.Column(FK, db.ForeignKey("changesets.id", ondelete="SET NULL"))
    snapshot_id = db.Column(FK, db.ForeignKey("snapshots.id", ondelete="SET NULL"))
    version = Column(Integer, nullable=True)
    message = Column(Text, nullable=True)
    snapshot = db.Column(db.JSON, nullable=False)
    content_hash = db.Column(db.Text, nullable=False)
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))

    entity = db.relationship("Entity", back_populates="versions", lazy="selectin")

    @validates("snapshot")
    def validate_snapshot_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("snapshot must be a dict")
        return value

    def __repr__(self):
        return f"<EntityVersion(id={self.id!r}, entity_id={self.entity_id!r})>"


class BlockVersion(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "block_versions"
    __table_args__ = (
        Index("idx_block_versions_block_id", "block_id"),
        Index("idx_block_versions_changeset_id", "changeset_id"),
        Index("idx_block_versions_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    block_id = db.Column(FK, db.ForeignKey("blocks.id", ondelete="RESTRICT"), nullable=False)
    changeset_id = db.Column(FK, db.ForeignKey("changesets.id", ondelete="SET NULL"))
    snapshot = db.Column(db.JSON, nullable=False)
    content_hash = db.Column(db.Text, nullable=False)

    block = db.relationship("Block", back_populates="versions", lazy="selectin")

    @validates("snapshot")
    def validate_snapshot_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("snapshot must be a dict")
        return value

    def __repr__(self):
        return f"<BlockVersion(id={self.id!r}, block_id={self.block_id!r})>"


class EntityBranchHead(UUIDPrimaryKeyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_branch_heads"
    __table_args__ = (
        UniqueConstraint("branch_id", "entity_id", name="uq_entity_branch_heads"),
        Index("idx_entity_branch_heads_branch", "branch_id"),
        Index("idx_entity_branch_heads_entity", "entity_id"),
        Index("idx_entity_branch_heads_current_version", "current_version_id"),
        Index("idx_entity_branch_heads_base_version", "base_version_id"),
        Index("idx_entity_branch_heads_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    current_version_id = db.Column(FK, db.ForeignKey("entity_versions.id", ondelete="SET NULL"))
    base_version_id = db.Column(FK, db.ForeignKey("entity_versions.id", ondelete="SET NULL"))

    def __repr__(self):
        return f"<EntityBranchHead(branch_id={self.branch_id!r}, entity_id={self.entity_id!r})>"


class BranchMerge(UUIDPrimaryKeyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "branch_merges"
    __table_args__ = (
        CheckConstraint("source_branch_id != target_branch_id", name="no_self_merge"),
        CheckConstraint("status IN ('pending', 'in_progress', 'completed', 'failed')", name="ck_branch_merge_status"),
        Index("idx_branch_merges_source_branch_id", "source_branch_id"),
        Index("idx_branch_merges_target_branch_id", "target_branch_id"),
        Index("idx_branch_merges_created_by", "created_by"),
        Index("idx_branch_merges_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    source_branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    target_branch_id = db.Column(FK, db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    merged_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=text("now()"))
    status = db.Column(db.Text, nullable=False, default="completed", server_default=text("'completed'"))
    merge_metadata = db.Column("metadata", db.JSON, default=dict, server_default=text("'{}'"))

    def __repr__(self):
        return f"<BranchMerge(id={self.id!r}, status={self.status!r})>"


class MergeConflict(UUIDPrimaryKeyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "merge_conflicts"
    __table_args__ = (
        Index("idx_merge_conflicts_merge_id", "merge_id"),
        Index("idx_merge_conflicts_entity_id", "entity_id"),
        Index("idx_merge_conflicts_resolved_by", "resolved_by"),
        Index("idx_merge_conflicts_workspace_id", "workspace_id"),
        Index("idx_merge_conflicts_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    merge_id = db.Column(FK, db.ForeignKey("branch_merges.id", ondelete="CASCADE"), nullable=False)
    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    conflict_type = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON, nullable=False)
    resolved = db.Column(db.Boolean, default=False, server_default=text("false"))
    resolved_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    resolution = db.Column(db.Text)
    resolved_at = db.Column(db.DateTime(timezone=True))

    entity = db.relationship("Entity", lazy="selectin")

    @validates("details")
    def validate_details_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("details must be a dict")
        return value

    def __repr__(self):
        return f"<MergeConflict(id={self.id!r}, entity_id={self.entity_id!r}, resolved={self.resolved!r})>"


class EntityEvent(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_events"
    __table_args__ = (
        Index("idx_entity_events_workspace_entity", "workspace_id", "entity_id"),
        Index("idx_entity_events_workspace_type", "workspace_id", "event_type"),
        Index("idx_entity_events_workspace_created", "workspace_id", "created_at"),
        Index("idx_entity_events_user_id", "user_id"),
        Index("idx_entity_events_changeset_id", "changeset_id"),
        Index("idx_entity_events_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="RESTRICT"), nullable=False)
    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    changeset_id = db.Column(FK, db.ForeignKey("changesets.id", ondelete="SET NULL"))
    event_type = db.Column(db.Text, nullable=False)
    payload = db.Column(db.JSON, nullable=False)

    workspace = db.relationship("Workspace", back_populates="entity_events", lazy="selectin")
    entity = db.relationship("Entity", back_populates="events", lazy="selectin")
    user = db.relationship("User", back_populates="entity_events", lazy="selectin", primaryjoin="EntityEvent.user_id == User.id", foreign_keys="EntityEvent.user_id")

    @validates("payload")
    def validate_payload_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("payload must be a dict")
        return value

    def __repr__(self):
        return f"<EntityEvent(id={self.id!r}, event_type={self.event_type!r})>"


class Block(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "blocks"
    __table_args__ = (
        Index("uq_blocks_entity_position", "entity_id", "position", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_blocks_entity_active", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_blocks_entity_branch_active", "entity_id", "branch_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_blocks_parent_block_id", "parent_block_id"),
        Index("idx_blocks_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    parent_block_id = db.Column(FK, db.ForeignKey("blocks.id", ondelete="CASCADE"))
    type = db.Column(db.Text, nullable=False)
    position = db.Column(db.Numeric(20, 10), nullable=False)
    content = db.Column(db.JSON, nullable=False, default=dict, server_default=text("'{}'"))
    properties = Column(JSON, default=dict, server_default=text("'{}'::jsonb"))
    # NOTE: The seed UUID 00000000-0000-0000-0000-000000000003 is a well-known default "main" branch.
    # It must exist in the database before blocks referencing it are inserted.
    branch_id = db.Column(PG_UUID(as_uuid=False), db.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, default="00000000-0000-0000-0000-000000000003", server_default=text("'00000000-0000-0000-0000-000000000003'"))
    content_hash = db.Column(db.Text, nullable=False, default="", server_default=text("''"))
    indent = db.Column(db.Integer, nullable=False, default=0, server_default=text("0"))
    version = db.Column(db.Integer, nullable=False, default=1)

    entity = db.relationship("Entity", back_populates="blocks", lazy="selectin")
    parent_block = db.relationship("Block", remote_side="Block.id", back_populates="child_blocks", lazy="selectin")
    child_blocks = db.relationship("Block", back_populates="parent_block", lazy="selectin")
    versions = db.relationship("BlockVersion", back_populates="block", lazy="selectin")
    comments = db.relationship("Comment", back_populates="block", lazy="selectin")

    @validates("content")
    def validate_content_json(self, key, value):
        if value is not None and not isinstance(value, dict):
            raise ValueError("content must be a dict")
        return value

    def __repr__(self):
        return f"<Block(id={self.id!r}, type={self.type!r}, entity_id={self.entity_id!r})>"


class EntityProperty(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_properties"
    __table_args__ = (
        CheckConstraint("type IN ('text','number','date','select','multi_select','checkbox','url','email','phone','rich_text','boolean','entity_ref')", name="ck_property_type"),
        Index("idx_properties_workspace", "workspace_id"),
        Index("idx_entity_properties_entity_type_id", "entity_type_id"),
        Index("uq_properties_workspace_name_type", "workspace_id", "name", "type", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_properties_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_type_id = db.Column(FK, db.ForeignKey("entity_types.id", ondelete="RESTRICT"))
    name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    required = db.Column(db.Boolean, default=False, server_default=db.text("false"))
    options = db.Column(db.JSON, default=dict, server_default=text("'{}'"))
    config = db.Column(db.JSON, default=dict, server_default=text("'{}'"))
    default_value = Column(JSON, nullable=True)

    workspace = db.relationship("Workspace", back_populates="properties", lazy="selectin")
    entity_property_values = db.relationship("EntityPropertyValue", back_populates="property", lazy="selectin")

    def __repr__(self):
        return f"<EntityProperty(id={self.id!r}, name={self.name!r}, type={self.type!r})>"


class EntityPropertyValue(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_property_values"
    __table_args__ = (
        Index("idx_entity_property_values_entity", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_property_values_property_id", "property_id"),
        Index("uq_entity_property_values_active", "entity_id", "property_id", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_property_values_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    property_id = db.Column(FK, db.ForeignKey("entity_properties.id", ondelete="CASCADE"), nullable=False)
    value = db.Column(db.JSON, nullable=False)

    entity = db.relationship("Entity", back_populates="properties", lazy="selectin")
    property = db.relationship("EntityProperty", back_populates="entity_property_values", lazy="selectin")

    @validates("value")
    def validate_value_json(self, key, value):
        if value is not None and not isinstance(value, (dict, list, str, int, float, bool)):
            raise ValueError("value must be a JSON-serializable type")
        return value

    def __repr__(self):
        return f"<EntityPropertyValue(entity_id={self.entity_id!r}, property_id={self.property_id!r})>"


class Relation(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "relations"
    __table_args__ = (
        CheckConstraint("source_id != target_id", name="no_self_relation"),
        CheckConstraint("generated_by IN ('manual', 'ai')", name="ck_relation_generated_by"),
        Index("idx_relations_workspace", "workspace_id"),
        Index("idx_relations_created_by", "created_by"),
        Index("uq_relations_active", "workspace_id", "source_id", "target_id", "type", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_relations_source_active", "source_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_relations_target_active", "target_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_relations_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    source_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    type = db.Column(db.Text, nullable=False)
    label = Column(Text, nullable=True)
    properties = db.Column(db.JSON, default=dict, server_default=text("'{}'"))
    generated_by = db.Column(db.Text, nullable=False, default='manual', server_default=text("'manual'"))
    verified = db.Column(db.Boolean, nullable=False, default=True, server_default=text("true"))
    confidence = db.Column(db.Float, nullable=True)
    ai_model = db.Column(db.Text, nullable=True)
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))

    workspace = db.relationship("Workspace", back_populates="relations", lazy="selectin")
    source_entity = db.relationship("Entity", foreign_keys=[source_id], back_populates="relations_from", lazy="selectin")
    target_entity = db.relationship("Entity", foreign_keys=[target_id], back_populates="relations_to", lazy="selectin")

    @validates("properties")
    def validate_properties_json(self, key, value):
        if value is not None and not isinstance(value, dict):
            raise ValueError("properties must be a dict")
        return value

    def __repr__(self):
        return f"<Relation(id={self.id!r}, type={self.type!r})>"


class Tag(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "tags"
    __table_args__ = (
        Index("idx_tags_workspace", "workspace_id", postgresql_where=text("is_deleted = FALSE")),
        Index("uq_tags_workspace_name", "workspace_id", "name", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_tags_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.Text, nullable=False)
    color = db.Column(db.Text)
    entity_count = Column(Integer, default=0, server_default=text("0"))

    workspace = db.relationship("Workspace", back_populates="tags", lazy="selectin")
    entity_tags = db.relationship("EntityTag", back_populates="tag", lazy="selectin")

    def __repr__(self):
        return f"<Tag(id={self.id!r}, name={self.name!r})>"


class EntityTag(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_tags"
    __table_args__ = (
        Index("idx_entity_tags_entity", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("uq_entity_tags_active", "entity_id", "tag_id", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_tags_tag", "tag_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_tags_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    tag_id = db.Column(FK, db.ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)

    entity = db.relationship("Entity", back_populates="tags", lazy="selectin")
    tag = db.relationship("Tag", back_populates="entity_tags", lazy="selectin")

    def __repr__(self):
        return f"<EntityTag(entity_id={self.entity_id!r}, tag_id={self.tag_id!r})>"


class File(UUIDPrimaryKeyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "file_records"
    __table_args__ = (
        CheckConstraint("object_lock_mode IS NULL OR object_lock_mode IN ('GOVERNANCE', 'COMPLIANCE')", name="ck_file_object_lock_mode"),
        Index("idx_files_workspace", "workspace_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_files_state", "state", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_files_pending", "state", "uploaded_at", postgresql_where=text("state = 'PENDING' AND is_deleted = FALSE")),
        Index("uq_files_hash_active", "workspace_id", "content_hash", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_file_records_uploaded_by", "uploaded_by"),
        Index("idx_files_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    file_name = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.Text)
    file_size = db.Column(db.BigInteger, nullable=False, default=0, server_default=text("0"))
    content_hash = db.Column(db.Text, nullable=False, default="")
    state = db.Column(db.Text, nullable=False, default="READY", server_default=text("'READY'"))
    storage_provider = db.Column(db.Text, default="aws_s3", server_default=text("'aws_s3'"))
    object_key = db.Column(db.Text, nullable=False)
    object_lock_mode = db.Column(db.Text)
    object_lock_retain_until = db.Column(db.DateTime(timezone=True))
    legal_hold_status = db.Column(db.Boolean, default=False)
    uploaded_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    uploaded_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=text("now()"))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, onupdate=_UTCNOW, server_default=text("now()"))
    has_extracted_text = Column(Boolean, default=False, server_default=text("false"))
    has_metadata = Column(Boolean, default=False, server_default=text("false"))
    extracted_text = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    storage_class = db.Column(db.Text, default="STANDARD", server_default=text("'STANDARD'"))

    workspace = db.relationship("Workspace", back_populates="files", lazy="selectin")
    entity_files = db.relationship("EntityFile", back_populates="file", lazy="selectin")
    variants = db.relationship("FileVariant", back_populates="file", lazy="selectin")

    def __repr__(self):
        return f"<File(id={self.id!r}, file_name={self.file_name!r})>"


class EntityFile(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "entity_files"
    __table_args__ = (
        Index("idx_entity_files_entity", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_files_file", "file_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_files_block_id", "block_id"),
        Index("uq_entity_files_active", "entity_id", "file_id", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_entity_files_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    file_id = db.Column(FK, db.ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(FK, db.ForeignKey("blocks.id", ondelete="SET NULL"))

    entity = db.relationship("Entity", back_populates="files", lazy="selectin")
    file = db.relationship("File", back_populates="entity_files", lazy="selectin")

    def __repr__(self):
        return f"<EntityFile(entity_id={self.entity_id!r}, file_id={self.file_id!r})>"


class FileVariant(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "file_variants"
    __table_args__ = (
        Index("uq_file_variants_active", "file_id", "variant_type", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_file_variants_file", "file_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_file_variants_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    file_id = db.Column(FK, db.ForeignKey("file_records.id", ondelete="CASCADE"), nullable=False)
    variant_type = db.Column(db.Text, nullable=False)
    object_key = db.Column(db.Text, nullable=False)
    mime_type = db.Column(db.Text, nullable=False)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    file_size = db.Column(db.BigInteger)
    algorithm = db.Column(db.Text)
    algorithm_version = db.Column(db.Text)
    quality = db.Column(db.Integer)

    file = db.relationship("File", back_populates="variants", lazy="selectin")

    def __repr__(self):
        return f"<FileVariant(id={self.id!r}, variant_type={self.variant_type!r})>"


class Invite(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "invites"
    __table_args__ = (
        CheckConstraint("role IN ('owner', 'admin', 'editor', 'viewer')", name="ck_invite_role"),
        CheckConstraint("status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')", name="ck_invite_status"),
        Index("uq_invites_workspace_email_pending", "workspace_id", "email", unique=True, postgresql_where=text("status = 'pending' AND is_deleted = FALSE")),
        Index("idx_invites_token", "token", postgresql_where=text("status = 'pending'")),
        Index("idx_invites_workspace", "workspace_id"),
        Index("idx_invites_invited_by", "invited_by"),
        Index("idx_invites_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    email = db.Column(db.Text, nullable=False)
    role = db.Column(db.Text, nullable=False)
    invited_by = db.Column(FK, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    token = db.Column(db.Text, unique=True, nullable=False)
    status = db.Column(db.Text, nullable=False, default="pending", server_default=text("'pending'"))
    message = db.Column(db.Text)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    accepted_at = db.Column(db.DateTime(timezone=True))
    accepted_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))

    def __repr__(self):
        return f"<Invite(id={self.id!r}, email={self.email!r}, role={self.role!r})>"


class Comment(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "comments"
    __table_args__ = (
        Index("idx_comments_workspace_entity", "workspace_id", "entity_id"),
        Index("idx_comments_entity", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_comments_block", "block_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_comments_parent", "parent_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_comments_user_id", "user_id"),
        Index("idx_comments_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"))
    block_id = db.Column(FK, db.ForeignKey("blocks.id", ondelete="CASCADE"))
    parent_id = db.Column(FK, db.ForeignKey("comments.id", ondelete="CASCADE"))
    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    display_name = Column(Text, nullable=False, default="")
    avatar_url = Column(Text, nullable=True)
    content = db.Column(db.Text, nullable=False)
    resolved = Column(Boolean, default=False, server_default=text("false"))

    entity = db.relationship("Entity", back_populates="comments", lazy="selectin")
    block = db.relationship("Block", back_populates="comments", lazy="selectin")
    user = db.relationship("User", back_populates="comments", lazy="selectin", foreign_keys="Comment.user_id")

    def __repr__(self):
        return f"<Comment(id={self.id!r}, user_id={self.user_id!r})>"


class CommentReaction(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "comment_reactions"
    __table_args__ = (
        Index("idx_comment_reactions_comment", "comment_id"),
        Index("uq_comment_reactions_user", "comment_id", "user_id", "reaction", unique=True, postgresql_where=text("is_deleted = FALSE")),
    )

    comment_id = db.Column(FK, db.ForeignKey("comments.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    reaction = db.Column(db.Text, nullable=False)

    def __repr__(self):
        return f"<CommentReaction(comment_id={self.comment_id!r}, user_id={self.user_id!r}, reaction={self.reaction!r})>"


class Notification(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint("type IN ('mention','comment','update','entity_update','invite','relation_created','backup_complete','sync_conflict','system','share','version_created','export_complete','import_complete','governance_report_ready','system_alert')", name="ck_notification_type"),
        Index("idx_notifications_workspace", "workspace_id"),
        Index("idx_notifications_user_unread", "user_id", postgresql_where=text("is_read = FALSE AND is_deleted = FALSE")),
        Index("idx_notifications_entity", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_notifications_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"))
    type = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text, nullable=False)
    body = db.Column(db.Text)
    data = Column(JSON, nullable=True, default=None)
    is_read = db.Column(db.Boolean, default=False, server_default=text("false"))

    user = db.relationship("User", back_populates="notifications", lazy="selectin", foreign_keys="Notification.user_id")
    workspace = db.relationship("Workspace", back_populates="notifications", lazy="selectin")

    def __repr__(self):
        return f"<Notification(id={self.id!r}, type={self.type!r}, title={self.title!r})>"


class Embedding(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "embeddings"
    __table_args__ = (
        Index("idx_embeddings_workspace_entity", "workspace_id", "entity_id"),
        Index("idx_embeddings_entity", "entity_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_embeddings_workspace", "workspace_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_embeddings_block_id", "block_id"),
        Index("idx_embeddings_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"))
    block_id = db.Column(FK, db.ForeignKey("blocks.id", ondelete="SET NULL"))
    model = db.Column(db.Text, nullable=False)
    embedding = db.Column(Vector(1024))
    content_hash = db.Column(db.Text, nullable=False)

    workspace = db.relationship("Workspace", back_populates="embeddings", lazy="selectin")
    entity = db.relationship("Entity", back_populates="embeddings", lazy="selectin")

    def __repr__(self):
        return f"<Embedding(id={self.id!r}, model={self.model!r})>"


class SearchDocument(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "search_documents"
    __table_args__ = (
        Index("uq_search_documents_workspace_entity", "workspace_id", "entity_id", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_search_documents_workspace", "workspace_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_search_documents_block_id", "block_id"),
        Index("idx_search_documents_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    block_id = db.Column(FK, db.ForeignKey("blocks.id", ondelete="CASCADE"))
    title = db.Column(db.Text)
    content = db.Column(db.Text)
    content_hash = db.Column(db.Text, nullable=False, default="", server_default=text("''"))
    search_vector = db.Column(TSVectorType())

    workspace = db.relationship("Workspace", back_populates="search_documents", lazy="selectin")
    entity = db.relationship("Entity", back_populates="search_document", uselist=False, lazy="selectin")
    block = db.relationship("Block", lazy="selectin")

    def __repr__(self):
        return f"<SearchDocument(id={self.id!r}, title={self.title!r})>"


class SyncOperation(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "sync_operations"
    __table_args__ = (
        Index("idx_sync_operations_workspace_status", "workspace_id", "synced", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_sync_operations_deleted_by", "deleted_by"),
        Index("idx_sync_operations_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    operation_type = db.Column(db.Text, nullable=False)
    entity_type = db.Column(db.Text)
    entity_id = db.Column(PG_UUID(as_uuid=False), nullable=True)
    payload = db.Column(db.JSON, nullable=False)
    device_id = db.Column(db.Text)
    client_clock = db.Column(db.BigInteger)
    synced = Column(Boolean, default=False, server_default=text("false"))
    retry_count = db.Column(db.Integer, nullable=False, default=0)
    error_message = db.Column(db.Text, nullable=True)
    synced_at = db.Column(db.DateTime(timezone=True))

    workspace = db.relationship("Workspace", back_populates="sync_operations", lazy="selectin")

    @validates("payload")
    def validate_payload_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("payload must be a dict")
        return value

    def __repr__(self):
        return f"<SyncOperation(id={self.id!r}, operation_type={self.operation_type!r})>"


class Job(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "jobs"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'dead_letter')", name="ck_job_status"),
        CheckConstraint("priority IN ('critical', 'high', 'medium', 'low')", name="ck_job_priority"),
        Index("idx_jobs_status_type", "status", "type", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_jobs_status_created", "status", "created_at"),
        Index("idx_jobs_workspace", "workspace_id"),
        Index("idx_jobs_created_by", "created_by"),
        Index("uq_jobs_idempotency_key", "idempotency_key", unique=True, postgresql_where=text("idempotency_key IS NOT NULL")),
        Index("idx_jobs_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"))
    type = db.Column(db.Text, nullable=False)
    status = db.Column(db.Text, nullable=False, default="pending")
    progress = Column(Integer, default=0, server_default=text("0"))
    message = Column(Text, nullable=True)
    priority = db.Column(db.Text, nullable=False, default="medium")
    payload = db.Column(db.JSON, nullable=False)
    result = db.Column(db.JSON)
    error = Column(JSON, nullable=True, default=None)
    idempotency_key = db.Column(db.Text)
    retry_count = db.Column(db.Integer, nullable=False, default=0)
    max_retries = db.Column(db.Integer, nullable=False, default=3)
    timeout_seconds = db.Column(db.Integer)
    created_by = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    started_at = db.Column(db.DateTime(timezone=True))
    completed_at = db.Column(db.DateTime(timezone=True))
    schedule_at = db.Column(db.DateTime(timezone=True))

    workspace = db.relationship("Workspace", back_populates="jobs", lazy="selectin")
    user = db.relationship("User", back_populates="jobs", lazy="selectin", foreign_keys="Job.created_by")

    @validates("payload")
    def validate_payload_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("payload must be a dict")
        return value

    @validates("result")
    def validate_result_json(self, key, value):
        if value is not None and not isinstance(value, dict):
            raise ValueError("result must be a dict or None")
        return value

    def __repr__(self):
        return f"<Job(id={self.id!r}, type={self.type!r}, status={self.status!r})>"


class ActivityLog(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "activity_entries"
    __table_args__ = (
        Index("idx_activity_log_workspace", "workspace_id", text("created_at DESC")),
        Index("idx_activity_log_created_brin", text("created_at"), postgresql_using="brin", postgresql_with={"pages_per_range": 32}),
        Index("idx_activity_entries_entity_id", "entity_id"),
        Index("idx_activity_entries_user_id", "user_id"),
        Index("idx_activity_entries_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    entity_id = db.Column(FK, db.ForeignKey("entities.id", ondelete="RESTRICT"))
    user_id = db.Column(FK, db.ForeignKey("users.id", ondelete="SET NULL"))
    display_name = Column(Text, nullable=True)
    action = db.Column(db.Text, nullable=False)
    resource_type = Column(Text, nullable=True)
    resource_id = Column(Text, nullable=True)
    details = db.Column(db.JSON, default=dict, server_default=text("'{}'"))

    workspace = db.relationship("Workspace", back_populates="activity_logs", lazy="selectin")
    entity = db.relationship("Entity", lazy="selectin")
    user = db.relationship("User", back_populates="activity_logs", lazy="selectin", primaryjoin="ActivityLog.user_id == User.id", foreign_keys="ActivityLog.user_id")

    @validates("details")
    def validate_details_json(self, key, value):
        if value is not None and not isinstance(value, dict):
            raise ValueError("details must be a dict")
        return value

    def __repr__(self):
        return f"<ActivityLog(id={self.id!r}, action={self.action!r})>"


class GovernanceReport(UUIDPrimaryKeyMixin, CreatedOnlyMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "governance_reports"
    __table_args__ = (
        CheckConstraint("type IN ('access_audit','change_log','storage_summary','activity_summary','compliance','health_check')", name="ck_governance_report_type"),
        CheckConstraint("status IN ('pending','running','completed','failed')", name="ck_governance_report_status"),
        Index("idx_governance_reports_workspace_id", "workspace_id"),
        Index("idx_governance_reports_created_by", "created_by"),
        Index("idx_governance_reports_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = Column(PG_UUID, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    type = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    status = Column(Text, nullable=False, default="pending", server_default=text("'pending'"))
    data = Column(JSON, nullable=True, default=None)
    params = Column(JSON, nullable=True, default=None)
    created_by = Column(PG_UUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


class GraphMaterialization(UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    __tablename__ = "graph_materializations"
    __table_args__ = (
        Index("idx_graph_materializations_workspace_id", "workspace_id"),
        Index("idx_graph_materializations_deleted_at", "deleted_at", postgresql_where=text("is_deleted = TRUE")),
    )

    workspace_id = db.Column(FK, db.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    graph_snapshot = db.Column(db.JSON, nullable=False)
    generated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=_UTCNOW, server_default=text("now()"))
    version_hash = db.Column(db.Text)

    workspace = db.relationship("Workspace", back_populates="graph_materializations", lazy="selectin")

    @validates("graph_snapshot")
    def validate_graph_snapshot_json(self, key, value):
        if not isinstance(value, dict):
            raise ValueError("graph_snapshot must be a dict")
        return value

    def __repr__(self):
        return f"<GraphMaterialization(id={self.id!r}, workspace_id={self.workspace_id!r})>"
